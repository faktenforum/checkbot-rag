import { searchService } from "@checkbot/core";
import { defineEventHandler, readBody, setResponseStatus } from "h3";
import { z } from "zod";
import { SearchRequestSchema } from "../../schemas/search";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const result = SearchRequestSchema.safeParse(body);
  if (!result.success) {
    setResponseStatus(event, 400);
    return { error: "Validation error", details: z.treeifyError(result.error) };
  }
  const { query, limit, categories, ratingLabel, chunkType } = result.data;
  return searchService.search({ query, limit, categories, ratingLabel, chunkType });
});
