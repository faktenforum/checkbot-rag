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
| `POST` | `/api/v1/search` | Hybrid fact-check search; body: `query`, optional filters, optional `language` (default `de`; `auto` returns 400). |
| `GET` | `/api/v1/claims` | Paginated list of claims with filters. |
| `GET` | `/api/v1/claims/:id` | Claim detail by UUID or short ID, including chunks. |
| `POST` | `/api/v1/import` | Start an import job; body: `filePath`, `language` (e.g. `de`, `en`). |
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

- `/` - dashboard with aggregate stats.
- `/search` - hybrid search with filters (rating, category, status, language, visibility, FTS/vector toggles).
- `/claims` - paginated table of claims with filters; `/claims/[id]` shows metadata and chunks.
- `/import` - import form (file path, language) and live job list with progress, cancellation, and deletion.
- `/users` - admin user management (create/edit/deactivate; requires `users:read`).
- `/keys` - API key management (own keys; admins see all).
- `/profile` - own profile and password change.
- `/audit` - audit log viewer with filters (requires `admin`).

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

### Authentication

All `/api/**` and `/mcp` routes require authentication. `/health` is public.

Two methods are accepted:

1. **Session cookie** - set after logging in at `/login`. The cookie is `HttpOnly`, `SameSite=Strict`, valid for 7 days rolling (30-day absolute cap).

2. **Bearer token** - API key created via the UI or bootstrapped from env vars:

    ```http
    Authorization: Bearer ffk_<prefix>_<secret>
    ```

Effective permissions for a Bearer request are `user.permissions ∩ key.permissions`.

Bootstrap env vars create service users on startup:

| Env var | Service user | Default permissions |
|---------|-------------|---------------------|
| `CHECKBOT_RAG_BOOTSTRAP_FAKTENFORUM_KEY` | `faktenforum` | `claims:read`, `claims:write`, `search`, `import` |
| `CHECKBOT_RAG_BOOTSTRAP_MCP_KEY` | `mcp-agent` | `mcp:use`, `claims:read`, `search` |

Admin login is bootstrapped via `CHECKBOT_RAG_BOOTSTRAP_ADMIN_EMAIL` + `CHECKBOT_RAG_BOOTSTRAP_ADMIN_PASSWORD`.

### MCP endpoint

The Nitro route `server/routes/mcp.ts` forwards requests to `@checkbot/mcp`:

- `POST /mcp` - MCP HTTP/SSE endpoint.
- Requires Bearer token with `mcp:use` permission (e.g. a key from the `mcp-agent` service user).

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

