import Router from "@koa/router";
import { db } from "../services/DatabaseService.js";

const statsRouter = new Router({ prefix: "/api/v1" });

statsRouter.get("/stats", async (ctx) => {
  const [claimStats, chunkStats, ratingStats, categoryStats] = await Promise.all([
    db.query<{ total: number; by_status: Record<string, number> }>(`
      SELECT
        COUNT(*)::int AS total,
        json_object_agg(status, cnt) AS by_status
      FROM (
        SELECT status, COUNT(*)::int AS cnt FROM public.claims GROUP BY status
      ) s
    `),
    db.query<{ total: number; by_type: Record<string, number>; embedded: number }>(`
      SELECT
        (SELECT COUNT(*)::int FROM public.chunks) AS total,
        (SELECT json_object_agg(chunk_type, cnt) FROM (SELECT chunk_type, COUNT(*)::int AS cnt FROM public.chunks GROUP BY chunk_type) t) AS by_type,
        (SELECT COUNT(*)::int FROM public.chunks WHERE embedding IS NOT NULL) AS embedded
    `),
    db.query<{ rating_label: string; count: number }>(`
      SELECT rating_label, COUNT(*)::int AS count
      FROM public.claims
      WHERE rating_label IS NOT NULL
      GROUP BY rating_label
      ORDER BY count DESC
    `),
    db.query<{ category: string; count: number }>(`
      SELECT unnest(categories) AS category, COUNT(*)::int AS count
      FROM public.claims
      GROUP BY category
      ORDER BY count DESC
    `),
  ]);

  ctx.body = {
    claims: {
      total: claimStats.rows[0]?.total ?? 0,
      byStatus: claimStats.rows[0]?.by_status ?? {},
    },
    chunks: {
      total: chunkStats.rows[0]?.total ?? 0,
      byType: chunkStats.rows[0]?.by_type ?? {},
      embedded: chunkStats.rows[0]?.embedded ?? 0,
    },
    ratingLabels: ratingStats.rows,
    categories: categoryStats.rows,
  };
});

statsRouter.get("/categories", async (ctx) => {
  const { rows } = await db.query<{ category: string; count: number }>(`
    SELECT unnest(categories) AS category, COUNT(*)::int AS count
    FROM public.claims
    GROUP BY category
    ORDER BY count DESC
  `);
  ctx.body = rows;
});

statsRouter.get("/rating-labels", async (ctx) => {
  const { rows } = await db.query<{ rating_label: string; count: number }>(`
    SELECT rating_label, COUNT(*)::int AS count
    FROM public.claims
    WHERE rating_label IS NOT NULL
    GROUP BY rating_label
    ORDER BY count DESC
  `);
  ctx.body = rows;
});

export { statsRouter };
