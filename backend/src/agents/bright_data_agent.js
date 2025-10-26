/**
 * Modified Workflow: MCP-Powered Research Agent with JSON Storage + Chroma Cloud
 * Updated to match current Supabase schema.
 */

import 'dotenv/config';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { MultiServerMCPClient } from '@langchain/mcp-adapters';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { CloudClient } from 'chromadb';
import { GoogleGeminiEmbeddingFunction } from "@chroma-core/google-gemini";
import { insertNode, updateNode } from '../database/nodes.js';
import { uploadMarkdown } from '../services/markdownUploader.js';

// Configuration constants
const CONFIG = {
  apiKey: process.env.BRIGHTDATA_API_KEY,
  googleKey: process.env.GOOGLE_API_KEY,
  googleModel: process.env.GOOGLE_MODEL || 'gemini-2.5-flash',
  chromaTenant: process.env.CHROMA_TENANT,
  chromaDatabase: process.env.CHROMA_DATABASE || 'default_database',
  chromaApiKey: process.env.CHROMA_API_KEY,
  chromaCollection: process.env.CHROMA_COLLECTION || 'research_documents',
};

// Content processing constants
const CONTENT_LIMITS = {
  MAX_RESULTS: 50,            // Default maximum URLs to analyze
  MAX_DOMAINS_PER_SOURCE: 5,  // Maximum pages per domain for diversity
  CHUNK_SIZE: 1000,           // Characters per chunk for embedding
  CHUNK_OVERLAP: 200,         // Overlap between chunks
  CHROMA_BATCH_SIZE: 100,     // Maximum chunks per Chroma batch (Google API limit)
  SCRAPE_PREVIEW: 4000        // Characters passed to LLM for summary
};

// Trusted domains
const TRUSTED_DOMAINS = [
  'ieee.org', 'acm.org', 'springer.com', 'arxiv.org', 'nature.com',
  'science.org', 'sciencedirect.com', 'wiley.com', 'tandfonline.com',
  'sagepub.com', 'mdpi.com', 'frontiersin.org', 'plos.org', 'oup.com',
  'cambridge.org', 'researchgate.net', 'semanticscholar.org',
  'scholar.google.com', 'pubmed.ncbi.nlm.nih.gov', 'ncbi.nlm.nih.gov',
  'biorxiv.org', 'medrxiv.org', 'ssrn.com', '.edu', 'mit.edu',
  'stanford.edu', 'berkeley.edu', 'harvard.edu', 'oxford.ac.uk',
  'cambridge.ac.uk', 'nist.gov', 'nasa.gov', 'cern.ch', 'nih.gov', 'nsf.gov'
];

/** Initialize Chroma Cloud client and collection */
async function initializeChroma() {
  console.log('Initializing Chroma Cloud connection...');
  const chromaClient = new CloudClient({
    tenant: CONFIG.chromaTenant,
    database: CONFIG.chromaDatabase,
    apiKey: CONFIG.chromaApiKey
  });

  const embedder = new GoogleGeminiEmbeddingFunction({ apiKey: CONFIG.googleKey });

  let collection;
  try {
    collection = await chromaClient.getOrCreateCollection({
      name: CONFIG.chromaCollection,
      embeddingFunction: embedder,
      metadata: { description: "Research documents from web scraping" }
    });
    console.log(`✓ Connected to Chroma Cloud`);
  } catch (error) {
    console.error(`Failed to connect to Chroma: ${error.message}`);
    throw error;
  }

  return { chromaClient, collection };
}

/** Split text into chunks for embedding */
function chunkText(text, chunkSize = CONTENT_LIMITS.CHUNK_SIZE, overlap = CONTENT_LIMITS.CHUNK_OVERLAP) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start = end - overlap;
    if (start + overlap >= text.length) break;
  }
  return chunks;
}

/** Add document to Chroma */
async function addToChroma(collection, sourceData, markdownContent, query) {
  try {
    console.log('  - Chunking and embedding document...');
    const chunks = chunkText(markdownContent);
    console.log(`    Created ${chunks.length} chunks`);

    const batchSize = CONTENT_LIMITS.CHROMA_BATCH_SIZE;
    let totalAdded = 0;
    const numBatches = Math.ceil(chunks.length / batchSize);
    const allIds = [];

    for (let batchIndex = 0; batchIndex < numBatches; batchIndex++) {
      const batchStart = batchIndex * batchSize;
      const batchEnd = Math.min(batchStart + batchSize, chunks.length);
      const batchChunks = chunks.slice(batchStart, batchEnd);

      const ids = batchChunks.map((_, idx) => `${sourceData.id}_chunk_${batchStart + idx}`);
      allIds.push(...ids);

      const metadatas = batchChunks.map((_, idx) => ({
        source_id: sourceData.id,
        url: sourceData.url,
        domain: sourceData.domain,
        title: sourceData.title,
        query,
        chunk_index: batchStart + idx,
        total_chunks: chunks.length,
        scraped_at: sourceData.scrapedAt,
        summary: sourceData.summary?.substring(0, 500) || ''
      }));

      await collection.add({ ids, documents: batchChunks, metadatas });
      totalAdded += batchChunks.length;

      if (batchIndex < numBatches - 1) await new Promise(r => setTimeout(r, 300));
    }

    console.log(`  ✓ Added ${totalAdded} chunks to Chroma`);
    return { chunks: totalAdded, batches: numBatches, ids: allIds };
  } catch (error) {
    console.error(`  ⚠️ Chroma indexing failed: ${error.message}`);
    return { chunks: 0, ids: [], error: error.message };
  }
}

function sanitizeFilename(text, maxLength = 100) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, maxLength);
}

function isTrustedDomain(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return TRUSTED_DOMAINS.some(domain =>
      domain.startsWith('.')
        ? hostname.endsWith(domain)
        : hostname === domain || hostname.endsWith('.' + domain)
    );
  } catch {
    return false;
  }
}

/** Generate summary using Gemini */
async function generateSummary(llm, content, sourceTitle, query) {
  try {
    const response = await llm.invoke([
      {
        role: 'system',
        content:
          'You are a research assistant specializing in educational summaries. Focus on explaining the core concepts and significance clearly.'
      },
      {
        role: 'user',
        content: `Research Query: ${query}\n\nSource: ${sourceTitle}\n\n${content}\n\nCreate a concise, educational summary.`
      }
    ]);
    return response.content;
  } catch (error) {
    console.error(`Summary generation failed: ${error.message}`);
    return 'Summary generation failed';
  }
}

/** Main research workflow */
async function runWorkflow(query, options = {}) {
  const { maxResults = CONTENT_LIMITS.MAX_RESULTS, outputFile = 'research_results.json' } = options;

  console.log(`\n${'='.repeat(60)}\nRESEARCH AGENT - Starting Workflow\n${'='.repeat(60)}`);
  console.log(`Research Topic: "${query}"\n`);

  let chromaClient;
  let collection;
  try {
    const chroma = await initializeChroma();
    chromaClient = chroma.chromaClient;
    collection = chroma.collection;
  } catch (error) {
    console.warn('⚠️ Chroma initialization failed, continuing without vector indexing.');
  }

  console.log('Step 1: Initializing MCP Client...');
  const client = new MultiServerMCPClient({
    bright_data: { url: `https://mcp.brightdata.com/sse?token=${CONFIG.apiKey}&pro=1`, transport: 'sse' }
  });

  console.log('Step 2: Loading Bright Data Tools...');
  const tools = await client.getTools();
  const searchTool = tools.find(t => t.name === 'search_engine');
  const scrapeTool = tools.find(t => t.name === 'scrape_as_markdown');
  if (!searchTool || !scrapeTool) throw new Error('Required tools not found');

  console.log('Step 3: Initializing Gemini LLM...');
  const llm = new ChatGoogleGenerativeAI({
    apiKey: CONFIG.googleKey,
    model: CONFIG.googleModel,
    temperature: 0.3
  });

  console.log('Step 4: Searching the web...');
  const searchResult = await searchTool.invoke({ query: `${query} research paper`, engine: 'google' });
  const searchData = typeof searchResult === 'string' ? JSON.parse(searchResult) : searchResult;
  const urls = (searchData.organic || [])
    .filter(r => r.link && isTrustedDomain(r.link))
    .slice(0, maxResults)
    .map(r => ({
      url: r.link,
      title: r.title || 'Untitled',
      snippet: r.description || '',
      domain: new URL(r.link).hostname.replace('www.', '')
    }));

  const researchResults = { query, timestamp: new Date().toISOString(), totalSources: urls.length, sources: [] };

  for (let i = 0; i < urls.length; i++) {
    const urlData = urls[i];
    console.log(`\n[${i + 1}/${urls.length}] Processing: ${urlData.domain}`);

    try {
      console.log('  - Scraping content...');
      const content = await scrapeTool.invoke({ url: urlData.url });
      const contentText = typeof content === 'string' ? content : JSON.stringify(content);
      if (!contentText || contentText.length < 200) continue;

      console.log('  - Generating summary...');
      const summary = await generateSummary(
        llm,
        contentText.substring(0, CONTENT_LIMITS.SCRAPE_PREVIEW),
        urlData.title,
        query
      );

      // Insert into Supabase
      const treeId = process.env.TEST_TREE_ID || '00000000-0000-0000-0000-000000000001';
      const nodePayload = {
        tree_id: treeId,
        results_json: {
          url: urlData.url,
          domain: urlData.domain,
          title: urlData.title,
          snippet: urlData.snippet,
          summary,
          scraped_at: new Date().toISOString()
        },
        status: 'success'
      };

      const node = await insertNode(treeId, nodePayload);
      console.log(`  ✓ Node inserted: ${node.id}`);

      // Upload markdown
      const mdPath = await uploadMarkdown(node.id, contentText);
      await updateNode(node.id, { md_file_path: mdPath });

      // Add to Chroma
      if (collection) {
        const chromaResult = await addToChroma(
          collection,
          { ...urlData, id: node.id, summary },
          contentText,
          query
        );
        if (chromaResult.chunks > 0) {
          await updateNode(node.id, {
            embedding_id: chromaResult.ids, // text[] in schema
            vectorized: true
          });
        }
      }

      researchResults.sources.push({
        id: node.id,
        url: urlData.url,
        summary,
        status: 'success'
      });
    } catch (error) {
      console.error(`  ✗ Failed: ${error.message}`);
      researchResults.sources.push({
        id: `${sanitizeFilename(query)}_${i + 1}`,
        url: urlData.url,
        status: 'failed',
        error: error.message
      });
    }
  }

  await fs.writeFile(outputFile, JSON.stringify(researchResults, null, 2));
  console.log(`\n✓ Results saved to ${outputFile}`);
  console.log('='.repeat(60));
  return researchResults;
}

/** CLI Runner */
async function main() {
  try {
    const args = process.argv.slice(2);
    const query = args.join(' ') || 'latest AI developments 2025';
    const results = await runWorkflow(query);
    console.log(`\nProcessed ${results.totalSources} sources.`);
  } catch (err) {
    console.error(`\n❌ Error: ${err.message}`);
    process.exit(1);
  }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) main();

export { runWorkflow };

