import 'dotenv/config';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { answerQuestion } from './rag.js';
import { createOllamaClient } from './ollama.js';
const start = Date.now();
const result = await answerQuestion({ message: 'What documents do I need for first-year test-optional admission?', history: [], entries: JSON.parse(fs.readFileSync('campusData.json')), client: createOllamaClient({baseUrl: process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434'}), model: process.env.OLLAMA_MODEL || 'qwen3:4b' });
console.log(JSON.stringify({ ms: Date.now() - start, ...result }));

assert.notEqual(result.mode, 'source-excerpts');
assert.ok(result.sources.some(source => source.id === 'first-year-test-optional'));
