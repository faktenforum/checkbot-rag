## @checkbot/core

Shared TypeScript library for Checkbot RAG. It owns configuration, PostgreSQL/pgvector access, chunking, embeddings, hybrid search, imports, and statistics. Other packages (`frontend`, `mcp`) depend on this package for all data access.

### Responsibilities

- **Configuration**: Validated runtime config derived from `CHECKBOT_RAG_*` environment variables.
- **Database**: Connection pool and helpers for PostgreSQL with pgvector.
- **Embedding**: Batched calls to the configured embedding provider.
- **Chunking**: Claim-level chunking into overview and fact-detail chunks with metadata.
- **Search**: Hybrid vector plus full-text search with Reciprocal Rank Fusion (RRF).
- **Import**: JSON dump import with background jobs, progress tracking, cancellation, and re-import of changed claims.
- **Statistics**: Aggregated stats for claims, chunks, rating labels, and categories.

### Configuration and environment

Config is defined in `src/config/index.ts` and loaded from environment variables under the `CHECKBOT_RAG_` prefix.

Key variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `CHECKBOT_RAG_PORT` | `3020` | HTTP port (used by the Nitro server) |
| `CHECKBOT_RAG_POSTGRES_HOST` | `localhost` (or `checkbot-rag-db` in Docker) | PostgreSQL host |
| `CHECKBOT_RAG_POSTGRES_PORT` | `5432` | PostgreSQL port |
| `CHECKBOT_RAG_POSTGRES_DB` | `checkbot_rag` | Database name |
| `CHECKBOT_RAG_POSTGRES_USER` | `checkbot_rag` | Database user |
| `CHECKBOT_RAG_POSTGRES_PASSWORD` | — | Database password (required) |
| `CHECKBOT_RAG_EMBEDDING_PROVIDER` | `scaleway` | `scaleway`, `openrouter`, or `openai` |
| `CHECKBOT_RAG_EMBEDDING_MODEL` | `qwen3-embedding-8b` | Embedding model name |
| `CHECKBOT_RAG_EMBEDDING_API_KEY` | — | Embedding API key (required) |
| `CHECKBOT_RAG_EMBEDDING_BASE_URL` | `https://api.scaleway.ai/v1` | Embedding API base URL |
| `CHECKBOT_RAG_EMBEDDING_DIMENSIONS` | `4096` | Embedding dimensions (4096 / 2048 / 1024 / 512) |
| `CHECKBOT_RAG_EMBEDDING_BATCH_SIZE` | `32` | Texts per embedding API call |
| `CHECKBOT_RAG_SEARCH_WEIGHT_VEC` | `1.0` | RRF weight for vector search |
| `CHECKBOT_RAG_SEARCH_WEIGHT_FTS` | `1.0` | RRF weight for full-text search |
| `CHECKBOT_RAG_RRF_K` | `60` | RRF constant \(k\) |
| `CHECKBOT_RAG_SEARCH_OVERFETCH` | `3` | Overfetch factor for candidates before RRF |
| `CHECKBOT_RAG_MAX_CHUNK_CHARS` | `6000` | Max characters per chunk before splitting |
| `CHECKBOT_RAG_STATIC_DIR` | optional | Path to static files (used by the HTTP host) |
| `CHECKBOT_RAG_MCP_API_KEY` | optional | API key required for `/mcp` if set |

See `.env.example` at the repo root for a complete list and recommended defaults.

### Chunking strategy

Each fact-check is split into two chunk types:

| Type | Content | Typical size |
|------|---------|--------------|
| `claim_overview` | `synopsis`, `ratingSummary`, `ratingStatement`, `ratingLabel`, `categories` | ~200–500 chars |
| `fact_detail` | Fact text plus source excerpts | ~300–1500 chars |

Long facts exceeding `CHECKBOT_RAG_MAX_CHUNK_CHARS` are split at sentence boundaries with overlap to preserve context. Each chunk carries metadata such as `claimId`, `shortId`, `chunkType`, `factIndex`, `ratingLabel`, `categories`, `publishingDate`, `publishingUrl`, and `status`.

### Hybrid search (RRF)

Search combines two ranking signals:

1. **Vector search** - pgvector cosine distance on Qwen3 embeddings (semantic similarity).
2. **Full-text search** - PostgreSQL `tsvector` with `german` dictionary and `ts_rank_cd` scoring (keyword and stem-based).

Scores are fused using Reciprocal Rank Fusion:

```text
score(doc) = weight_vec / (k + rank_vec) + weight_fts / (k + rank_fts)
```

Defaults:

- `CHECKBOT_RAG_SEARCH_WEIGHT_VEC = 1.0`
- `CHECKBOT_RAG_SEARCH_WEIGHT_FTS = 1.0`
- `CHECKBOT_RAG_RRF_K = 60`

Documents that appear in both rankings receive the highest fused scores. This improves recall for German queries where both semantic similarity and exact terms (names, legal references, etc.) matter.

### Dimension scaling reference

Approximate memory usage for embeddings in PostgreSQL:

| Claims | Chunks (~5/claim) | Memory at 4096 dims | Memory at 1024 dims |
|--------|-------------------|---------------------|---------------------|
| 1,000 | 5,000 | ~320 MB | ~80 MB |
| 10,000 | 50,000 | ~3.2 GB | ~800 MB |
| 100,000 | 500,000 | ~32 GB | ~8 GB |
| 500,000 | 2.5M | ~160 GB | ~40 GB |

If you expect 100k+ claims, consider `CHECKBOT_RAG_EMBEDDING_DIMENSIONS=1024` and re-import. For German-language retrieval, quality loss is usually small compared to the memory savings.

### Database and migrations

SQL migrations for the `checkbot_rag` database are managed by [dbmate](https://github.com/amacneil/dbmate) and live in `core/db/migrations/*.sql`. They define:

- Core tables for claims, chunks, and import jobs.
- pgvector-enabled columns for embeddings.
- Full-text search vectors and indexes for German content.

Migrations are applied before the application starts:

- In the standalone Docker stack under `dev/checkbot-rag`, the `checkbot-rag-dbmate` service runs `dbmate up` against the `checkbot_rag` database and the migrations in `core/db/migrations` before the `checkbot-rag` service starts.
- If you run against a database outside that stack, you can run dbmate manually, for example:

  ```bash
  # from dev/checkbot-rag
  docker run --rm \
    -v "$(pwd)/core/db:/db" \
    --network=host \
    -e DATABASE_URL="postgres://user:pass@127.0.0.1:5432/checkbot_rag?sslmode=disable" \
    -e DBMATE_MIGRATIONS_TABLE=checkbot_schema_migrations \
    ghcr.io/amacneil/dbmate:latest up
  ```

The `DatabaseService` no longer runs schema migrations. All structural changes to the `checkbot_rag` database are applied via dbmate migrations in `core/db/migrations` before the application starts.

From the repo root there are convenience scripts in `package.json` which reuse the `checkbot-rag-dbmate` service from `docker-compose.yml` (including its environment and volume mounts):

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

`@checkbot/core` exports:

- `config` - resolved configuration object.
- `db` - PostgreSQL client pool.
- `searchService` - hybrid search over chunks and claims.
- `importService` - JSON import with job tracking.
- `claimsService` - listing and detail access for claims.
- `claimStatsService` - aggregate statistics.
- Chunking and embedding helpers.

These are used by the `frontend` package (Nitro server) and by the `mcp` package to implement HTTP endpoints and MCP tools.

