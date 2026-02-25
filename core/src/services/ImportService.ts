import crypto from "node:crypto";
import type { PoolClient } from "pg";
import type { ClaimJson } from "../types/claim";
import type { ImportJobRow, ImportJobStatus } from "../types/import";
import { chunkingService } from "./ChunkingService";
import { db } from "./DatabaseService";
import { EmbeddingService } from "./EmbeddingService";

export class ImportService {
  private readonly embeddingService: EmbeddingService;
  // In-memory job cache for live progress polling
  private readonly jobs = new Map<string, ImportJobStatus>();

  constructor() {
    this.embeddingService = new EmbeddingService();
  }

  /**
   * Start an import job from a pre-parsed JSON array of claims.
   * Runs in the background; use {@link get} to poll job status.
   */
  async start(claims: ClaimJson[], source: string): Promise<string> {
    const { rows } = await db.query<{ id: string }>(
      `INSERT INTO public.import_jobs (status, source, total)
       VALUES ('pending', $1, $2)
       RETURNING id`,
      [source, claims.length]
    );
    const firstRow = rows[0];
    if (!firstRow) throw new Error("INSERT import_jobs returned no row");
    const jobId = firstRow.id;

    const job: ImportJobStatus = {
      id: jobId,
      status: "pending",
      source,
      total: claims.length,
      processed: 0,
      skipped: 0,
      errors: 0,
      createdAt: new Date(),
    };
    this.jobs.set(jobId, job);

    // Run asynchronously — do not await
    this.runImport(jobId, job, claims).catch((err) => {
      console.error(`[ImportService] Job ${jobId} crashed:`, err);
    });

    return jobId;
  }

  /**
   * Get status for a single import job.
   */
  async get(jobId: string): Promise<ImportJobStatus | null> {
    // Try in-memory first for live progress
    const cached = this.jobs.get(jobId);
    if (cached) return cached;

    const { rows } = await db.query<ImportJobRow>(
      `SELECT id, status, source, total, processed, skipped, errors,
              error_message, started_at, completed_at, canceled_at, created_at
       FROM public.import_jobs WHERE id = $1`,
      [jobId]
    );

    if (rows.length === 0) return null;
    const row = rows[0];
    if (!row) return null;

    return this.mapRowToStatus(row);
  }

  /**
   * List recent import jobs ordered by creation time.
   */
  async list(limit = 20): Promise<ImportJobStatus[]> {
    const { rows } = await db.query<ImportJobRow>(
      `SELECT id, status, source, total, processed, skipped, errors,
              error_message, started_at, completed_at, canceled_at, created_at
       FROM public.import_jobs ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );

    return rows.map((row) => this.mapRowToStatus(row));
  }

  /**
   * Request cancellation of a running or pending job.
   * Returns the updated job status or null if not found.
   */
  async cancel(jobId: string): Promise<ImportJobStatus | null> {
    const status = await this.get(jobId);
    if (!status) {
      return null;
    }

    if (status.status === "done" || status.status === "failed" || status.status === "canceled") {
      // Nothing to do – already in a terminal state
      return status;
    }

    status.status = "canceled";
    status.canceledAt = new Date();
    this.jobs.set(jobId, status);

    await db.query(
      `UPDATE public.import_jobs
       SET status = 'canceled', canceled_at = NOW()
       WHERE id = $1`,
      [jobId]
    );

    return status;
  }

  /**
   * Delete a job if it is in a terminal state (done, failed, or canceled).
   * Returns a status string indicating the result.
   */
  async delete(jobId: string): Promise<"deleted" | "not_found" | "not_deletable"> {
    const status = await this.get(jobId);
    if (!status) {
      return "not_found";
    }

    if (status.status !== "done" && status.status !== "failed" && status.status !== "canceled") {
      return "not_deletable";
    }

    await db.query(`DELETE FROM public.import_jobs WHERE id = $1`, [jobId]);
    this.jobs.delete(jobId);
    return "deleted";
  }

  private async runImport(
    jobId: string,
    job: ImportJobStatus,
    claims: ClaimJson[]
  ): Promise<void> {
    // If the job was canceled before it started, mark as canceled and stop.
    if (job.status === "canceled") {
      await db.query(
        `UPDATE public.import_jobs
         SET status = 'canceled', canceled_at = COALESCE(canceled_at, NOW())
         WHERE id = $1`,
        [jobId]
      );
      return;
    }

    job.status = "running";
    job.startedAt = new Date();
    await db.query(
      `UPDATE public.import_jobs SET status = 'running', started_at = NOW() WHERE id = $1`,
      [jobId]
    );

    try {
      for (const claim of claims) {
        // Respect cancellation flag between items by checking latest in-memory state
        const current = this.jobs.get(jobId);
        if (current?.status === "canceled") {
          job.status = "canceled";
          job.completedAt = new Date();
          await db.query(
            `UPDATE public.import_jobs
             SET status = 'canceled',
                 processed = $2,
                 skipped = $3,
                 errors = $4,
                 error_message = $5,
                 canceled_at = COALESCE(canceled_at, NOW()),
                 completed_at = COALESCE(completed_at, NOW())
             WHERE id = $1`,
            [jobId, job.processed, job.skipped, job.errors, job.errorMessage ?? null]
          );
          return;
        }

        try {
          const skipped = await this.importClaim(claim);
          if (skipped) {
            job.skipped++;
          } else {
            job.processed++;
          }
        } catch (err) {
          job.errors++;
          if (!job.errorMessage) {
            job.errorMessage = (err as Error).message;
          }
          console.error(
            `[ImportService] Failed to import claim ${claim.id}:`,
            err
          );
        }

        // Persist progress every 10 claims
        if ((job.processed + job.skipped + job.errors) % 10 === 0) {
          await this.persistProgress(jobId, job);
        }
      }

      job.status = "done";
      job.completedAt = new Date();
      await db.query(
        `UPDATE public.import_jobs
         SET status = 'done', processed = $2, skipped = $3, errors = $4,
             error_message = $5, completed_at = NOW()
         WHERE id = $1`,
        [jobId, job.processed, job.skipped, job.errors, job.errorMessage ?? null]
      );
    } catch (err) {
      job.status = "failed";
      job.errorMessage = (err as Error).message;
      job.completedAt = new Date();
      await db.query(
        `UPDATE public.import_jobs
         SET status = 'failed', error_message = $2, completed_at = NOW()
         WHERE id = $1`,
        [jobId, job.errorMessage]
      );
      throw err;
    }
  }

  // Import a single claim. Returns true if skipped (no changes).
  private async importClaim(claim: ClaimJson): Promise<boolean> {
    // Only import public, checked/published claims with actual content
    if (
      claim.internal ||
      !["checked", "published"].includes(claim.status) ||
      !claim.synopsis
    ) {
      return true;
    }

    const versionHash = this.hashClaim(claim);

    // Check if already imported and unchanged
    const existing = await db.query<{ version_hash: string; id: string }>(
      `SELECT id, version_hash FROM public.claims WHERE external_id = $1`,
      [claim.id]
    );

    const existingRow = existing.rows[0];
    if (existingRow?.version_hash === versionHash) {
      return true; // unchanged
    }

    const chunks = chunkingService.chunkClaim(claim);
    const contents = chunks.map((c) => c.content);
    const embeddings = await this.embeddingService.embedBatch(contents);

    await db.withTransaction(async (client) => {
      let claimDbId: string;

      const existingMatch = existing.rows[0];
      if (existingMatch) {
        claimDbId = existingMatch.id;
        // Update existing claim
        await client.query(
          `UPDATE public.claims SET
             short_id = $2, process_id = $3, status = $4, synopsis = $5,
             rating_statement = $6, rating_summary = $7, rating_label = $8,
             categories = $9, publishing_url = $10, publishing_date = $11,
             internal = $12, version_hash = $13, raw_data = $14,
             last_synced_at = NOW(), updated_at = NOW()
           WHERE id = $1`,
          [
            claimDbId,
            claim.shortId,
            claim.processId,
            claim.status,
            claim.synopsis,
            claim.ratingStatement,
            claim.ratingSummary,
            claim.ratingLabelName,
            claim.claimCategories.map((c) => c.categoryName),
            claim.publishingUrl,
            claim.createdAt,
            claim.internal,
            versionHash,
            JSON.stringify(claim),
          ]
        );
        // Delete old chunks before re-inserting
        await client.query(`DELETE FROM public.chunks WHERE claim_id = $1`, [claimDbId]);
      } else {
        // Insert new claim
        const { rows } = await client.query<{ id: string }>(
          `INSERT INTO public.claims (
             external_id, short_id, process_id, status, synopsis,
             rating_statement, rating_summary, rating_label, categories,
             publishing_url, publishing_date, internal, version_hash, raw_data
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
           RETURNING id`,
          [
            claim.id,
            claim.shortId,
            claim.processId,
            claim.status,
            claim.synopsis,
            claim.ratingStatement,
            claim.ratingSummary,
            claim.ratingLabelName,
            claim.claimCategories.map((c) => c.categoryName),
            claim.publishingUrl,
            claim.createdAt,
            claim.internal,
            versionHash,
            JSON.stringify(claim),
          ]
        );
        const insertRow = rows[0];
        if (!insertRow) throw new Error("INSERT claims RETURNING id returned no row");
        claimDbId = insertRow.id;
      }

      await this.insertChunks(client, claimDbId, chunks, embeddings);
    });

    return false;
  }

  private async insertChunks(
    client: PoolClient,
    claimDbId: string,
    chunks: ReturnType<typeof chunkingService.chunkClaim>,
    embeddings: number[][]
  ): Promise<void> {
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = embeddings[i];
      if (chunk === undefined || embedding === undefined) {
        throw new Error(`Chunk/embedding mismatch at index ${i}`);
      }
      const vectorSql = EmbeddingService.toSql(embedding);

      await client.query(
        `INSERT INTO public.chunks (claim_id, chunk_type, fact_index, content, metadata, embedding)
         VALUES ($1, $2, $3, $4, $5, $6::vector)`,
        [
          claimDbId,
          chunk.chunkType,
          chunk.factIndex,
          chunk.content,
          JSON.stringify(chunk.metadata),
          vectorSql,
        ]
      );
    }
  }

  private hashClaim(claim: ClaimJson): string {
    const stable = JSON.stringify({
      id: claim.id,
      status: claim.status,
      synopsis: claim.synopsis,
      ratingLabelName: claim.ratingLabelName,
      ratingStatement: claim.ratingStatement,
      ratingSummary: claim.ratingSummary,
      facts: claim.facts.map((f) => ({
        id: f.id,
        text: f.text,
        sources: f.sources.map((s) => s.id),
      })),
    });
    return crypto.createHash("md5").update(stable).digest("hex");
  }

  private async persistProgress(
    jobId: string,
    job: ImportJobStatus
  ): Promise<void> {
    await db.query(
      `UPDATE public.import_jobs SET processed = $2, skipped = $3, errors = $4, error_message = $5 WHERE id = $1`,
      [jobId, job.processed, job.skipped, job.errors, job.errorMessage ?? null]
    );
  }

  private mapRowToStatus(row: ImportJobRow): ImportJobStatus {
    return {
      id: row.id,
      status: row.status as ImportJobStatus["status"],
      source: row.source,
      total: row.total,
      processed: row.processed,
      skipped: row.skipped,
      errors: row.errors,
      errorMessage: row.error_message ?? undefined,
      startedAt: row.started_at ?? undefined,
      completedAt: row.completed_at ?? undefined,
      canceledAt: row.canceled_at ?? undefined,
      createdAt: row.created_at,
    };
  }
}

export const importService = new ImportService();
