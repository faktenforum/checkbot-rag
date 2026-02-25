import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool, PoolClient } from "pg";
import { config } from "../config";

export class DatabaseService {
  private pool: Pool;
  private vectorColumnEnsured = false;

  constructor() {
    this.pool = new Pool({
      host: config.db.host,
      port: config.db.port,
      database: config.db.name,
      user: config.db.user,
      password: config.db.password,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    this.pool.on("error", (err) => {
      console.error("[DatabaseService] Unexpected pool error:", err);
    });
  }

  async initialize(): Promise<void> {
    await this.runMigrations();
    await this.ensureVectorColumn();
    console.log("[DatabaseService] Initialized successfully");
  }

  private async runMigrations(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          filename TEXT PRIMARY KEY,
          applied_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);

      const migrationsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../migrations");
      const files = fs.existsSync(migrationsDir)
        ? fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort()
        : [];

      for (const file of files) {
        const { rows } = await client.query(
          "SELECT 1 FROM schema_migrations WHERE filename = $1",
          [file]
        );
        if (rows.length > 0) continue;

        console.log(`[DatabaseService] Running migration: ${file}`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");

        await client.query("BEGIN");
        try {
          await client.query(sql);
          await client.query(
            "INSERT INTO schema_migrations (filename) VALUES ($1)",
            [file]
          );
          await client.query("COMMIT");
          console.log(`[DatabaseService] Migration applied: ${file}`);
        } catch (err) {
          await client.query("ROLLBACK");
          throw new Error(`Migration ${file} failed: ${(err as Error).message}`);
        }
      }
    } finally {
      client.release();
    }
  }

  // Ensures the embedding vector column and index exist on public.chunks.
  // HNSW supports up to 2000 dimensions; for higher dims (e.g. 4096) we use IVFFlat.
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
          await client.query(`
            CREATE INDEX IF NOT EXISTS chunks_embedding_idx ON public.chunks
            USING ivfflat (embedding vector_cosine_ops)
            WITH (lists = 100)
          `);
          console.log("[DatabaseService] Embedding column and IVFFlat index created (dims > 2000)");
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
