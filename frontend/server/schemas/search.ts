import { CLAIM_STATUS_VALUES, SEARCH_LANGUAGE_CODES } from "@checkbot/core";
import { z } from "zod";

export const SearchRequestSchema = z.object({
  query: z.string(),
  limit: z.number().int().min(1).max(50).default(10),
  categories: z.array(z.string()).optional(),
  ratingLabel: z.string().optional(),
  chunkType: z.enum(["all", "overview", "fact_detail"]).default("all"),
  // default "de" so omitted language works; "auto" is not supported and returns 400
  language: z.enum(SEARCH_LANGUAGE_CODES).default("de"),
  // omit = all statuses
  status: z.enum(CLAIM_STATUS_VALUES).optional(),
  // omit = both; true = internal only; false = external only
  internal: z.boolean().optional(),
  // omit or true = FTS active
  enableFts: z.boolean().default(true),
  // omit or true = vector search active
  enableVec: z.boolean().default(true),
});

