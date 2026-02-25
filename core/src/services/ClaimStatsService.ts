import { db } from "./DatabaseService";
import type {
  CategoryCountRow,
  ClaimStatsOverview,
  RatingLabelCountRow,
} from "../types/claimStats";

export class ClaimStatsService {
  /**
   * List category counts aggregated from claims.
   */
  async listCategories(): Promise<CategoryCountRow[]> {
    const { rows } = await db.query<CategoryCountRow>(`
      SELECT unnest(categories) AS category, COUNT(*)::int AS count
      FROM public.claims
      GROUP BY category
      ORDER BY count DESC
    `);
    return rows;
  }

  /**
   * List rating label counts aggregated from claims.
   */
  async listRatingLabels(): Promise<RatingLabelCountRow[]> {
    const { rows } = await db.query<RatingLabelCountRow>(`
      SELECT rating_label, COUNT(*)::int AS count
      FROM public.claims
      WHERE rating_label IS NOT NULL
      GROUP BY rating_label
      ORDER BY count DESC
    `);
    return rows;
  }

  /**
   * Get aggregated statistics for claims and chunks.
   */
  async get(): Promise<ClaimStatsOverview> {
    const [claimTotal, claimByStatus, chunkStats, ratingLabels, categories] =
      await Promise.all([
        db.query<{ total: number }>(
          `SELECT COUNT(*)::int AS total FROM public.claims`
        ),
        db.query<{ by_status: Record<string, number> }>(`
          SELECT json_object_agg(status, cnt) AS by_status
          FROM (SELECT status, COUNT(*)::int AS cnt FROM public.claims GROUP BY status) s
        `),
        db.query<{
          total: number;
          by_type: Record<string, number>;
          embedded: number;
        }>(`
          SELECT
            (SELECT COUNT(*)::int FROM public.chunks) AS total,
            (SELECT json_object_agg(chunk_type, cnt) FROM (SELECT chunk_type, COUNT(*)::int AS cnt FROM public.chunks GROUP BY chunk_type) t) AS by_type,
            (SELECT COUNT(*)::int FROM public.chunks WHERE embedding IS NOT NULL) AS embedded
        `),
        this.listRatingLabels(),
        this.listCategories(),
      ]);

    return {
      claims: {
        total: claimTotal.rows[0]?.total ?? 0,
        byStatus: claimByStatus.rows[0]?.by_status ?? {},
      },
      chunks: {
        total: chunkStats.rows[0]?.total ?? 0,
        byType: chunkStats.rows[0]?.by_type ?? {},
        embedded: chunkStats.rows[0]?.embedded ?? 0,
      },
      ratingLabels,
      categories,
    };
  }
}

export const claimStatsService = new ClaimStatsService();

