import express from 'express';
import { runWorkflow } from './agents/bright_data_agent.js';
import retrieveRoute from './routes/retrieve.js'; 

const app = express();
const port = process.env.PORT || 8000;

app.use(express.json());                   // good default
// optional CORS if frontend is on another origin
// import cors from 'cors'; app.use(cors());

app.get('/agent', async (req, res) => {
  try {
    const q = req.query.q || 'latest AI developments 2025';
    const data = await runWorkflow(q, { maxResults: 20 });
    res.json({ ok: true, ...data });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// mount new endpoint
app.use('/api/retrieve', retrieveRoute);

app.get('/', (_req, res) => res.send('Backend running. Try /agent?q=... or /api/retrieve?topic=...'));
app.listen(port, () => console.log(`listening on :${port}`));
