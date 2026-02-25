import { defineHandler, getQuery } from "nitro/h3";
import { z } from "zod";
import { db } from "@checkbot/core/services/DatabaseService";

const GetClaimsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  ratingLabel: z.string().optional(),
  category: z.string().optional(),
  status: z.string().optional(),
});

export default defineHandler(async (event) => {
  const query = getQuery(event);
  const result = GetClaimsQuerySchema.safeParse(query);
  if (!result.success) {
    event.res.status = 400;
    return { error: "Validation error", details: result.error.flatten() };
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

  return {
    data: claims,
    total: countRows[0].total,
    page,
    limit,
    pages: Math.ceil(countRows[0].total / limit),
  };
});
