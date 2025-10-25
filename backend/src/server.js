// src/server.js
import express from "express";
import { runWorkflow } from "./main_workflow.js";
import { db } from "./firebase.js";

const app = express();
const port = process.env.PORT || 8000;

app.get("/agent", async (req, res) => {
  try {
    const q = String(req.query.q || "latest AI developments 2025");
    const data = await runWorkflow(q, { maxResults: 1});
    const ref = await db.collection("research_runs").add({
      query: data.query,
      result: String(data.result).slice(0, 1_000_000),
      toolUsage: data.toolUsage,
      executionTime: data.executionTime,
      sourcesAnalyzed: data.sourcesAnalyzed,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.json({ ok: true, id: ref.id, ...data });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get("/", (_req, res) => res.send("Backend running. Try /agent?q=..."));
app.listen(port, () => console.log(`listening on :${port}`));
