# Ask Webster

A student-built chatbot that helps students find campus information and check official sources. It uses retrieval-augmented generation (RAG) with a local Ollama model; no paid model API key is required.

## Technologies

- React and Vite: chat interface and source details.
- Node.js and Express: backend and demo authentication.
- `campusData.json` and BM25: manually maintained information and keyword retrieval.
- Ollama and Qwen3 4B: local answer generation.
- Optional Cloudflare Tunnel: temporary sharing from a running laptop.

## Project structure

```text
ask-webster/           Express API, retrieval, knowledge base and tests
ask-webster-frontend/  React application
```

Keep these folders alongside each other: the demo build and server expect this layout.

## Requirements

- Node.js 22.12 or newer (Node 24 LTS is also suitable).
- [Ollama](https://ollama.com/) installed and running.
- Download the model once: `ollama pull qwen3:4b`.

CPU generation can be slow. The prototype was demonstrated on a laptop with 16 GB RAM.

## Install

From the repository root:

```sh
npm ci --prefix ask-webster
npm ci --prefix ask-webster-frontend
```

## Run locally

In one terminal:

```sh
cd ask-webster
npm start
```

In another terminal, from the repository root:

```sh
cd ask-webster-frontend
npm run dev
```

Open the URL printed by Vite, normally http://localhost:5173. It proxies `/api` requests to the backend on port 3001. Optional backend settings are documented in `ask-webster/.env.example`; copy that file to `.env` only if you need to change the defaults.

## Password-protected class demo (PowerShell)

From the repository root, with Ollama running:

```powershell
cd ask-webster
npm run build:demo
$env:DEMO_PASSWORD = Read-Host "Choose a class demo password"
npm run demo
```

Open http://localhost:3001. Sign in with username `demo` and the password you entered. For temporary online sharing, see [the demo guide](ask-webster/DEMO.md). Keep the laptop awake and the model, app and tunnel running.

**This GitHub repository stores the project; it is not the running chatbot.** GitHub Pages cannot run the Express backend or Ollama. An always-online service requires separate backend and model hosting.

## Checks

```sh
npm test --prefix ask-webster
npm run lint --prefix ask-webster-frontend
npm run build --prefix ask-webster-frontend
```

Many automated tests mock the model; passing them does not establish answer accuracy. Live checks require Ollama and the downloaded model.

## Sources and limitations

The knowledge base contains official links and manual check dates. It does not crawl websites automatically. Library hours are scoped to Fall 2026; check official pages for current information. Source references make answers checkable but do not guarantee correctness. Current retrieval uses BM25, not embeddings or a vector database. Unknown or incomplete answers can fall back to labeled source excerpts.

This is a student project, not an official Webster University service. Future work includes evaluating answers with students, improving response speed, maintaining sources, and configuring the assistant for other schools.

Never commit passwords, API keys or `.env` files. Dependencies and generated build output are excluded by `.gitignore`.
