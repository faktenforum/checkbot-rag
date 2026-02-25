import { z } from "zod";
import { searchService } from "@checkbot/core";

const SearchRequestSchema = z.object({
  query: z.string(),
  limit: z.number().int().min(1).max(50).default(10),
  categories: z.array(z.string()).optional(),
  ratingLabel: z.string().optional(),
  chunkType: z.enum(["all", "overview", "fact_detail"]).default("all"),
});

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const result = SearchRequestSchema.safeParse(body);
  if (!result.success) {
    setResponseStatus(event, 400);
    return { error: "Validation error", details: result.error.flatten() };
  }
  const { query, limit, categories, ratingLabel, chunkType } = result.data;
  return searchService.search({ query, limit, categories, ratingLabel, chunkType });
});
