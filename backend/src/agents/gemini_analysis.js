import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

const gemini = new ChatGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY,
  model: "gemini-2.5-flash",
});

/**
 * Analyzes markdown into sections + keywords
 */
export async function analyzeNodeWithGemini(markdown) {
  const prompt = `
  Analyze the following markdown and:
  1. Break it into logical sections (with titles and short summaries)
  2. Extract key concepts or keywords from each section
  3. Return a concise JSON in the form:
  {
    "sections": [{ "title": "...", "summary": "...", "keywords": ["..."] }],
    "keywords": ["..."],
    "analyzedAt": "<ISO timestamp>"
  }

  Markdown:
  ${markdown}
  `;

  const res = await gemini.invoke([{ role: "user", content: prompt }]);
  const text = res.content || "{}";

  try {
    return JSON.parse(text);
  } catch {
    console.warn("⚠️ Gemini response was not pure JSON, falling back to safe parse");
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : { sections: [], keywords: [] };
  }
}
