import Router from "@koa/router";
import { z } from "zod";
import { searchService } from "../services/SearchService.js";

const SearchRequestSchema = z.object({
  query: z.string(),
  limit: z.number().int().min(1).max(50).default(10),
  categories: z.array(z.string()).optional(),
  ratingLabel: z.string().optional(),
  chunkType: z.enum(["all", "overview", "fact_detail"]).default("all"),
});

const searchRouter = new Router({ prefix: "/api/v1" });

searchRouter.post("/search", async (ctx) => {
  const result = SearchRequestSchema.safeParse(ctx.request.body);
  if (!result.success) {
    ctx.status = 400;
    ctx.body = { error: "Validation error", details: result.error.flatten() };
    return;
  }

  const { query, limit, categories, ratingLabel, chunkType } = result.data;
  ctx.body = await searchService.search({ query, limit, categories, ratingLabel, chunkType });
});

export { searchRouter };
