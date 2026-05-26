## @search/core

Shared TypeScript library for Search. It owns configuration, PostgreSQL/pgvector access, chunking, embeddings, hybrid search, imports, and statistics. Other packages (`frontend`, `mcp`) depend on this package for all data access.

### Responsibilities

- **Configuration**: Validated runtime config derived from `SEARCH_*` environment variables.
- **Database**: Connection pool and helpers for PostgreSQL with pgvector.
- **Embedding**: Batched calls to the configured embedding provider.
- **Chunking**: Claim-level chunking into overview and fact-detail chunks with metadata.
- **Search**: Hybrid vector plus full-text search with Reciprocal Rank Fusion (RRF).
- **Import**: JSON dump import with background jobs, progress tracking, cancellation, and re-import of changed claims.
- **Statistics**: Aggregated stats for claims, chunks, rating labels, and categories.

### Configuration and environment

Config is defined in `src/config/index.ts` and loaded from environment variables under the `SEARCH_` prefix.

Key variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `SEARCH_PORT` | `3020` | HTTP port (used by the Nitro server) |
| `SEARCH_POSTGRES_HOST` | `localhost` (or `search-db` in Docker) | PostgreSQL host |
| `SEARCH_POSTGRES_PORT` | `5432` | PostgreSQL port |
| `SEARCH_POSTGRES_DB` | `search` | Database name |
| `SEARCH_POSTGRES_USER` | `search` | Database user |
| `SEARCH_POSTGRES_PASSWORD` | — | Database password (required) |
| `SEARCH_EMBEDDING_PROVIDER` | `scaleway` | `scaleway`, `openrouter`, or `openai` |
| `SEARCH_EMBEDDING_MODEL` | `qwen3-embedding-8b` | Embedding model name |
| `SEARCH_EMBEDDING_API_KEY` | — | Embedding API key (required) |
| `SEARCH_EMBEDDING_BASE_URL` | `https://api.scaleway.ai/v1` | Embedding API base URL |
| `SEARCH_EMBEDDING_DIMENSIONS` | `1536` | Embedding dimensions (Matryoshka: 32–4096; recommend ≤ 2000 for pgvector ANN) |
| `SEARCH_EMBEDDING_BATCH_SIZE` | `32` | Texts per embedding API call |
| `SEARCH_WEIGHT_VEC` | `1.0` | RRF weight for vector search |
| `SEARCH_WEIGHT_FTS` | `0.5` | RRF weight for full-text search |
| `SEARCH_RRF_K` | `60` | RRF constant \(k\) |
| `SEARCH_OVERFETCH` | `3` | Overfetch factor for candidates before RRF |
| `SEARCH_MAX_CHUNK_CHARS` | `6000` | Max characters per chunk before splitting |
| `SEARCH_STATIC_DIR` | optional | Path to static files (used by the HTTP host) |
| `SEARCH_SESSION_SECRET` | — | Random 32+ char secret for session token hashing (required) |
| `SEARCH_BOOTSTRAP_ADMIN_EMAIL` | optional | Email for the initial admin account (bootstrapped on first run) |
| `SEARCH_BOOTSTRAP_ADMIN_PASSWORD` | optional | Password for the initial admin account |
| `SEARCH_BOOTSTRAP_FAKTENFORUM_KEY` | optional | Bearer key for the `faktenforum` service user |
| `SEARCH_BOOTSTRAP_MCP_KEY` | optional | Bearer key for the `mcp-agent` service user |

See `.env.example` at the repo root for a complete list and recommended defaults.

### Chunking strategy

Each fact-check is split into two chunk types:

| Type | Content | Typical size |
|------|---------|--------------|
| `claim_overview` | `synopsis`, `ratingSummary`, `ratingStatement`, `ratingLabel`, `categories` | ~200–500 chars |
| `fact_detail` | Fact text plus source excerpts | ~300–1500 chars |

Long facts exceeding `SEARCH_MAX_CHUNK_CHARS` are split at sentence boundaries with overlap to preserve context. Each chunk carries metadata such as `claimId`, `shortId`, `chunkType`, `factIndex`, `ratingLabel`, `categories`, `publishingDate`, `publishingUrl`, and `status`.

### Hybrid search (RRF)

Search combines two ranking signals:

1. **Vector search** - pgvector cosine distance on Qwen3 embeddings (semantic similarity).
2. **Full-text search** - PostgreSQL `tsvector` and `ts_rank_cd` per query language (e.g. german, english); language is set per search request.

Scores are fused using Reciprocal Rank Fusion:

```text
score(doc) = weight_vec / (k + rank_vec) + weight_fts / (k + rank_fts)
```

Defaults:

- `SEARCH_WEIGHT_VEC = 1.0`
- `SEARCH_WEIGHT_FTS = 0.5`
- `SEARCH_RRF_K = 60`

Documents that appear in both rankings receive the highest fused scores. Use an explicit search language (e.g. `de`, `en`); `auto` is not supported yet.

### Dimension scaling reference

Default is 1536 (fits pgvector ANN index; ≤2000). Approximate memory for embeddings:

| Claims | Chunks (~5/claim) | 1536 dims | 1024 dims |
|--------|-------------------|-----------|-----------|
| 1,000 | 5,000 | ~120 MB | ~80 MB |
| 10,000 | 50,000 | ~1.2 GB | ~800 MB |
| 100,000 | 500,000 | ~12 GB | ~8 GB |
| 500,000 | 2.5M | ~60 GB | ~40 GB |

For 100k+ claims, consider `SEARCH_EMBEDDING_DIMENSIONS=1024` and re-import.

### Database and migrations

SQL migrations for the `search` database are managed by [dbmate](https://github.com/amacneil/dbmate) and live in `core/db/migrations/*.sql`. They define:

- Core tables for claims, chunks, and import jobs.
- pgvector-enabled columns for embeddings.
- Full-text search configuration and indexes for content (language-aware FTS per query).

Migrations are applied before the application starts:

- In the standalone Docker stack under `dev/search`, the `search-dbmate` service runs `dbmate up` against the `search` database and the migrations in `core/db/migrations` before the `search` service starts.
- If you run against a database outside that stack, you can run dbmate manually, for example:

  ```bash
  # from dev/search
  docker run --rm \
    -v "$(pwd)/core/db:/db" \
    --network=host \
    -e DATABASE_URL="postgres://user:pass@127.0.0.1:5432/search?sslmode=disable" \
    -e DBMATE_MIGRATIONS_TABLE=search_schema_migrations \
    ghcr.io/amacneil/dbmate:latest up
  ```

The `DatabaseService` no longer runs schema migrations. All structural changes to the `search` database are applied via dbmate migrations in `core/db/migrations` before the application starts.

From the repo root there are convenience scripts in `package.json` which reuse the `search-dbmate` service from `docker-compose.yml` (including its environment and volume mounts):

- **Neue Migration anlegen** (nur Dateierzeugung, keine DB-Verbindung nötig):

  ```bash
  bun run dbmate:new -- add_my_new_table
  # erzeugt core/db/migrations/<timestamp>_add_my_new_table.sql
  ```

- **Migrationen anwenden**:

  ```bash
  bun run dbmate:up
  ```

- **Letzte Migration zurückrollen**:

  ```bash
  bun run dbmate:down
  ```

### Public API (services and types)

`@search/core` exports:

- `config` - resolved configuration object.
- `db` - PostgreSQL client pool.
- `searchService` - hybrid search over chunks and claims.
- `importService` - JSON import with job tracking.
- `claimsService` - listing and detail access for claims.
- `claimStatsService` - aggregate statistics.
- `userService` - user CRUD and env-var bootstrap.
- `authService` - session-based login and logout.
- `apiKeyService` - API key creation, validation, and management.
- `auditLogService` - structured audit log writes and queries.
- `rateLimiterService` - in-memory per-key rate limiting.
- Chunking, embedding, and permission helpers.

These are used by the `frontend` package (Nitro server) and by the `mcp` package to implement HTTP endpoints and MCP tools.

