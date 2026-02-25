import { db } from "@checkbot/core";

export default defineEventHandler(async () => {
  const { rows } = await db.query<{ rating_label: string; count: number }>(`
    SELECT rating_label, COUNT(*)::int AS count
    FROM public.claims
    WHERE rating_label IS NOT NULL
    GROUP BY rating_label
    ORDER BY count DESC
  `);
  return rows;
});
