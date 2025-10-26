/**
 * Node Expander:
 * - Fetches markdown from Supabase Storage
 * - Uses Gemini to extract sections + keywords
 * - Runs Bright Data agent for deeper research
 * - Stores expansion results in Supabase
 */

import { supabase } from "../database/supabaseClient.js";
import { analyzeNodeWithGemini } from "./gemini_analysis.js";
import { runWorkflow } from "./bright_data_agent.js";

/**
 * Expand a node by analyzing its markdown and doing deeper searches
 * @param {string} nodeId - Supabase node UUID
 * @returns {object} expansionResults
 */
export async function expandNode(nodeId) {
  console.log(`\n🔍 Expanding node ${nodeId}...`);

  // 1️⃣ Fetch node metadata from Supabase
  const { data: node, error: nodeError } = await supabase
    .from("nodes")
    .select("id, md_file_path, summary, tree_id")
    .eq("id", nodeId)
    .single();

  if (nodeError || !node) throw new Error(`Node not found: ${nodeError?.message}`);

  // 2️⃣ Fetch markdown file from Supabase Storage
  console.log("📥 Fetching markdown content from Supabase...");
  const { data: file, error: fileError } = await supabase.storage
    .from("markdown") // adjust to your bucket name
    .download(node.md_file_path);

  if (fileError) throw new Error(`Failed to fetch markdown: ${fileError.message}`);

  const markdownText = await file.text();

  // 3️⃣ Analyze content with Gemini
  console.log("🧠 Analyzing markdown with Gemini...");
  const analysis = await analyzeNodeWithGemini(markdownText);

  // analysis should look like:
  // {
  //   sections: [
  //     { title: "Introduction", text: "...", keywords: ["transformer", "attention"] },
  //     ...
  //   ],
  //   keywords: ["transformer", "attention", "self-attention", "seq2seq"],
  //   analyzedAt: new Date().toISOString()
  // }

  // 4️⃣ Combine top keywords into a Bright Data search query
  const combinedQuery = analysis.keywords.slice(0, 8).join(" ");
  console.log(`🔎 Running Bright Data search for: "${combinedQuery}"`);

  const researchResults = await runWorkflow(combinedQuery, {
    maxResults: 5,
    outputFile: `expanded_${nodeId}.json`,
  });

  // 5️⃣ Store expanded info in Supabase
  console.log("💾 Saving expansion results to Supabase...");
  const { error: updateError } = await supabase
    .from("nodes")
    .update({
      results_json: {
        ...node.results_json,
        expansion: {
          analysis,
          researchResults,
        },
      },
      updated_at: new Date(),
    })
    .eq("id", nodeId);

  if (updateError) throw new Error(`Failed to update node: ${updateError.message}`);

  console.log(`✅ Node ${nodeId} expanded successfully.`);
  return { analysis, researchResults };
}
