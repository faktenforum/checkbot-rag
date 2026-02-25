# Checkbot RAG Backend (Nitro)

REST API, MCP endpoint, and optional static/SPA serving. Built with Nitro v3; no Koa.

## Run locally

- `npm run dev` or `bun run dev` — Vite dev server (port 3020 or `CHECKBOT_RAG_PORT`)
- `bun run build` then `bun run start` — production: runs `bun .output/server/index.mjs`

## Docker

Build from this directory:

```bash
docker build -t checkbot-rag-backend .
docker run -p 3020:3020 --env-file .env checkbot-rag-backend
```

The image runs **`bun .output/server/index.mjs`** (Nitro output). Do not use `src/server.ts` — that file was removed in the Nitro migration.

If you use your own Dockerfile or compose: ensure the backend container runs a **build step** (`bun run build`) and then starts with **`bun .output/server/index.mjs`** (or `bun run start`), not `bun src/server.ts` or `node src/server.ts`.
