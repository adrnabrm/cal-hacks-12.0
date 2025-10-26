/**
 * Node Section Expander:
 * Expands a *specific* section of a node's markdown (e.g., "Method").
 * - Fetches markdown from Supabase
 * - Extracts requested section
 * - Uses Gemini to find key research terms
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
 * Expand a specific section of a markdown file using Gemini + Bright Data
 * @param {string} nodeId - Supabase node UUID
 * @param {string} sectionName - e.g. "Background", "Methods", "Results"
 */
export async function expandNodeSection(nodeId, sectionName) {
  console.log(`\n🧩 Expanding section "${sectionName}" for node ${nodeId}...`);

  // 1️⃣ Fetch node info
  const { data: node, error: nodeError } = await supabase
    .from("nodes")
    .select("id, md_file_path, tree_id, results_json")
    .eq("id", nodeId)
    .single();

  if (nodeError || !node)
    throw new Error(`Node not found: ${nodeError?.message}`);

  // 2️⃣ Fetch markdown from Supabase Storage
  console.log("📥 Fetching markdown file...");
  const { data: file, error: fileError } = await supabase.storage
    .from("markdowns") // ✅ make sure this matches your bucket name
    .download(node.md_file_path);

  if (fileError) throw new Error(`Failed to fetch markdown: ${fileError.message}`);
  const markdownText = await file.text();

  // 3️⃣ Extract the selected section
  console.log(`🔎 Extracting "${sectionName}" section from markdown...`);
    const extractPrompt = `
    You are given the markdown text of a research paper.
    Find the section that most closely corresponds to "${sectionName}".
    This may include titles like "${sectionName}", "${sectionName.slice(0, -1)}",
    "${sectionName}ology", "Approach", or any synonymous heading.
    Extract that section's full text (including subsections) until the next top-level heading.
    If multiple matches exist, choose the most relevant one.
    Return only the raw text of that section (no commentary).

    Markdown:
    ${markdownText}
    `;

  const extractResponse = await gemini.invoke([
    { role: "user", content: extractPrompt },
  ]);
  const sectionText = extractResponse.content?.trim();

  if (!sectionText || sectionText.length < 200)
    throw new Error(`Could not find enough content for section "${sectionName}".`);

  // 4️⃣ Ask Gemini for keywords from this section
  console.log("🧠 Generating keywords from section text...");
  const keywordPrompt = `
You are an academic research assistant helping a user find related papers for one section of a scientific article.

Your task:
1. Read the section text below carefully.
2. Identify 5–10 *specific technical concepts, algorithms, methods, or scientific topics* that would help find related academic papers.
3. Avoid generic terms like "paper", "section", "study", "method", "introduction", or "abstract".
4. Return a valid JSON array (no commentary), for example:
["transformer architecture", "self-attention mechanism", "deep neural networks", "sequence modeling"]

Section text:
${sectionText}

Return only the JSON array:
  `;

  const keywordRes = await gemini.invoke([
    { role: "user", content: keywordPrompt },
  ]);

  // 5️⃣ Parse keywords safely
  let keywords = [];
  try {
    const match = keywordRes.content.match(/\[.*\]/s);
    if (match) {
      keywords = JSON.parse(match[0]);
    } else {
      throw new Error("No JSON array found");
    }
  } catch {
    console.warn("⚠️ Could not parse Gemini keyword output. Using fallback split.");
    console.log("🔍 Gemini raw output:", keywordRes.content);
    keywords = keywordRes.content
      .split(/[,;\n]/)
      .map(k => k.trim().replace(/^[\-\*\d\.]+/, ""))
      .filter(k => k.length > 2 && !/abstract|section|paper|methods?/i.test(k));
  }

  if (!keywords.length) throw new Error("No keywords extracted.");

  console.log(`✨ Extracted keywords: ${keywords.join(", ")}`);

  // 6️⃣ Combine keywords into Bright Data query
  const query = `${sectionName} ${keywords.slice(0, 6).join(" ")}`;
  console.log(`🌐 Running Bright Data search for: "${query}"`);

  const researchResults = await runWorkflow(query, {
    maxResults: 5,
    outputFile: `expand_${nodeId}_${sectionName}.json`,
  });

  // 7️⃣ Save results back to Supabase
  console.log("💾 Saving section expansion results...");
  const updatedResultsJson = {
    ...(node.results_json || {}),
    section_expansions: {
      ...(node.results_json?.section_expansions || {}),
      [sectionName.toLowerCase()]: {
        keywords,
        researchResults,
        expandedAt: new Date().toISOString(),
      },
    },
  };

  const { error: updateError } = await supabase
    .from("nodes")
    .update({
      results_json: updatedResultsJson,
      updated_at: new Date(),
    })
    .eq("id", nodeId);

  if (updateError)
    throw new Error(`Failed to save section expansion: ${updateError.message}`);

  console.log(`✅ Section "${sectionName}" expanded successfully.`);
  return { sectionName, keywords, researchResults };
}
