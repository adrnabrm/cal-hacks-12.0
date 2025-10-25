import express from "express";
import { runWorkflow } from "./main_workflow.js";

const app = express()
const port = process.env.PORT || 8000; // define env port or use fallback 8000 port

// define root 
app.get("/", (_req, res) =>
  res.send("Backend running! Try /agent?q=your_query")
);

// define health check
app.get("/heath", (_req, res) => res.send("ok"));

// runs a request query into agent or fallback "latest-ai-news-and-updates"
app.get("/agent", async(req, res) => {
  try {
      const q = req.query.q || "latest AI developments 2025";
      const data = await runWorkflow(q, { maxResults: 20 });
      res.json({ ok: true, ...data });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
})

app.listen(port, () => console.log(`listening on :${port}`));

