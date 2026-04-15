import { describe, it, expect, beforeEach } from "bun:test";
import { db, dbAvailable } from "./helpers/db";
import { searchService } from "../SearchService";

async function resetClaimsAndChunks(): Promise<void> {
  await db.query(`TRUNCATE TABLE chunks, claims RESTART IDENTITY CASCADE`);
}

async function insertClaim(args: {
  externalId: string;
  synopsis: string;
  chunkContent: string;
  language?: string;
}): Promise<void> {
  const { externalId, synopsis, chunkContent, language = "de" } = args;
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO claims (
       external_id, short_id, status, synopsis, version_hash, raw_data, language,
       categories, process_id, submitter_notes, origins, created_at_source, created_by
     ) VALUES ($1, $2, 'imported', $3, 'h', '{}'::jsonb, $4,
               '{}', 1, NULL, '[]'::jsonb, NULL, NULL)
     RETURNING id`,
    [externalId, externalId.slice(0, 8), synopsis, language]
  );
  const claimId = rows[0]!.id;
  // chunk with null embedding — FTS-only search still finds it
  await db.query(
    `INSERT INTO chunks (claim_id, chunk_type, fact_index, content, metadata)
     VALUES ($1, 'claim_overview', NULL, $2, '{}'::jsonb)`,
    [claimId, chunkContent]
  );
}

describe.skipIf(!dbAvailable)("SearchService.search — FTS highlighting", () => {
  beforeEach(async () => {
    await resetClaimsAndChunks();
  });

  it("wraps FTS matches in <mark> tags in snippetHtml", async () => {
    await insertClaim({
      externalId: "11111111-1111-1111-1111-111111111111",
      synopsis: "Test claim about vaccines",
      chunkContent:
        "This is a detailed description about vaccines and their effects on public health and safety.",
      language: "en",
    });

    const result = await searchService.search({
      query: "vaccines",
      enableVec: false,
      enableFts: true,
      language: "en",
      limit: 5,
    });

    expect(result.claims).toHaveLength(1);
    const claim = result.claims[0]!;
    expect(claim.chunks).toHaveLength(1);
    const chunk = claim.chunks[0]!;
    expect(chunk.snippetHtml).toBeDefined();
    expect(chunk.snippetHtml).toContain("<mark>");
    expect(chunk.snippetHtml).toContain("</mark>");
    expect(chunk.ftsScore).toBeGreaterThan(0);
  });

  it("html-escapes dangerous content before ts_headline runs (XSS safety)", async () => {
    await insertClaim({
      externalId: "22222222-2222-2222-2222-222222222222",
      synopsis: "Test with script",
      chunkContent:
        "Before the <script>alert('xss')</script> tag there is a keyword token found here in the text.",
      language: "en",
    });

    const result = await searchService.search({
      query: "keyword",
      enableVec: false,
      enableFts: true,
      language: "en",
      limit: 5,
    });

    const chunk = result.claims[0]!.chunks[0]!;
    const html = chunk.snippetHtml!;
    // The only unescaped angle brackets should be from our <mark>/</mark>
    // delimiters; the user's <script> must be escaped.
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("<mark>keyword</mark>");
  });

  it("returns claim with new fields (processId, submitterNotes, origins, etc.)", async () => {
    const { rows } = await db.query<{ id: string }>(
      `INSERT INTO claims (
         external_id, short_id, status, synopsis, version_hash, raw_data, language,
         categories, process_id, submitter_notes, origins, created_at_source, created_by
       ) VALUES (
         '33333333-3333-3333-3333-333333333333', '3333', 'imported', 'Claim with extras',
         'h', '{}'::jsonb, 'en', '{}', 42, 'Some note',
         '[{"url": "https://example.com", "archiveUrl": null, "file": null}]'::jsonb,
         '2026-04-15T10:00:00Z', 'alice'
       )
       RETURNING id`
    );
    await db.query(
      `INSERT INTO chunks (claim_id, chunk_type, fact_index, content, metadata)
       VALUES ($1, 'claim_overview', NULL, 'extras and more extras', '{}'::jsonb)`,
      [rows[0]!.id]
    );

    const result = await searchService.search({
      query: "extras",
      enableVec: false,
      enableFts: true,
      language: "en",
      limit: 5,
    });

    const claim = result.claims[0]!;
    expect(claim.processId).toBe(42);
    expect(claim.submitterNotes).toBe("Some note");
    expect(claim.origins).toEqual([
      { url: "https://example.com", archiveUrl: null, file: null },
    ]);
    expect(claim.createdBy).toBe("alice");
    expect(claim.createdAtSource).toBe("2026-04-15T10:00:00.000Z");
  });
});
