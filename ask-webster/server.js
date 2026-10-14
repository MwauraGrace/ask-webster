import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { demoGate } from './demo-access.js';
import { createOllamaClient } from './ollama.js';
import { answerQuestion } from './rag.js';
const entries = JSON.parse(fs.readFileSync(new URL('./campusData.json', import.meta.url), 'utf8'));
const client = createOllamaClient({ baseUrl: process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434' });
const model = process.env.OLLAMA_MODEL || 'qwen3:4b';
const app = express();
if (process.env.DEMO_MODE === '1') {
  if (!process.env.DEMO_PASSWORD) throw new Error('Set DEMO_PASSWORD before starting the demo.');
  app.use('/demo-login', express.urlencoded({ extended: false, limit: '2kb' }));
  app.use(demoGate(process.env.DEMO_PASSWORD));
}
let answering = false;
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '32kb' }));
app.post('/api/chat', async (req, res) => {
  const { message, history = [] } = req.body ?? {};
  if (typeof message !== 'string' || !message.trim() || message.length > 2000)
    return res.status(400).json({ error: 'Enter a question between 1 and 2,000 characters.' });
  if (!Array.isArray(history) || history.length > 10 || history.some(item => !item || !['user', 'assistant'].includes(item.role) || typeof item.content !== 'string' || item.content.length > 4000))
    return res.status(400).json({ error: 'Invalid conversation history.' });
  if (process.env.DEMO_MODE === '1' && answering) return res.status(429).json({ error: 'The demo is answering another question. Please try again shortly.' });
  answering = true;
  try {
    res.json(await answerQuestion({ message: message.trim(), history, entries, client, model }));
  } catch (error) {
    console.error('Chat request failed:', error.status || error.name);
    res.status(502).json({ error: error.message || 'The answer service is temporarily unavailable. Please try again.' });
  } finally {
    answering = false;
  }
});
const frontendDir = fileURLToPath(new URL('../ask-webster-frontend/dist/', import.meta.url));
if (process.env.DEMO_MODE === '1' && !fs.existsSync(frontendDir + '/index.html')) {
  throw new Error('Build the frontend first: npm run build:demo');
}
app.use(express.static(frontendDir));
app.use((error, req, res, next) => {
  if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Your message is too large.' });
  if (error instanceof SyntaxError) return res.status(400).json({ error: 'Invalid JSON request.' });
  next(error);
});
const port = process.env.PORT || 3001;
app.listen(port, '127.0.0.1', () => {
  console.log(`Server running on http://localhost:${port}`);
  console.log(`Using local Ollama model: ${model}`);
});
