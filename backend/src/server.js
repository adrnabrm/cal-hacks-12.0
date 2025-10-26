// src/server.js
import express from "express";
import dotenv from "dotenv";
import { runWorkflow } from "./agents/bright_data_agent.js";
import { supabase } from "./database/supabaseClient.js";
import { requireAuth } from "../middleware/auth.js";
import { CloudClient } from "chromadb";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

try {
  dotenv.config();

  const app = express();
  const port = process.env.PORT || 8000;

  app.use(express.json());

  // 🧠 Public route — test Bright Data agent manually
  app.get("/agent", async (req, res) => {
    try {
      const q = req.query.q || "latest AI developments 2025";
      const data = await runWorkflow(q, { maxResults: 20 });
      res.json({ ok: true, ...data });
    } catch (e) {
      console.error("Agent error:", e);
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // ✅ Protected route — Create a new tree for the logged-in user
  app.post("/api/trees", requireAuth, async (req, res) => {
    const { prompt } = req.body;
    const user = req.user;

    try {
      // 1️⃣ Create a new tree record for this user
      const { data: tree, error: treeError } = await supabase
        .from("trees")
        .insert({
          user_id: user.id,
          title: prompt,
          created_at: new Date(),
        })
        .select()
        .single();

      if (treeError) throw treeError;

      // 2️⃣ Run Bright Data + Gemini pipeline to create nodes (future step)
      // const nodes = await runWorkflow(prompt, { maxResults: 10 });
      // await supabase.from("nodes").insert(
      //   nodes.map(n => ({
      //     tree_id: tree.id,
      //     title: n.title,
      //     summary: n.summary,
      //     md_path: n.md_path,
      //     created_at: new Date(),
      //   }))
      // );

      res.json({ ok: true, treeId: tree.id });
    } catch (e) {
      console.error("Create tree error:", e);
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // RAG Endpoint - query Chroma + gen AI response
  app.post("/api/rag", async (req, res) => {
    try {
      const { query } = req.body;
      if (!query || query.trim().length === 0) {
        return res.status(400).json({ ok: false, error: "Missing 'query field" });
      }

      console.log(`Received query: "${query}"`);

      // Chroma Cloud client - automatically uses env variables
      const chromaClient = new CloudClient({
        tenant: process.env.CHROMA_TENANT,
        database: process.env.CHROMA_DATABASE,
        apiKey: process.env.CHROMA_API_KEY,
      });

      const collection = await chromaClient.getCollection({
        name: process.env.CHROMA_COLLECTION,
      });

      const embedder = new GoogleGenerativeAIEmbeddings({
        apiKey: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY,
        model: "text-embedding-004",
      });      

      // Returns an array of vectors; use [0] for single query
      const queryEmbedding = await embedder.embedQuery(query);


      const results = await collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: 5, // number of chunks to retrieve
      });

      const topChunks = results.documents[0];
      const contexts = topChunks
        .map((chunk, i) => `Context ${i + 1}:\n${chunk}`)
        .join("\n\n");

      const llm = new ChatGoogleGenerativeAI({
        apiKey: process.env.GOOGLE_API_KEY,
        model: process.env.GOOGLE_MODEL || "gemini-2.5-flash",
        temperature: 0.2,
      });
      
      const response = await llm.invoke([
        {
          role: "system",
          content:
            "You are a research assistant. Use the provided context to answer accurately and cite your sources when possible.",
        },
        {
          role: "user",
          content: `Answer the question based on the following context:\n\n${contexts}\n\nQuestion: ${query}`,
        },
      ]);

      const answer = response.content || "No response generated.";

      res.json({
        ok: true,
        answer,
        retrieved: results.ids[0],
        metadata: results.metadatas[0],
      });
    } catch (error) {
      console.error("RAG error:", error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // 🧭 Root route
  app.get("/", (_req, res) => res.send("Backend running. Try /agent?q=... or POST /api/trees"));

  app.listen(port, () => console.log(`✅ Backend listening on :${port}`));
} catch (error) {
  console.error("❌ Fatal error during startup:", error);
  process.exit(1);
}