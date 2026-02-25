import { defineHandler, getRouterParam } from "nitro/h3";
import { db } from "@checkbot/core/services/DatabaseService";

export default defineHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) {
    event.res.status = 400;
    return { error: "Missing id" };
  }

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
    event.res.status = 404;
    return { error: "Claim not found" };
  }
  return rows[0];
});
