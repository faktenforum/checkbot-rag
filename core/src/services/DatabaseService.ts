import { Pool, type PoolClient } from "pg";
import { config } from "../config";

export class DatabaseService {
  private pool: Pool;
  private vectorColumnEnsured = false;

  constructor() {
    const isTestMode = process.env.CHECKBOT_RAG_TEST_MODE === "1";
    this.pool = new Pool({
      host: config.db.host,
      port: config.db.port,
      database: config.db.name,
      user: config.db.user,
      password: config.db.password,
      max: 10,
      // In test mode we want the pool to release idle clients quickly so
      // `bun test` exits cleanly after the last test finishes. Production
      // keeps the longer timeout for connection reuse.
      idleTimeoutMillis: isTestMode ? 500 : 30000,
      connectionTimeoutMillis: 5000,
      allowExitOnIdle: isTestMode,
    });

    this.pool.on("error", (err) => {
      console.error("[DatabaseService] Unexpected pool error:", err);
    });
  }

  async initialize(): Promise<void> {
    await this.ensureVectorColumn();
    console.log("[DatabaseService] Initialized successfully");
  }

  // Ensures the embedding vector column and index exist on public.chunks.
  // pgvector indexes (HNSW, IVFFlat) support up to 2000 dimensions.
  // For higher dims (e.g. 4096), we create the column but skip the ANN index
  // and fall back to sequential scan for vector search.
  async ensureVectorColumn(): Promise<void> {
    if (this.vectorColumnEnsured) return;

    const dims = config.embedding.dimensions;
    const client = await this.pool.connect();
    try {
      const { rows } = await client.query(
        `SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'chunks' AND column_name = 'embedding'`
      );

      if (rows.length === 0) {
        console.log(`[DatabaseService] Adding embedding column (${dims} dims)`);
        await client.query(
          `ALTER TABLE public.chunks ADD COLUMN embedding vector(${dims})`
        );
        if (dims <= 2000) {
          await client.query(`
            CREATE INDEX IF NOT EXISTS chunks_embedding_idx ON public.chunks
            USING hnsw (embedding vector_cosine_ops)
            WITH (m = 16, ef_construction = 64)
          `);
          console.log("[DatabaseService] Embedding column and HNSW index created");
        } else {
          console.warn(
            "[DatabaseService] Skipping chunks_embedding_idx: pgvector indexes (HNSW, IVFFlat) support up to 2000 dimensions; configured dimensions=%d. Falling back to sequential scan for vector search.",
            dims
          );
        }
      } else {
        console.log(`[DatabaseService] Embedding column exists (dims: ${dims})`);
      }
      this.vectorColumnEnsured = true;
    } finally {
      client.release();
    }
  }

  async query<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[]
  ): Promise<{ rows: T[]; rowCount: number | null }> {
    return this.pool.query(sql, params) as unknown as Promise<{
      rows: T[];
      rowCount: number | null;
    }>;
  }

  async withClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      return await fn(client);
    } finally {
      client.release();
    }
  }

  async withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    return this.withClient(async (client) => {
      await client.query("BEGIN");
      try {
        const result = await fn(client);
        await client.query("COMMIT");
        return result;
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    });
  }

  async end(): Promise<void> {
    await this.pool.end();
  }
}

export const db = new DatabaseService();
