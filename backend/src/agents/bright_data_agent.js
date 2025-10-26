/**
 * Modified Workflow: MCP-Powered Research Agent with JSON Storage + Chroma Cloud
 * Searches web, extracts content, stores summaries in JSON format, saves markdown to files,
 * and indexes content in Chroma Cloud for vector search
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
  chromaTenant: process.env.CHROMA_TENANT, // Chroma Cloud tenant ID
  chromaDatabase: process.env.CHROMA_DATABASE || 'default_database', // Chroma Cloud database name
  chromaApiKey: process.env.CHROMA_API_KEY, // Chroma Cloud API key
  chromaCollection: process.env.CHROMA_COLLECTION || 'research_documents',
};

// Content processing constants
const CONTENT_LIMITS = {
  SCRAPE_PREVIEW: 3000,  // Characters to include per scraped page
  MAX_RESULTS: 5,        // Default maximum URLs to analyze
  MAX_DOMAINS_PER_SOURCE: 5, // Maximum pages per domain for diversity (increased for larger requests)
  CHUNK_SIZE: 1000,      // Characters per chunk for embedding
  CHUNK_OVERLAP: 200,    // Overlap between chunks
  CHROMA_BATCH_SIZE: 100, // Maximum chunks per Chroma batch (Google API limit)
};

// Trusted academic and research domains
const TRUSTED_DOMAINS = [
  // Academic publishers
  'ieee.org',
  'acm.org',
  'springer.com',
  'arxiv.org',
  'nature.com',
  'science.org',
  'sciencedirect.com',
  'wiley.com',
  'tandfonline.com',
  'sagepub.com',
  'mdpi.com',
  'frontiersin.org',
  'plos.org',
  'oup.com',  // Oxford University Press
  'cambridge.org',
  
  // Research repositories
  'researchgate.net',
  'semanticscholar.org',
  'scholar.google.com',
  'pubmed.ncbi.nlm.nih.gov',
  'ncbi.nlm.nih.gov',
  'biorxiv.org',
  'medrxiv.org',
  'ssrn.com',
  
  // University domains (common patterns)
  '.edu',
  'mit.edu',
  'stanford.edu',
  'berkeley.edu',
  'harvard.edu',
  'oxford.ac.uk',
  'cambridge.ac.uk',
  
  // Research institutions
  'nist.gov',
  'nasa.gov',
  'cern.ch',
  'nih.gov',
  'nsf.gov',
];

/**
 * Initialize Chroma Cloud client and collection
 */
async function initializeChroma() {
  console.log('Initializing Chroma Cloud connection...');
  
  // Chroma Cloud client - automatically uses env variables
  const chromaClient = new CloudClient({
    tenant: CONFIG.chromaTenant,
    database: CONFIG.chromaDatabase,
    apiKey: CONFIG.chromaApiKey,
  });
  
  // Initialize Google embedding function
  const embedder = new GoogleGeminiEmbeddingFunction({
    apiKey: CONFIG.googleKey,
  });
  
  // Get or create collection
  let collection;
  try {
    collection = await chromaClient.getOrCreateCollection({
      name: CONFIG.chromaCollection,
      embeddingFunction: embedder,
      metadata: { description: "Research documents from web scraping" }
    });
    console.log(`✓ Connected to Chroma Cloud`);
    console.log(`  Tenant: ${CONFIG.chromaTenant}`);
    console.log(`  Database: ${CONFIG.chromaDatabase}`);
    console.log(`  Collection: ${CONFIG.chromaCollection}`);
  } catch (error) {
    console.error(`Failed to connect to Chroma: ${error.message}`);
    throw error;
  }
  
  return { chromaClient, collection };
}

/**
 * Split text into chunks for embedding
 */
function chunkText(text, chunkSize = CONTENT_LIMITS.CHUNK_SIZE, overlap = CONTENT_LIMITS.CHUNK_OVERLAP) {
  const chunks = [];
  let start = 0;
  
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start = end - overlap;
    
    // Avoid infinite loop on very small texts
    if (start + overlap >= text.length) break;
  }
  
  return chunks;
}

/**
 * Add document to Chroma collection with proper batching
 */
async function addToChroma(collection, sourceData, markdownContent, query) {
  try {
    console.log('  - Chunking and embedding document...');
    
    const chunks = chunkText(markdownContent);
    console.log(`    Created ${chunks.length} chunks`);
    
    const batchSize = CONTENT_LIMITS.CHROMA_BATCH_SIZE;
    let totalAdded = 0;
    const numBatches = Math.ceil(chunks.length / batchSize);
    
    for (let batchIndex = 0; batchIndex < numBatches; batchIndex++) {
      const batchStart = batchIndex * batchSize;
      const batchEnd = Math.min(batchStart + batchSize, chunks.length);
      const batchChunks = chunks.slice(batchStart, batchEnd);
    
      const ids = batchChunks.map((_, idx) => `${sourceData.id}_chunk_${batchStart + idx}`);
      const metadatas = batchChunks.map((_, idx) => ({
        source_id: sourceData.id,
        url: sourceData.url,
        domain: sourceData.domain,
        title: sourceData.title,
        query: query,
        chunk_index: batchStart + idx,
        total_chunks: chunks.length,
        scraped_at: sourceData.scrapedAt,
        summary: sourceData.summary?.substring(0, 500) || '',
      }));
    
      totalAdded += batchChunks.length;
      console.log(`    Batch ${batchIndex + 1}/${numBatches}: Adding chunks ${batchStart + 1}-${batchEnd}`);
    
      await collection.add({
        ids,
        documents: batchChunks,
        metadatas,
      });
    
      // Optional: small delay
      if (batchIndex < numBatches - 1) await new Promise(r => setTimeout(r, 500));
    }    
    
    console.log(`  ✓ Successfully added ${totalAdded} chunks to Chroma`);
    return { 
      chunks: totalAdded, 
      batches: numBatches,
      ids: chunks.map((_, idx) => `${sourceData.id}_chunk_${idx}`) 
    };
    
  } catch (error) {
    console.error(`  ⚠️ Chroma indexing failed: ${error.message}`);
    return { chunks: 0, error: error.message };
  }
}

/**
 * Check if a URL is from a trusted academic/research domain
 */
function isTrustedDomain(url) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    return TRUSTED_DOMAINS.some(trusted => {
      if (trusted.startsWith('.')) {
        return hostname.endsWith(trusted);
      }
      return hostname === trusted || hostname.endsWith('.' + trusted);
    });
  } catch {
    return false;
  }
}

/**
 * Sanitize text for use as filename
 */
function sanitizeFilename(text, maxLength = 100) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, maxLength);
}

function validateConfig() {
  const missing = [];
  if (!CONFIG.apiKey) missing.push('BRIGHTDATA_API_KEY');
  if (!CONFIG.googleKey) missing.push('GOOGLE_API_KEY');
  if (missing.length > 0) throw new Error(`Missing: ${missing.join(', ')}. Check your .env file.`);
}

function validateInput(query, maxResults) {
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    throw new Error('Query must be a non-empty string');
  }
  if (maxResults !== undefined && (typeof maxResults !== 'number' || maxResults <= 0 || maxResults > 50)) {
    throw new Error('maxResults must be a positive number between 1 and 50');
  }
}

/**
 * Selects diverse URLs from search results, filtering for trusted domains
 */
function selectDiverseUrls(searchData, maxResults) {
  const urls = [];
  const perDomain = {};
  let skippedCount = 0;
  
  const dynamicLimit = maxResults <= 5 ? 2 : Math.ceil(maxResults / 4);
  
  if (searchData.organic && Array.isArray(searchData.organic)) {
    for (const result of searchData.organic) {
      if (result.link) {
        try {
          const domain = new URL(result.link).hostname.replace('www.', '');

          if (!isTrustedDomain(result.link)) {
            skippedCount++;
            continue;
          }

          const currentFromDomain = perDomain[domain] || 0;
          if (urls.length < maxResults && currentFromDomain < dynamicLimit) {
            urls.push({
              url: result.link,
              title: result.title || 'Untitled',
              snippet: result.description || '',
              domain
            });
            perDomain[domain] = currentFromDomain + 1;
          }
          
          if (urls.length >= maxResults) break;
        } catch {
          // Skip invalid URLs
        }
      }
    }
  }

  return { 
    urls, 
    domainCount: Object.keys(perDomain).length,
    skippedCount,
    perDomainLimit: dynamicLimit
  };
}

/**
 * Generate summary for a single source using Gemini
 */
async function generateSummary(llm, content, sourceTitle, query) {
  try {
    const response = await llm.invoke([
      {
        role: 'system',
        content: 'You are a research assistant specializing in creating educational summaries. Your goal is to extract and explain the core concepts, ideas, and findings from content. Focus on WHAT the content teaches and WHY it matters, not on publication details or metadata. When technical terms appear, briefly explain them in simple language. Make the summary accessible to someone learning about the topic.',
      },
      {
        role: 'user',
        content: `Research Query: ${query}\n\nSource: ${sourceTitle}\n\n${content}\n\nCreate a 2-3 paragraph summary that:\n1. Explains the main concepts and key ideas presented\n2. Defines any technical terminology in simple terms\n3. Highlights why these findings or concepts are significant\n4. Focuses on the substance and insights, NOT on publication details, author names, or paper metadata\n\nSummary:`,
      },
    ]);
    return response.content;
  } catch (error) {
    console.error(`Summary generation failed: ${error.message}`);
    return 'Summary generation failed';
  }
}

/**
 * Main research workflow
 */
async function runWorkflow(query, options = {}) {
  const { maxResults = CONTENT_LIMITS.MAX_RESULTS, outputFile = 'research_results.json' } = options;

  validateInput(query, maxResults);
  validateConfig();

  console.log(`\n${'='.repeat(60)}`);
  console.log('RESEARCH AGENT - Starting Workflow');
  console.log('='.repeat(60));
  console.log(`Research Topic: "${query}"`);
  console.log(`Max sources to analyze: ${maxResults}`);
  console.log(`Output file: ${outputFile}\n`);

  // Ensure md_files directory exists
  // await fs.mkdir('./md_files', { recursive: true });
  // console.log('✓ Markdown directory created/verified: ./md_files\n');

  // Initialize Chroma
  let chromaClient, collection;
  try {
    const chroma = await initializeChroma();
    chromaClient = chroma.chromaClient;
    collection = chroma.collection;
  } catch (error) {
    console.warn('⚠️  Chroma initialization failed. Continuing without vector indexing.');
    console.warn(`   Error: ${error.message}\n`);
  }

  // Initialize MCP Client
  console.log('Step 1: Initializing MCP Client...');
  const client = new MultiServerMCPClient({
    bright_data: {
      url: `https://mcp.brightdata.com/sse?token=${CONFIG.apiKey}&pro=1`,
      transport: 'sse',
    },
  });

  // Load tools
  console.log('Step 2: Loading Bright Data Tools...');
  const allTools = await client.getTools();
  const searchTool = allTools.find(t => t.name === 'search_engine');
  const scrapeTool = allTools.find(t => t.name === 'scrape_as_markdown');

  if (!searchTool || !scrapeTool) {
    throw new Error('Required tools not found');
  }
  console.log('✓ Tools loaded: search_engine, scrape_as_markdown\n');

  // Initialize Gemini LLM
  console.log('Step 3: Initializing Gemini LLM...');
  const llm = new ChatGoogleGenerativeAI({
    apiKey: CONFIG.googleKey,
    model: CONFIG.googleModel,
    temperature: 0.3,
  });
  console.log(`✓ Using model: ${CONFIG.googleModel}\n`);

  // Search the web
  console.log('Step 4: Searching the web...');
  const searchResult = await searchTool.invoke({
    query: `${query} research paper`,
    engine: 'google'
  });
  const searchData = typeof searchResult === 'string' ? JSON.parse(searchResult) : searchResult;
  
  const selection = selectDiverseUrls(searchData, maxResults);
  const urls = selection.urls;
  
  console.log(`✓ Found ${urls.length} trusted sources from ${selection.domainCount} domains`);
  console.log(`  (Max ${selection.perDomainLimit} URLs per domain)`);
  if (selection.skippedCount > 0) {
    console.log(`  (Filtered out ${selection.skippedCount} non-academic sources)`);
  }
  console.log();

  if (urls.length === 0) {
    throw new Error('No trusted academic sources found in search results. Try broadening your search query.');
  }
  
  if (urls.length < maxResults) {
    console.log(`⚠️  Warning: Only found ${urls.length} trusted sources (requested ${maxResults})`);
    console.log(`   Continuing with available sources...\n`);
  }

  // Scrape and summarize each source
  console.log('Step 5: Scraping, summarizing, and indexing sources...');
  const researchResults = {
    query,
    timestamp: new Date().toISOString(),
    totalSources: urls.length,
    sources: [],
    chromaIndexed: 0,
  };

  for (let i = 0; i < urls.length; i++) {
    const urlData = urls[i];
    console.log(`\n[${i + 1}/${urls.length}] Processing: ${urlData.domain}`);
    
    const filename = `${sanitizeFilename(urlData.domain)}-${i + 1}.md`;
    const filepath = `./md_files/${filename}`;
    
    try {
      // Scrape content
      console.log('  - Scraping content...');
      const content = await scrapeTool.invoke({ url: urlData.url });
      const contentText = typeof content === 'string' ? content : JSON.stringify(content);
      // 🧠 Skip binary or unreadable content (PDFs, images, corrupted data)
      if (
        !contentText ||
        contentText.length < 200 ||
        /[\x00-\x08\x0E-\x1F]/.test(contentText) ||     // binary control characters
        !/[a-zA-Z]{10,}/.test(contentText.slice(0, 500)) // not enough readable text
      ) {
        console.log(`⚠️  Skipping non-text or unreadable content from ${urlData.url}`);
        researchResults.sources.push({
          id: `${sanitizeFilename(query)}_${i + 1}`,
          url: urlData.url,
          domain: urlData.domain,
          title: urlData.title,
          snippet: urlData.snippet,
          summary: null,
          markdownFile: filepath,
          error: 'Skipped non-text or binary content',
          scrapedAt: new Date().toISOString(),
          status: 'skipped'
        });
        continue; // Skip to the next URL
      }

      // Save markdown to file
      // console.log(`  - Saving markdown to ${filename}...`);
      // await fs.writeFile(filepath, contentText);
      
      // Generate summary
      console.log('  - Generating summary...');
      const summary = await generateSummary(
        llm, 
        contentText.substring(0, CONTENT_LIMITS.SCRAPE_PREVIEW),
        urlData.title,
        query
      );
      
      const sourceData = {
        id: `${sanitizeFilename(query)}_${i + 1}`,
        url: urlData.url,
        domain: urlData.domain,
        title: urlData.title,
        snippet: urlData.snippet,
        summary,
        markdownFile: filepath,
        scrapedAt: new Date().toISOString(),
        status: 'success'
      };
      
      // Add to Chroma if available
      if (collection) {
        const chromaResult = await addToChroma(collection, sourceData, contentText, query);
        sourceData.chromaChunks = chromaResult.chunks;
        sourceData.chromaBatches = chromaResult.batches;
        if (chromaResult.chunks > 0) {
          researchResults.chromaIndexed++;
        }
      }

      researchResults.sources.push(sourceData);
      console.log('  ✓ Complete');
       
      // === 🧩 SUPABASE INTEGRATION ===
      try {
        const treeId = process.env.TEST_TREE_ID || '00000000-0000-0000-0000-000000000001';

        // Create the JSON payload for insertion
        const nodePayload = {
          id: i + 1,
          url: urlData.url,
          domain: urlData.domain,
          title: urlData.title,
          snippet: urlData.snippet,
          summary,
          scrapedAt: new Date().toISOString(),
          status: 'success'
        };

        // 1️⃣ Insert into Supabase `nodes` table
        const node = await insertNode(treeId, nodePayload);
        console.log(`  ✓ Node inserted into Supabase: ${node.id}`);

        // 2️⃣ Read markdown file content
        const markdownText = await fs.readFile(filepath, 'utf-8');

        // 3️⃣ Upload markdown to Supabase Storage
        const mdPath = await uploadMarkdown(node.id, markdownText);
        console.log(`  ✓ Markdown uploaded: ${mdPath}`);

        // 4️⃣ Update node record with md_file_path
        await updateNode(node.id, { md_file_path: mdPath });
        console.log('  ✓ Supabase record updated with md_file_path');

      } catch (err) {
        console.error(`  ⚠️ Supabase upload failed: ${err.message}`);
      }
      // ================================
      
    } catch (error) {
      console.log(`  ✗ Failed: ${error.message}`);
      
      researchResults.sources.push({
        id: `${sanitizeFilename(query)}_${i + 1}`,
        url: urlData.url,
        domain: urlData.domain,
        title: urlData.title,
        snippet: urlData.snippet,
        summary: null,
        markdownFile: filepath,
        error: error.message,
        scrapedAt: new Date().toISOString(),
        status: 'failed'
      });
    }
  }

  // Save results to JSON file
  console.log(`\nStep 6: Saving results to ${outputFile}...`);
  await fs.writeFile(outputFile, JSON.stringify(researchResults, null, 2));
  console.log('✓ Results saved\n');

  // Display summary
  console.log('='.repeat(60));
  console.log('RESEARCH COMPLETE');
  console.log('='.repeat(60));
  console.log(`Query: ${query}`);
  console.log(`Total sources processed: ${researchResults.sources.length}`);
  console.log(`Successful: ${researchResults.sources.filter(s => s.status === 'success').length}`);
  console.log(`Failed: ${researchResults.sources.filter(s => s.status === 'failed').length}`);
  console.log(`\nResults stored in: ${outputFile}`);
  //console.log(`Markdown files stored in: ./md_files/`);
  console.log('='.repeat(60));

  try {
    await client.close();
  } catch {}

  return researchResults;
}

/**
 * Display research results in console
 */
function displayResults(results) {
  console.log('\n' + '='.repeat(80));
  console.log('RESEARCH RESULTS PREVIEW');
  console.log('='.repeat(80));
  
  results.sources.forEach((source, idx) => {
    if (source.status === 'success') {
      console.log(`\n[${idx + 1}] ${source.title}`);
      console.log(`Domain: ${source.domain}`);
      console.log(`URL: ${source.url}`);
      //console.log(`Markdown File: ${source.markdownFile}`);
      if (source.chromaChunks) {
        console.log(`Chroma Chunks: ${source.chromaChunks}`);
      }
      console.log(`\nSummary:`);
      console.log(source.summary);
      console.log('-'.repeat(80));
    }
  });
}

async function main() {
  try {
    const args = process.argv.slice(2);
    
    let query = 'latest AI developments 2025';
    let maxResults = CONTENT_LIMITS.MAX_RESULTS;
    let outputFile = 'research_results.json';
    
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--max' && args[i + 1]) {
        maxResults = parseInt(args[i + 1]);
        i++;
      } else if (args[i] === '--output' && args[i + 1]) {
        outputFile = args[i + 1];
        i++;
      } else if (!args[i].startsWith('--')) {
        query = args.slice(i).join(' ');
        break;
      }
    }
    
    const results = await runWorkflow(query, { maxResults, outputFile });
    displayResults(results);
    
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  main();
}

export { runWorkflow };