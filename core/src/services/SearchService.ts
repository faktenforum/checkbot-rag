import { config } from "../config";
import { db } from "./DatabaseService";
import { EmbeddingService } from "./EmbeddingService";
import { applyRRF, type RawSearchResult } from "../utils/rrf";

export interface SearchOptions {
  query: string;
  limit?: number;
  categories?: string[];
  ratingLabel?: string;
  // 'all': claim_overview + fact_detail (default)
  // 'overview': only claim_overview chunks
  chunkType?: "all" | "overview" | "fact_detail";
}

export interface SearchResultChunk {
  chunkId: number;
  claimId: string;
  externalId: string;
  shortId: string;
  chunkType: string;
  factIndex: number | null;
  content: string;
  metadata: Record<string, unknown>;
  rrfScore: number;
  vecScore?: number;
  ftsScore?: number;
}

export interface SearchResultClaim {
  externalId: string;
  shortId: string;
  synopsis: string | null;
  ratingLabel: string | null;
  ratingSummary: string | null;
  ratingStatement: string | null;
  categories: string[];
  publishingUrl: string | null;
  publishingDate: string | null;
  status: string;
  bestScore: number;
  chunks: SearchResultChunk[];
}

export interface SearchResponse {
  query: string;
  totalResults: number;
  claims: SearchResultClaim[];
}

export class SearchService {
  private readonly embeddingService: EmbeddingService;

  constructor() {
    this.embeddingService = new EmbeddingService();
  }

  async search(options: SearchOptions): Promise<SearchResponse> {
    const {
      query,
      limit = 10,
      categories,
      ratingLabel,
      chunkType = "all",
    } = options;

    const { weightVec, weightFts, rrfK, overfetchFactor } = config.search;
    // Overfetch to improve RRF recall: fetch more candidates than needed
    const fetchLimit = limit * overfetchFactor;

    // Embed the query for vector search
    const queryEmbedding = await this.embeddingService.embedOne(query);
    const vectorSql = EmbeddingService.toSql(queryEmbedding);

    // Build metadata filter conditions
    const filterConditions: string[] = [];
    const filterParams: unknown[] = [];
    let paramIdx = 1;

    if (chunkType !== "all") {
      filterConditions.push(`c.chunk_type = $${paramIdx++}`);
      filterParams.push(chunkType);
    }

    if (categories && categories.length > 0) {
      filterConditions.push(
        `cl.categories && $${paramIdx++}::text[]`
      );
      filterParams.push(categories);
    }

    if (ratingLabel) {
      filterConditions.push(`cl.rating_label = $${paramIdx++}`);
      filterParams.push(ratingLabel);
    }

    const whereClause =
      filterConditions.length > 0
        ? `AND ${filterConditions.join(" AND ")}`
        : "";

    // Vector search: cosine distance with pgvector (public.chunks has embedding column)
    const vecQuery = `
      SELECT
        c.id,
        1 - (c.embedding <=> '${vectorSql}'::vector) AS vec_score,
        NULL::float AS fts_score
      FROM public.chunks c
      JOIN public.claims cl ON c.claim_id = cl.id
      WHERE c.embedding IS NOT NULL
        ${whereClause}
      ORDER BY c.embedding <=> '${vectorSql}'::vector
      LIMIT $${paramIdx}
    `;

    // FTS search: German ts_rank_cd with plainto_tsquery
    const ftsQuery = `
      SELECT
        c.id,
        NULL::float AS vec_score,
        ts_rank_cd(c.fts_vector, plainto_tsquery('german', $${paramIdx + 1})) AS fts_score
      FROM public.chunks c
      JOIN public.claims cl ON c.claim_id = cl.id
      WHERE c.fts_vector @@ plainto_tsquery('german', $${paramIdx + 1})
        ${whereClause}
      ORDER BY fts_score DESC
      LIMIT $${paramIdx}
    `;

    const queryParams = [...filterParams, fetchLimit];
    const ftsQueryParams = [...filterParams, fetchLimit, query];

    const [vecResult, ftsResult] = await Promise.all([
      db.query<{ id: number; vec_score: number; fts_score: null }>(
        vecQuery,
        queryParams
      ),
      db.query<{ id: number; vec_score: null; fts_score: number }>(
        ftsQuery,
        ftsQueryParams
      ),
    ]);

    // Merge results: a chunk may appear in both lists
    const merged = new Map<number, RawSearchResult>();

    for (const row of vecResult.rows) {
      merged.set(row.id, { id: row.id, vecScore: row.vec_score });
    }
    for (const row of ftsResult.rows) {
      const existing = merged.get(row.id);
      if (existing) {
        existing.ftsScore = row.fts_score;
      } else {
        merged.set(row.id, { id: row.id, ftsScore: row.fts_score });
      }
    }

    // Apply RRF and take top-limit results
    const ranked = applyRRF(Array.from(merged.values()), {
      weightVec,
      weightFts,
      k: rrfK,
    }).slice(0, limit);

    if (ranked.length === 0) {
      return { query, totalResults: 0, claims: [] };
    }

    // Fetch full chunk + claim data for ranked results
    const chunkIds = ranked.map((r) => r.id);
    const { rows: chunkRows } = await db.query<{
      id: number;
      claim_id: string;
      chunk_type: string;
      fact_index: number | null;
      content: string;
      metadata: Record<string, unknown>;
      external_id: string;
      short_id: string;
      synopsis: string | null;
      rating_label: string | null;
      rating_summary: string | null;
      rating_statement: string | null;
      categories: string[];
      publishing_url: string | null;
      publishing_date: string | null;
      status: string;
    }>(
      `SELECT
         c.id, c.claim_id, c.chunk_type, c.fact_index, c.content, c.metadata,
         cl.external_id, cl.short_id, cl.synopsis, cl.rating_label,
         cl.rating_summary, cl.rating_statement, cl.categories,
         cl.publishing_url, cl.publishing_date, cl.status
       FROM public.chunks c
       JOIN public.claims cl ON c.claim_id = cl.id
       WHERE c.id = ANY($1::int[])`,
      [chunkIds]
    );

    // Build a lookup map for quick access
    const chunkMap = new Map(chunkRows.map((r) => [r.id, r]));
    const rrfMap = new Map(ranked.map((r) => [r.id, r]));

    // Group chunks by claim, keeping highest RRF score per claim
    const claimsMap = new Map<string, SearchResultClaim>();

    for (const rrfResult of ranked) {
      const row = chunkMap.get(rrfResult.id);
      if (!row) continue;

      const chunk: SearchResultChunk = {
        chunkId: row.id,
        claimId: row.claim_id,
        externalId: row.external_id,
        shortId: row.short_id,
        chunkType: row.chunk_type,
        factIndex: row.fact_index,
        content: row.content,
        metadata: row.metadata,
        rrfScore: rrfResult.rrfScore,
        vecScore: rrfResult.vecScore,
        ftsScore: rrfResult.ftsScore,
      };

      const existing = claimsMap.get(row.external_id);
      if (existing) {
        existing.chunks.push(chunk);
        if (chunk.rrfScore > existing.bestScore) {
          existing.bestScore = chunk.rrfScore;
        }
      } else {
        claimsMap.set(row.external_id, {
          externalId: row.external_id,
          shortId: row.short_id,
          synopsis: row.synopsis,
          ratingLabel: row.rating_label,
          ratingSummary: row.rating_summary,
          ratingStatement: row.rating_statement,
          categories: row.categories,
          publishingUrl: row.publishing_url,
          publishingDate: row.publishing_date
            ? new Date(row.publishing_date).toISOString()
            : null,
          status: row.status,
          bestScore: chunk.rrfScore,
          chunks: [chunk],
        });
      }
    }

    // Sort claims by best chunk score
    const claims = Array.from(claimsMap.values()).sort(
      (a, b) => b.bestScore - a.bestScore
    );

    return {
      query,
      totalResults: claims.length,
      claims,
    };
  }
}

export const searchService = new SearchService();
