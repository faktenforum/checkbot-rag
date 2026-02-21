import Router from "@koa/router";
import { z } from "zod";
import { db } from "../services/DatabaseService.js";

const GetClaimsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  ratingLabel: z.string().optional(),
  category: z.string().optional(),
  status: z.string().optional(),
});

const claimRouter = new Router({ prefix: "/api/v1" });

claimRouter.get("/claims", async (ctx) => {
  const result = GetClaimsQuerySchema.safeParse(ctx.query);
  if (!result.success) {
    ctx.status = 400;
    ctx.body = { error: "Validation error", details: result.error.flatten() };
    return;
  }

  const { page, limit, ratingLabel, category, status } = result.data;
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

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const [{ rows: claims }, { rows: countRows }] = await Promise.all([
    db.query(
      `SELECT id, external_id, short_id, status, synopsis, rating_label,
              rating_summary, categories, publishing_url, publishing_date,
              created_at, updated_at
       FROM public.claims ${where}
       ORDER BY publishing_date DESC NULLS LAST, created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    ),
    db.query<{ total: number }>(`SELECT COUNT(*)::int AS total FROM public.claims ${where}`, params),
  ]);

  ctx.body = {
    data: claims,
    total: countRows[0].total,
    page,
    limit,
    pages: Math.ceil(countRows[0].total / limit),
  };
});

claimRouter.get("/claims/:id", async (ctx) => {
  const id = ctx.params.id;

  const { rows } = await db.query(
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
    [id]
  );

  if (rows.length === 0) {
    ctx.status = 404;
    ctx.body = { error: "Claim not found" };
    return;
  }

  ctx.body = rows[0];
});

export { claimRouter };
