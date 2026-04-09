import { z } from "zod";

const configSchema = z.object({
  port: z.coerce.number().default(3020),

  db: z.object({
    host: z.string().default("localhost"),
    port: z.coerce.number().default(5432),
    name: z.string().default("checkbot_rag"),
    user: z.string().default("checkbot_rag"),
    password: z.string(),
  }),

  embedding: z.object({
    provider: z.enum(["scaleway", "openrouter", "openai"]).default("scaleway"),
    model: z.string().default("qwen3-embedding-8b"),
    apiKey: z.string(),
    baseUrl: z.string().url().default("https://api.scaleway.ai/v1"),
    // Matryoshka: Qwen3-Embedding-8B supports 32–4096 dims.
    // pgvector ANN indexes (HNSW/IVFFlat) support up to 2000 dims, so 1536 is a safe default.
    dimensions: z.coerce.number().default(1536),
    batchSize: z.coerce.number().default(32),
  }),

  search: z.object({
    weightVec: z.coerce.number().default(1.0),
    weightFts: z.coerce.number().default(1.0),
    rrfK: z.coerce.number().default(60),
    // Fetch overfetchFactor*limit candidates before RRF for better recall
    overfetchFactor: z.coerce.number().default(3),
  }),

  chunking: z.object({
    // Max characters per chunk; long facts are split at sentence boundaries
    maxChunkChars: z.coerce.number().default(6000),
  }),

  // Path to serve Nuxt frontend static files (relative or absolute)
  staticDir: z.string().optional(),

  /**
   * @deprecated Legacy env-var key support. Kept so existing middleware
   * compiles until the auth rewrite lands in phase 3. Remove in phase 8.
   */
  apiKey: z.string().optional(),
  /** @deprecated see `apiKey` */
  mcpApiKey: z.string().optional(),

  // Authentication + session handling
  auth: z.object({
    // HMAC pepper for session tokens. Required in production - in test/dev a
    // weak default is used if unset. See sessionToken.ts for usage.
    sessionSecret: z.string().default("dev-insecure-session-secret-change-me-please!!"),
    sessionLifetimeDays: z.coerce.number().default(7),
    sessionMaxLifetimeDays: z.coerce.number().default(30),
    // Idempotent bootstrap - re-read on every startup. See UserService.bootstrapFromEnv().
    bootstrap: z.object({
      adminEmail: z.string().email().optional(),
      adminPassword: z.string().min(8).optional(),
      mcpKey: z.string().optional(),
      faktenforumKey: z.string().optional(),
    }),
  }),

  // In-memory per-api-key rate limits (rate-limiter-flexible)
  rateLimiting: z.object({
    enabled: z.coerce.boolean().default(true),
    defaultPoints: z.coerce.number().default(60),
    defaultDurationSec: z.coerce.number().default(60),
    searchPoints: z.coerce.number().default(30),
    importPoints: z.coerce.number().default(10),
  }),

  // Faktenforum integration: URL and API key for pulling claims via the export endpoint
  faktenforum: z.object({
    url: z.string().url().optional(),
    apiKey: z.string().optional(),
  }),
});

function loadConfig() {
  const raw = {
    port: process.env.CHECKBOT_RAG_PORT,

    db: {
      host: process.env.CHECKBOT_RAG_POSTGRES_HOST,
      port: process.env.CHECKBOT_RAG_POSTGRES_PORT,
      name: process.env.CHECKBOT_RAG_POSTGRES_DB,
      user: process.env.CHECKBOT_RAG_POSTGRES_USER,
      password: process.env.CHECKBOT_RAG_POSTGRES_PASSWORD ?? "",
    },

    embedding: {
      provider: process.env.CHECKBOT_RAG_EMBEDDING_PROVIDER,
      model: process.env.CHECKBOT_RAG_EMBEDDING_MODEL,
      apiKey: process.env.CHECKBOT_RAG_EMBEDDING_API_KEY ?? "",
      baseUrl: process.env.CHECKBOT_RAG_EMBEDDING_BASE_URL,
      dimensions: process.env.CHECKBOT_RAG_EMBEDDING_DIMENSIONS,
      batchSize: process.env.CHECKBOT_RAG_EMBEDDING_BATCH_SIZE,
    },

    search: {
      weightVec: process.env.CHECKBOT_RAG_SEARCH_WEIGHT_VEC,
      weightFts: process.env.CHECKBOT_RAG_SEARCH_WEIGHT_FTS,
      rrfK: process.env.CHECKBOT_RAG_RRF_K,
      overfetchFactor: process.env.CHECKBOT_RAG_SEARCH_OVERFETCH,
    },

    chunking: {
      maxChunkChars: process.env.CHECKBOT_RAG_MAX_CHUNK_CHARS,
    },

    staticDir: process.env.CHECKBOT_RAG_STATIC_DIR,

    // deprecated; see config schema comment
    apiKey: process.env.CHECKBOT_RAG_API_KEY?.trim() || undefined,
    mcpApiKey: process.env.CHECKBOT_RAG_MCP_API_KEY?.trim() || undefined,

    auth: {
      sessionSecret: process.env.CHECKBOT_RAG_SESSION_SECRET?.trim() || undefined,
      sessionLifetimeDays: process.env.CHECKBOT_RAG_SESSION_LIFETIME_DAYS,
      sessionMaxLifetimeDays: process.env.CHECKBOT_RAG_SESSION_MAX_LIFETIME_DAYS,
      bootstrap: {
        adminEmail: process.env.CHECKBOT_RAG_BOOTSTRAP_ADMIN_EMAIL?.trim() || undefined,
        adminPassword: process.env.CHECKBOT_RAG_BOOTSTRAP_ADMIN_PASSWORD || undefined,
        mcpKey: process.env.CHECKBOT_RAG_BOOTSTRAP_MCP_KEY?.trim() || undefined,
        faktenforumKey: process.env.CHECKBOT_RAG_BOOTSTRAP_FAKTENFORUM_KEY?.trim() || undefined,
      },
    },

    rateLimiting: {
      enabled: process.env.CHECKBOT_RAG_RATE_LIMIT_ENABLED,
      defaultPoints: process.env.CHECKBOT_RAG_RATE_LIMIT_DEFAULT_POINTS,
      defaultDurationSec: process.env.CHECKBOT_RAG_RATE_LIMIT_DEFAULT_DURATION_SEC,
      searchPoints: process.env.CHECKBOT_RAG_RATE_LIMIT_SEARCH_POINTS,
      importPoints: process.env.CHECKBOT_RAG_RATE_LIMIT_IMPORT_POINTS,
    },

    faktenforum: {
      url: process.env.CHECKBOT_RAG_FAKTENFORUM_URL?.trim() || undefined,
      apiKey: process.env.CHECKBOT_RAG_FAKTENFORUM_API_KEY?.trim() || undefined,
    },
  };

  const result = configSchema.safeParse(raw);
  if (!result.success) {
    console.error("Invalid configuration:", z.treeifyError(result.error));
    process.exit(1);
  }
  return result.data;
}

export const config = loadConfig();
export type Config = typeof config;
