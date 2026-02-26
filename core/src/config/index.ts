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

  // Optional API key for MCP endpoint. If set, requests to /mcp must send Authorization: Bearer <key>
  mcpApiKey: z.string().optional(),
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
    mcpApiKey: process.env.CHECKBOT_RAG_MCP_API_KEY?.trim() || undefined,
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
