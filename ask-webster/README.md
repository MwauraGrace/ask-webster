# Ask Webster

A small RAG chatbot using Express, the existing campusData.json, and a local Ollama model.

## Run

1. Install Ollama for Windows, open it, and run `ollama pull qwen3:4b`. No API key is needed. The backend defaults to this model at http://127.0.0.1:11434. Optionally configure OLLAMA_MODEL and OLLAMA_BASE_URL in `.env` (see `.env.example`). Requires Node.js 22.12 or later for the frontend toolchain.
2. Run `npm install`, then `npm start` in this folder.
3. In `../ask-webster-frontend`, run `npm install`, then `npm run dev`.
4. Open the Vite URL (normally http://localhost:5173). If its origin changes, update FRONTEND_ORIGIN. The frontend optionally accepts VITE_API_URL.

Try: "Who can review my resume?" then "Where is that office?" Unknown information should produce an explicit insufficient-information answer.

## How it works

Ordinary question -> local BM25 retrieval with a small synonym dictionary (top three entries) -> local model answer -> numbered source links. Context-dependent follow-ups first use the model to turn the question into a standalone search query.

This is lexical RAG with AI query expansion, without embeddings or a vector database. Each existing directory entry is already short enough to be a single document. Ordinary questions use one model call, or zero when nothing matches. Follow-ups detected by simple phrasing rules can use two calls. Answers are requested in two to four sentences with a 350-token output limit. This reduces work but does not guarantee a particular speedup. Follow-up detection and synonyms are heuristic; unusual phrasing may need an explicit topic. Answers still appear all at once; streaming is not implemented. History is held in browser memory, limited to ten messages. Only context-dependent follow-ups send history to Ollama, capped at the four most recent messages; ordinary questions send none. Refreshing clears the conversation.

## Knowledge base

Edit campusData.json and restart the server. Only entries with a non-placeholder description and an HTTPS webster.edu URL are included. Any field containing TODO is excluded. Thirteen entries cover admissions, career services, IT, financial aid, housing, library services and international-student services. The original six were checked October 6, 2026; the remaining topics were checked October 13, 2026. Each entry links to its supporting official page. Library hours are explicitly limited to Fall 2026 and include holiday exceptions. Individual eligibility, future schedules and unspecified deadlines require confirmation from the relevant office. Recheck official pages before student use. The lastUpdated field records the manual check date, not the source publication date. Keep each entry focused on one question or procedure, with its exact source URL. Do not add guessed deadlines, requirements or contact details.

Add descriptions containing actual answers (procedures, requirements, dates), not just office names. RAG cannot answer details missing from its sources. This version does not crawl URLs or ingest PDFs. For a larger collection, add document ingestion/chunking and embeddings with a persistent vector index.

The model is instructed to use only supplied evidence; citation IDs are validated, but this does not prove factual grounding. Evaluate representative questions and unsupported requests before deployment. Public deployment also needs authentication or rate limiting and usage controls.

## Validation

`npm test` covers retrieval, placeholder exclusion, follow-up context, and citation rejection using a mocked model. A running Ollama server with qwen3:4b downloaded is needed for live answer-quality checks. CPU-only generation may be slow, especially on the first question. Each model call has a three-minute timeout.

Local API reference: https://docs.ollama.com/api/chat

If a model response is empty or reaches the output limit, the app discards it and displays labeled excerpts from the retrieved sources with links. These excerpts are not a generated answer and may not fully address the question. No extra model call is made.

## Qwen3 completion fix

The installed qwen3:4b chat template opened a thinking block even with think:false. A live check exhausted 350 tokens on planning text. For qwen3:4b and qwen3:1.7b, ollama.js now uses the raw generate endpoint with a ChatML prompt ending in an empty, closed thinking block, matching Qwen3 non-thinking formatting. Other model names use the normal chat endpoint. A constrained JSON answer field is also required; the template adjustment alone was insufficient in a live test. This avoids changing installed models. Citation validation and the incomplete-output fallback remain enabled.

Data sources: each entry in campusData.json links to its official page. Career details changed: the current Impact Center page lists resume reviews, coaching appointments and mock interviews as unavailable. Old career address, phone and hours were removed because the current page did not confirm them.

Run `node check-local.mjs` for an opt-in live check (requires Ollama). On the available CPU with qwen3:4b, a completed admissions contact answer took about 27 seconds and the first-year document answer took about 30 seconds after the structured-output fix. These are individual measurements, not a latency guarantee. Restart the backend after edits, and refresh the browser to clear prior fallback messages from conversation history.

For sharing a password-protected class demo from your laptop, follow DEMO.md. The frontend uses /api/chat; Vite proxies local development requests to port 3001.
