import { defineNitroConfig } from "nitro/config";

export default defineNitroConfig({
  srcDir: ".",
  runtimeConfig: {
    port: process.env.CHECKBOT_RAG_PORT ? Number(process.env.CHECKBOT_RAG_PORT) : 3020,
    db: {
      host: process.env.CHECKBOT_RAG_POSTGRES_HOST ?? "localhost",
      port: process.env.CHECKBOT_RAG_POSTGRES_PORT ? Number(process.env.CHECKBOT_RAG_POSTGRES_PORT) : 5432,
      name: process.env.CHECKBOT_RAG_POSTGRES_DB ?? "checkbot_rag",
      user: process.env.CHECKBOT_RAG_POSTGRES_USER ?? "checkbot_rag",
      password: process.env.CHECKBOT_RAG_POSTGRES_PASSWORD ?? "",
    },
    embedding: {
      provider: process.env.CHECKBOT_RAG_EMBEDDING_PROVIDER ?? "scaleway",
      model: process.env.CHECKBOT_RAG_EMBEDDING_MODEL ?? "qwen3-embedding-8b",
      apiKey: process.env.CHECKBOT_RAG_EMBEDDING_API_KEY ?? "",
      baseUrl: process.env.CHECKBOT_RAG_EMBEDDING_BASE_URL ?? "https://api.scaleway.ai/v1",
      dimensions: process.env.CHECKBOT_RAG_EMBEDDING_DIMENSIONS ? Number(process.env.CHECKBOT_RAG_EMBEDDING_DIMENSIONS) : 4096,
      batchSize: process.env.CHECKBOT_RAG_EMBEDDING_BATCH_SIZE ? Number(process.env.CHECKBOT_RAG_EMBEDDING_BATCH_SIZE) : 32,
    },
    search: {
      weightVec: process.env.CHECKBOT_RAG_SEARCH_WEIGHT_VEC ? Number(process.env.CHECKBOT_RAG_SEARCH_WEIGHT_VEC) : 1.0,
      weightFts: process.env.CHECKBOT_RAG_SEARCH_WEIGHT_FTS ? Number(process.env.CHECKBOT_RAG_SEARCH_WEIGHT_FTS) : 1.0,
      rrfK: process.env.CHECKBOT_RAG_RRF_K ? Number(process.env.CHECKBOT_RAG_RRF_K) : 60,
      overfetchFactor: process.env.CHECKBOT_RAG_SEARCH_OVERFETCH ? Number(process.env.CHECKBOT_RAG_SEARCH_OVERFETCH) : 3,
    },
    chunking: {
      maxChunkChars: process.env.CHECKBOT_RAG_MAX_CHUNK_CHARS ? Number(process.env.CHECKBOT_RAG_MAX_CHUNK_CHARS) : 6000,
    },
    staticDir: process.env.CHECKBOT_RAG_STATIC_DIR,
    mcpApiKey: process.env.CHECKBOT_RAG_MCP_API_KEY?.trim() || undefined,
  },
  routeRules: {
    "/api/v1/**": { cors: true },
    "/health": { cors: true },
    "/mcp": { cors: true },
  },
  devServer: {
    port: process.env.CHECKBOT_RAG_PORT ? Number(process.env.CHECKBOT_RAG_PORT) : 3020,
  },
  errorHandler: "./server/error",
});
