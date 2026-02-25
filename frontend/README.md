## @checkbot/frontend

Nuxt 4 application for Checkbot RAG. It provides:

- A **Nuxt UI** based admin interface for searching fact-checks, browsing claims, viewing chunks, and managing imports.
- A **Nitro server** that exposes the public HTTP surface of Checkbot RAG:
  - `GET /health`
  - `/api/v1/**` REST endpoints
  - `POST /mcp` MCP endpoint backed by `@checkbot/mcp`

Internally it depends on `@checkbot/core` for configuration, database access, search, imports, and statistics.

### Tech stack

- Nuxt 4 (Vue 3, Nitro)
- @nuxt/ui
- Tailwind CSS (via `@tailwindcss/vite`)
- Pinia
- @tanstack/vue-query
- TypeScript and `vue-tsc` for type checking

### REST API

Routes are implemented under `server/api/v1`. The main endpoints are:

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check that pings PostgreSQL. |
| `POST` | `/api/v1/search` | Hybrid fact-check search using `searchService`. |
| `GET` | `/api/v1/claims` | Paginated list of claims with filters. |
| `GET` | `/api/v1/claims/:id` | Claim detail by UUID or short ID, including chunks. |
| `POST` | `/api/v1/import` | Start an import job from a JSON file path inside the container. |
| `GET` | `/api/v1/import/jobs` | List recent import jobs. |
| `GET` | `/api/v1/import/jobs/:jobId` | Get import job status. |
| `POST` | `/api/v1/import/jobs/:jobId/cancel` | Request cancellation of a running or pending job. |
| `DELETE` | `/api/v1/import/jobs/:jobId` | Delete a completed, failed, or canceled job. |
| `GET` | `/api/v1/stats` | Aggregate stats for claims, chunks, rating labels, and categories. |
| `GET` | `/api/v1/categories` | Categories with counts. |
| `GET` | `/api/v1/rating-labels` | Rating labels with counts. |

All endpoints validate input using Zod schemas under `server/schemas`.

### UI overview

Main pages under `app/pages`:

- `/` - search view with hybrid search, filters (rating, category, limit), and top-level stats.
- `/claims` - paginated table of claims with filters and links to detail pages.
- `/claims/[id]` - fact-check detail page (short ID or UUID), showing metadata and chunks.
- `/import` - import form (file path inside container) plus live list of import jobs with progress, cancellation, and deletion.
- `/stats` - statistics view (summary of counts and distributions, if present).

Shared layout and shell components (`AppShell`, `SidebarNav`, `Logo*`) live under `app/components` and `app/layouts`.

### Configuration

Nuxt configuration lives in `nuxt.config.ts`. Relevant points:

- **Public runtime config**:

  ```ts
  runtimeConfig: {
    public: {
      // Empty = same-origin. For local dev against a remote API, set NUXT_PUBLIC_API_BASE.
      apiBase: "",
    },
  }
  ```

- **Dev server port**: uses `CHECKBOT_RAG_PORT` if set, otherwise `3020`.
- **CORS**: Nitro `routeRules` enable CORS for `/api/v1/**`, `/health`, and `/mcp`.

The server itself reads all `CHECKBOT_RAG_*` environment variables through `@checkbot/core` (see `core/README.md`).

### MCP endpoint

The Nitro route `server/routes/mcp.ts` forwards requests to `@checkbot/mcp`:

- `POST /mcp` - MCP HTTP/SSE endpoint.
- Optional authentication:
  - If `CHECKBOT_RAG_MCP_API_KEY` is set, the middleware in `server/middleware/03.mcp-auth.ts` requires:

    ```http
    Authorization: Bearer <CHECKBOT_RAG_MCP_API_KEY>
    ```

See `mcp/README.md` for the available tools and payloads.

### Local development

1. **Install dependencies** (from the repo root):

   ```bash
   bun install
   ```

2. **Start PostgreSQL and migrations**  
   In most cases you will run the full stack via Docker (`docker compose up`) so PostgreSQL and migrations are handled for you. The `checkbot-rag-dbmate` service runs [dbmate](https://github.com/amacneil/dbmate) against the `checkbot_rag` database using the migration files in `core/db/migrations` before the app starts.

   If you run Nuxt alone, ensure PostgreSQL is reachable and the dbmate migrations have been applied, for example:

   ```bash
   # from dev/checkbot-rag
   docker run --rm \
     -v "$(pwd)/core/db:/db" \
     --network=host \
     -e DATABASE_URL="postgres://user:pass@127.0.0.1:5432/checkbot_rag?sslmode=disable" \
     -e DBMATE_MIGRATIONS_TABLE=checkbot_schema_migrations \
     ghcr.io/amacneil/dbmate:latest up
   ```

3. **Run Nuxt dev server**:

   ```bash
   cd frontend
   bun run dev
   ```

   The UI will be available on `http://localhost:<CHECKBOT_RAG_PORT or 3020>`.

