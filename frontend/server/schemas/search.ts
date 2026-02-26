import { SEARCH_LANGUAGE_CODES } from "@checkbot/core";
import { z } from "zod";

export const SearchRequestSchema = z.object({
  query: z.string(),
  limit: z.number().int().min(1).max(50).default(10),
  categories: z.array(z.string()).optional(),
  ratingLabel: z.string().optional(),
  chunkType: z.enum(["all", "overview", "fact_detail"]).default("all"),
  language: z.enum(SEARCH_LANGUAGE_CODES).default("auto"),
});

