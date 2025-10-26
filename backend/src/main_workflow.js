/**
 * Modified Workflow: MCP-Powered Research Agent with JSON Storage
 * Searches web, extracts content, stores summaries in JSON format, and saves markdown to files
 */

import 'dotenv/config';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { MultiServerMCPClient } from '@langchain/mcp-adapters';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

// Configuration constants
const CONFIG = {
  apiKey: process.env.BRIGHTDATA_API_KEY,
  googleKey: process.env.GOOGLE_API_KEY,
  googleModel: process.env.GOOGLE_MODEL || 'gemini-2.5-flash',
};

// Content processing constants
const CONTENT_LIMITS = {
  SCRAPE_PREVIEW: 3000,  // Characters to include per scraped page
  MAX_RESULTS: 5,        // Default maximum URLs to analyze
  MAX_DOMAINS_PER_SOURCE: 5, // Maximum pages per domain for diversity (increased for larger requests)
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
 * Check if a URL is from a trusted academic/research domain
 */
function isTrustedDomain(url) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    // Check if hostname matches or ends with any trusted domain
    return TRUSTED_DOMAINS.some(trusted => {
      // For patterns like '.edu', check if domain ends with it
      if (trusted.startsWith('.')) {
        return hostname.endsWith(trusted);
      }
      // For full domains, check exact match or subdomain
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
 * Uses adaptive domain limits to reach target maxResults
 */
function selectDiverseUrls(searchData, maxResults) {
  const urls = [];
  const perDomain = {};
  let skippedCount = 0;
  
  // Calculate dynamic per-domain limit based on maxResults
  // For small requests (≤5), limit to 2 per domain for diversity
  // For larger requests, allow more per domain to reach the target
  const dynamicLimit = maxResults <= 5 ? 2 : Math.ceil(maxResults / 4);

  if (searchData.organic && Array.isArray(searchData.organic)) {
    // First pass: collect all trusted domain URLs
    for (const result of searchData.organic) {
      if (result.link) {
        try {
          const domain = new URL(result.link).hostname.replace('www.', '');

          // Filter: Only accept trusted academic/research domains
          if (!isTrustedDomain(result.link)) {
            skippedCount++;
            continue;
          }

          // Use dynamic limit per domain
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
          
          // Stop once we have enough URLs
          if (urls.length >= maxResults) {
            break;
          }
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
  await fs.mkdir('./md_files', { recursive: true });
  console.log('✓ Markdown directory created/verified: ./md_files\n');

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
  console.log('Step 5: Scraping and summarizing sources...');
  const researchResults = {
    query,
    timestamp: new Date().toISOString(),
    totalSources: urls.length,
    sources: []
  };

  for (let i = 0; i < urls.length; i++) {
    const urlData = urls[i];
    console.log(`\n[${i + 1}/${urls.length}] Processing: ${urlData.domain}`);
    
    // Generate filename for markdown
    const filename = `${sanitizeFilename(urlData.domain)}-${i + 1}.md`;
    const filepath = `./md_files/${filename}`;
    
    try {
      // Scrape content
      console.log('  - Scraping content...');
      const content = await scrapeTool.invoke({ url: urlData.url });
      const contentText = typeof content === 'string' ? content : JSON.stringify(content);
      
      // Save markdown to file
      console.log(`  - Saving markdown to ${filename}...`);
      await fs.writeFile(filepath, contentText);
      
      // Generate summary
      console.log('  - Generating summary...');
      const summary = await generateSummary(
        llm, 
        contentText.substring(0, CONTENT_LIMITS.SCRAPE_PREVIEW),
        urlData.title,
        query
      );
      
      // Store in results
      researchResults.sources.push({
        id: i + 1,
        url: urlData.url,
        domain: urlData.domain,
        title: urlData.title,
        snippet: urlData.snippet,
        summary,
        markdownFile: filepath,
        scrapedAt: new Date().toISOString(),
        status: 'success'
      });
      
      console.log('  ✓ Complete');
      
    } catch (error) {
      console.log(`  ✗ Failed: ${error.message}`);
      
      // Store failed attempt
      researchResults.sources.push({
        id: i + 1,
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
  console.log(`Markdown files stored in: ./md_files/`);
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
      console.log(`Markdown File: ${source.markdownFile}`);
      console.log(`\nSummary:`);
      console.log(source.summary);
      console.log('-'.repeat(80));
    }
  });
}

async function main() {
  try {
    const args = process.argv.slice(2);
    
    // Parse command line arguments
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