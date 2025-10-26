// src/server.js
import express from 'express';
import cors from 'cors';
import { runWorkflow } from './agents/bright_data_agent.js';

const app = express();
const port = process.env.PORT || 8000;

app.use(cors({ origin: 'http://localhost:3000' })); // frontend origin
app.use(express.json());

app.get('/agent', async (req, res) => {
  try {
    const q = req.query.q || 'latest AI developments 2025';
    const data = await runWorkflow(q, { maxResults: 50 });
    res.json({ ok: true, ...data });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get('/', (_req, res) => res.send('Backend running. Try /agent?q=...'));
app.listen(port, () => console.log(`listening on :${port}`));
