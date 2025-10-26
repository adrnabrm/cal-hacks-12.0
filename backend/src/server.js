// src/server.js
import express from "express";
import dotenv from "dotenv";
import { runWorkflow } from "./agents/bright_data_agent.js";
import { supabase } from "./database/supabaseClient.js";
import { requireAuth } from "../middleware/auth.js";

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

// 🧭 Root route
app.get("/", (_req, res) => res.send("Backend running. Try /agent?q=... or POST /api/trees"));

app.listen(port, () => console.log(`✅ Backend listening on :${port}`));
