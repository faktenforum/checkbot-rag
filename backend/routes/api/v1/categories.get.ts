import { defineHandler } from "nitro/h3";
import { db } from "@checkbot/core";

export default defineHandler(async () => {
  const { rows } = await db.query<{ category: string; count: number }>(`
    SELECT unnest(categories) AS category, COUNT(*)::int AS count
    FROM public.claims
    GROUP BY category
    ORDER BY count DESC
  `);
  return rows;
});
