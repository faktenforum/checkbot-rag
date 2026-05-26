# AGENTS.md — search

Fact-check RAG service. Three packages: `core/`, `frontend/`, `mcp/`.

## Package layout

| Package | Purpose |
|---------|---------|
| `core/` | Config, Postgres + pgvector, chunking, embeddings, hybrid search (vector + FTS + RRF), import pipeline, auth services |
| `frontend/` | Nuxt 4 admin UI + Nitro server: `/api/v1/**`, `/health`, `/mcp` |
| `mcp/` | MCP server wiring + tools; used by Nitro `/mcp` route |

## Endpoints

| Path | Auth | Description |
|------|------|-------------|
| `POST /api/v1/auth/login` | public | Email + password → session cookie |
| `POST /api/v1/auth/logout` | public | Clear session cookie |
| `GET /api/v1/auth/me` | session | Current user |
| `GET /api/v1/users` | `users:read` | List users |
| `POST /api/v1/users` | `users:write` | Create user |
| `GET/PATCH/DELETE /api/v1/users/[id]` | `users:read/write` | Get/update/delete user |
| `PUT /api/v1/users/[id]/password` | `users:write` | Change user password |
| `POST /api/v1/users/[id]/deactivate` | `users:write` | Deactivate user |
| `GET /api/v1/api-keys` | session or key | List keys (own or all) |
| `POST /api/v1/api-keys` | session | Create API key |
| `GET/PATCH/DELETE /api/v1/api-keys/[id]` | session or key | Get/update/delete key |
| `POST /api/v1/api-keys/[id]/revoke` | session or key | Revoke key |
| `GET /api/v1/audit-log` | `admin` | Audit log |
| `POST /api/v1/search` | `search` | Hybrid search |
| `GET /api/v1/claims` | `claims:read` | List claims |
| `POST /api/v1/import` | `import` | Import claims |
| `POST /api/v1/sync` | `import` | Sync from Faktenforum |
| `POST /mcp` | `mcp:use` | MCP endpoint |

## Auth system

**Session auth**: email + password login → `search_session` HttpOnly cookie containing HMAC-SHA256 token. Server-side session row in `sessions` table. Rolling expiry (7d), absolute cap (30d).

**API key auth**: `Authorization: Bearer ffk_<prefix>_<secret>`. Key SHA-256 hashed to `key_hash`. Effective permissions = `user.permissions ∩ key.permissions`.

**Permission check**: `hasPermission(subject, required)` - true if subject has `admin` OR `required`. `admin` is a wildcard.

**Bootstrap**: `UserService.bootstrapFromEnv()` runs idempotently on every startup. Creates/updates admin user and service users from env vars. If env var removed → user + key marked inactive.

## Permissions

```
claims:read   claims:write   search   import   mcp:use
users:read    users:write    api_keys:read_all   admin
```

Role presets: `admin`, `partner` (claims:read + search), `service` (claims:read/write + search + import), `mcp_agent` (mcp:use + claims:read + search), `viewer` (claims:read).

## Middleware chain

```
01.db-init.ts    DB init + bootstrapFromEnv() on startup
02.cors.ts       CORS
03.session.ts    Read search_session cookie → event.context.sessionUser + session
04.api-auth.ts   Bearer token → event.context.apiKey + user; session fallback; 401 if neither
05.rate-limit.ts Rate limit per api_key.id or session userId
```

Public paths exempt from 04: `/api/v1/auth/login`, `/api/v1/auth/logout`.

## Env vars

```
SEARCH_SESSION_SECRET          # min 32 chars (openssl rand -hex 32)
SEARCH_BOOTSTRAP_ADMIN_EMAIL   # initial admin (idempotent)
SEARCH_BOOTSTRAP_ADMIN_PASSWORD
SEARCH_BOOTSTRAP_FAKTENFORUM_KEY  # service user key for faktenforum
SEARCH_BOOTSTRAP_MCP_KEY          # service user key for mcp-agent
```

Removed: `CHECKBOT_RAG_API_KEY`, `CHECKBOT_RAG_MCP_API_KEY` (replaced by bootstrap service users above).

## Key format

`ffk_<8-char-base62-prefix>_<32-char-base62-secret>`. Prefix shown in UI; full key SHA-256 hashed; returned once on creation.

## Database tables

`users` | `api_keys` | `sessions` | `audit_log` — all in `public` schema. Migration: `core/db/migrations/*_create_users_and_api_keys.sql`.

## Testing

Runner: `bun:test`. Run: `bun test` at repo root or inside a package.

Test layers:
1. Pure unit (no DB): `core/src/auth/__tests__/`, `core/src/utils/__tests__/`
2. DB-backed service tests: `core/src/services/__tests__/` (requires `search_test` DB on port 55432)
3. Frontend middleware/route tests: `frontend/server/__tests__/`

Test DB setup: `docker compose -f docker-compose.test.yml up -d search-test-db && docker compose -f docker-compose.test.yml run --rm search-test-dbmate`.

## Hybrid retrieval

pgvector + Postgres FTS combined with RRF. Always pass `language` explicitly (`de`, `en`) - auto-detect not supported.

## Frontend stack

Nuxt 4 + Nuxt UI. All pages use `definePageMeta({ middleware: "auth" })`. Auth state in `useAuth()` composable (shared reactive `currentUser`). API calls via `useApi().apiFetch()` with `credentials: "include"`.
