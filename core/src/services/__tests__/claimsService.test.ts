import { describe, it, expect, beforeEach } from "bun:test";
import { db, dbAvailable } from "./helpers/db";
import { claimsService } from "../ClaimsService";

async function resetClaimsAndChunks(): Promise<void> {
  await db.query(`TRUNCATE TABLE chunks, claims RESTART IDENTITY CASCADE`);
}

async function insertClaimWithChunk(externalId: string): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO claims (
       external_id, short_id, status, synopsis, version_hash, raw_data, language,
       categories, process_id, submitter_notes, origins, created_at_source, created_by
     ) VALUES ($1, $2, 'imported', 'Test synopsis', 'h', '{}'::jsonb, 'de',
               '{}', 1, NULL, '[]'::jsonb, NULL, NULL)
     RETURNING id`,
    [externalId, externalId.slice(0, 8)]
  );
  const claimId = rows[0]!.id;
  await db.query(
    `INSERT INTO chunks (claim_id, chunk_type, fact_index, content, metadata)
     VALUES ($1, 'claim_overview', NULL, 'chunk content', '{}'::jsonb)`,
    [claimId]
  );
  return claimId;
}

describe.skipIf(!dbAvailable)("ClaimsService.delete", () => {
  beforeEach(async () => {
    await resetClaimsAndChunks();
  });

  it("deletes a claim by external_id and cascades to chunks", async () => {
    const externalId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    await insertClaimWithChunk(externalId);

    const result = await claimsService.delete(externalId);
    expect(result).toBe(true);

    const claim = await claimsService.get(externalId);
    expect(claim).toBeNull();

    const { rows } = await db.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM chunks WHERE claim_id IN (
         SELECT id FROM claims WHERE external_id::text = $1
       )`,
      [externalId]
    );
    expect(rows[0]!.count).toBe(0);
  });

  it("deletes a claim by short_id", async () => {
    const externalId = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
    await insertClaimWithChunk(externalId);
    const shortId = externalId.slice(0, 8);

    const result = await claimsService.delete(shortId);
    expect(result).toBe(true);

    const claim = await claimsService.get(shortId);
    expect(claim).toBeNull();
  });

  it("returns false for non-existent identifier (idempotent)", async () => {
    const result = await claimsService.delete("does-not-exist");
    expect(result).toBe(false);
  });
});
