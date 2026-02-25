import { db } from "./DatabaseService";
import type {
  ClaimListRow,
  ClaimWithChunksRow,
  ListClaimsFilters,
  ListClaimsResult,
} from "../types/claimDb";

export class ClaimsService {
  /**
   * Get a single claim by external ID or short ID including its chunks.
   */
  async get(identifier: string): Promise<ClaimWithChunksRow | null> {
    const { rows } = await db.query<ClaimWithChunksRow>(
      `SELECT c.*, json_agg(
         json_build_object(
           'id', ch.id,
           'chunk_type', ch.chunk_type,
           'fact_index', ch.fact_index,
           'content', ch.content,
           'metadata', ch.metadata
         ) ORDER BY ch.chunk_type DESC, ch.fact_index ASC NULLS FIRST
       ) AS chunks
       FROM public.claims c
       LEFT JOIN public.chunks ch ON ch.claim_id = c.id
       WHERE c.external_id::text = $1 OR c.short_id = $1
       GROUP BY c.id`,
      [identifier]
    );

    const first = rows[0];
    if (!first) {
      return null;
    }

    return first;
  }

  /**
   * List claims with optional filters and pagination.
   */
  async list(filters: ListClaimsFilters): Promise<ListClaimsResult> {
    const { page, limit, ratingLabel, category, status } = filters;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (ratingLabel) {
      conditions.push(`rating_label = $${idx++}`);
      params.push(ratingLabel);
    }
    if (category) {
      conditions.push(`$${idx++} = ANY(categories)`);
      params.push(category);
    }
    if (status) {
      conditions.push(`status = $${idx++}`);
      params.push(status);
    }

    const where =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const [{ rows: claims }, { rows: countRows }] = await Promise.all([
      db.query<ClaimListRow>(
        `SELECT id, external_id, short_id, status, synopsis, rating_label,
                rating_summary, categories, publishing_url, publishing_date,
                created_at, updated_at
         FROM public.claims ${where}
         ORDER BY publishing_date DESC NULLS LAST, created_at DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, limit, offset]
      ),
      db.query<{ total: number }>(
        `SELECT COUNT(*)::int AS total FROM public.claims ${where}`,
        params
      ),
    ]);

    const total = countRows[0]?.total ?? 0;

    return {
      data: claims,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }
}

export const claimsService = new ClaimsService();

