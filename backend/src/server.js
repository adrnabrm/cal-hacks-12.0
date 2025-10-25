// src/server.js
import express from "express";
import { runWorkflow } from "./main_workflow.js";

const app = express();
const port = process.env.PORT || 8000;

app.get("/agent", async (req, res) => {
  try {
      const q = req.query.q || "latest AI developments 2025";
      const data = await runWorkflow(q, { maxResults: 20 });
      res.json({ ok: true, ...data });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
})

app.get("/", (_req, res) => res.send("Backend running. Try /agent?q=..."));
app.listen(port, () => console.log(`listening on :${port}`));
