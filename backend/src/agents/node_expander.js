/**
 * Node Section Expander:
 * Expands a *specific* section of a node's markdown (e.g., "Method").
 * - Fetches markdown from Supabase
 * - Extracts requested section
 * - Uses Gemini to find key terms
 * - Runs Bright Data searches based on those keywords
 * - Stores results back into Supabase
 */

import { supabase } from "../database/supabaseClient.js";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { runWorkflow } from "./bright_data_agent.js";

// Gemini setup
const gemini = new ChatGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY,
  model: "gemini-2.5-flash",
});

/**
 * Extract a section of markdown and expand it with Gemini + Bright Data
 * @param {string} nodeId - Supabase node UUID
 * @param {string} sectionName - e.g. "Background", "Methods", "Results"
 */
export async function expandNodeSection(nodeId, sectionName) {
  console.log(`\n🧩 Expanding section "${sectionName}" for node ${nodeId}...`);

  // 1️⃣ Fetch node info
  const { data: node, error: nodeError } = await supabase
    .from("nodes")
    .select("id, md_file_path, tree_id")
    .eq("id", nodeId)
    .single();

  if (nodeError || !node) throw new Error(`Node not found: ${nodeError?.message}`);

  // 2️⃣ Fetch markdown from Supabase Storage
  console.log("📥 Fetching markdown file...");
  const { data: file, error: fileError } = await supabase.storage
    .from("markdown") // Adjust to your bucket name
    .download(node.md_file_path);

  if (fileError) throw new Error(`Failed to fetch markdown: ${fileError.message}`);
  const markdownText = await file.text();

  // 3️⃣ Extract the selected section
  console.log(`🔎 Extracting "${sectionName}" section from markdown...`);
  const extractPrompt = `
  The following text is a research paper in Markdown format.
  Extract only the section titled "${sectionName}" (including any subsections).
  Return *only* the text of that section — no extra commentary.
  
  Markdown:
  ${markdownText}
  `;
  const extractResponse = await gemini.invoke([{ role: "user", content: extractPrompt }]);
  const sectionText = extractResponse.content?.trim();

  if (!sectionText || sectionText.length < 200)
    throw new Error(`Could not find enough content for section "${sectionName}".`);

  // 4️⃣ Ask Gemini for keywords from this section
  console.log("🧠 Generating keywords from section text...");
  const keywordPrompt = `
  Analyze the following section of a research paper and extract 5–10 high-impact keywords or concepts.
  Return them as a JSON array, e.g. ["transformer model", "attention mechanism", "NLP"].

  Section Text:
  ${sectionText}
  `;
  const keywordRes = await gemini.invoke([{ role: "user", content: keywordPrompt }]);
  let keywords = [];

  try {
    keywords = JSON.parse(keywordRes.content.match(/\[.*\]/s)?.[0] || "[]");
  } catch {
    console.warn("⚠️ Could not parse Gemini keyword output. Using fallback split.");
    keywords = keywordRes.content.split(",").map(k => k.trim());
  }

  if (!keywords.length) throw new Error("No keywords extracted.");

  console.log(`✨ Extracted keywords: ${keywords.join(", ")}`);

  // 5️⃣ Combine keywords into a Bright Data query
  const query = `${sectionName} ${keywords.slice(0, 6).join(" ")}`;
  console.log(`🌐 Running Bright Data search for: "${query}"`);

  const researchResults = await runWorkflow(query, {
    maxResults: 5,
    outputFile: `expand_${nodeId}_${sectionName}.json`,
  });

  // 6️⃣ Save results back to Supabase
  console.log("💾 Saving section expansion results...");
  const { error: updateError } = await supabase
    .from("nodes")
    .update({
      results_json: {
        section_expansions: {
          ...(node.results_json?.section_expansions || {}),
          [sectionName.toLowerCase()]: {
            keywords,
            researchResults,
            expandedAt: new Date().toISOString(),
          },
        },
      },
      updated_at: new Date(),
    })
    .eq("id", nodeId);

  if (updateError) throw new Error(`Failed to save section expansion: ${updateError.message}`);

  console.log(`✅ Section "${sectionName}" expanded successfully.`);
  return { sectionName, keywords, researchResults };
}
