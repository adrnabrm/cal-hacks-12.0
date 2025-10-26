// src/server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
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

  // 🧩 Enable CORS for local dev
  app.use(
    cors({
      origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
      credentials: true,
    })
  );
  app.use(express.json());

  // 🧠 Public route — manual Bright Data test
  app.get("/agent", async (req, res) => {
    try {
      const q = req.query.q || "latest AI developments 2025";
      const data = await runWorkflow(q, { maxResults: 30 });
      res.json({ ok: true, ...data });
    } catch (e) {
      console.error("Agent error:", e);
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // 🌳 Create a new research tree
  app.post("/api/trees", requireAuth, async (req, res) => {
    const { prompt } = req.body;
    const user = req.user;

    try {
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

      res.json({ ok: true, treeId: tree.id });
    } catch (e) {
      console.error("Create tree error:", e);
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // 🧩 GET /api/trees/:id — fetch a tree with its nodes
  app.get("/api/trees/:id", requireAuth, async (req, res) => {
    try {
      const treeId = req.params.id;
      const user = req.user;

      // Verify ownership
      const { data: tree, error: treeError } = await supabase
        .from("trees")
        .select("*")
        .eq("id", treeId)
        .eq("user_id", user.id)
        .single();
      if (treeError) throw treeError;

      // Fetch nodes for this tree
      const { data: nodes, error: nodeError } = await supabase
        .from("nodes")
        .select("*")
        .eq("tree_id", treeId);
      if (nodeError) throw nodeError;

      res.json({ ok: true, tree, nodes });
    } catch (e) {
      console.error("Fetch tree error:", e);
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // 🌱 POST /api/trees/:id/seed — run Bright Data + insert root/children
  app.post("/api/trees/:id/seed", requireAuth, async (req, res) => {
    const treeId = req.params.id;
    const { prompt } = req.body;
    const user = req.user;

    try {
      // 1️⃣ Verify tree ownership
      const { data: tree, error: treeError } = await supabase
        .from("trees")
        .select("*")
        .eq("id", treeId)
        .eq("user_id", user.id)
        .single();
      if (treeError) throw treeError;

      // 2️⃣ Run Bright Data workflow
      const workflowResult = await runWorkflow(prompt, { maxResults: 10 });
      const sources = workflowResult?.sources || [];

      // 3️⃣ Insert root node
      const { data: rootNode, error: rootErr } = await supabase
        .from("nodes")
        .insert({
          tree_id: treeId,
          results_json: {
            title: prompt,
            summary: `Seed prompt: ${prompt}`,
            status: "seed",
          },
          section: "root",
          created_at: new Date(),
        })
        .select()
        .single();
      if (rootErr) throw rootErr;

      // 4️⃣ Insert children (each source becomes a node)
      const childrenToInsert = sources.map((s) => ({
        tree_id: treeId,
        parent_node_id: rootNode.id,
        results_json: {
          title: s.title || s.domain || "Untitled",
          domain: s.domain || null,
          url: s.url || null,
          snippet: s.snippet || null,
          summary: s.summary || "",
          status: s.status || "success",
        },
        md_file_path: s.md_path || null,
        embedding_id: s.embedding_id ? [s.embedding_id] : null,
        vectorized: s.vectorized ?? true,
        section: "overview",
        created_at: new Date(),
      }));

      if (childrenToInsert.length > 0) {
        const { error: insertErr } = await supabase
          .from("nodes")
          .insert(childrenToInsert);
        if (insertErr) throw insertErr;
      }

      // 5️⃣ Return root + children to frontend
      res.json({
        ok: true,
        treeRoot: {
          ...rootNode,
          children: childrenToInsert,
        },
      });
    } catch (e) {
      console.error("Seed tree error:", e);
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // 🌿 POST /api/nodes/:nodeId/expand — expand node by section
  app.post("/api/nodes/:nodeId/expand", requireAuth, async (req, res) => {
    const nodeId = req.params.nodeId;
    const { section } = req.body;

    try {
      // 1️⃣ Fetch parent node
      const { data: parentNode, error: parentErr } = await supabase
        .from("nodes")
        .select("*")
        .eq("id", nodeId)
        .single();
      if (parentErr) throw parentErr;

      // 2️⃣ Run Bright Data again for expansion
      const expandPrompt = `${parentNode.results_json?.title || "Paper"} — expand section: ${section}`;
      const workflowResult = await runWorkflow(expandPrompt, { maxResults: 6 });
      const sources = workflowResult?.sources || [];

      // 3️⃣ Insert children
      const children = sources.map((s) => ({
        tree_id: parentNode.tree_id,
        parent_node_id: nodeId,
        results_json: {
          title: s.title || s.domain || "Untitled",
          domain: s.domain || null,
          url: s.url || null,
          snippet: s.snippet || null,
          summary: s.summary || "",
          status: s.status || "success",
        },
        md_file_path: s.md_path || null,
        embedding_id: s.embedding_id ? [s.embedding_id] : null,
        vectorized: s.vectorized ?? true,
        section,
        created_at: new Date(),
      }));

      if (children.length > 0) {
        const { error: insertErr } = await supabase
          .from("nodes")
          .insert(children);
        if (insertErr) throw insertErr;
      }

      res.json({ ok: true, children });
    } catch (e) {
      console.error("Expand node error:", e);
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // 💬 RAG endpoint — query Chroma Cloud for contextual answers
  app.post("/api/rag", async (req, res) => {
    try {
      const { query } = req.body;
      if (!query || query.trim().length === 0)
        return res.status(400).json({ ok: false, error: "Missing 'query' field" });

      console.log(`Received query: "${query}"`);

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

      const queryEmbedding = await embedder.embedQuery(query);
      const results = await collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: 5,
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
  app.get("/", (_req, res) =>
    res.send("Backend running. Try /agent?q=... or POST /api/trees")
  );

  app.listen(port, () => console.log(`✅ Backend listening on :${port}`));
} catch (error) {
  console.error("❌ Fatal error during startup:", error);
  process.exit(1);
}
