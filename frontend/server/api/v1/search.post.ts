import {
  AUTO_LANGUAGE_ERROR_MESSAGE,
  searchService,
} from "@checkbot/core";
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
  const { query, limit, categories, ratingLabel, chunkType, language, status, internal, enableFts, enableVec } =
    result.data;

  if (language === "auto") {
    setResponseStatus(event, 400);
    return { error: AUTO_LANGUAGE_ERROR_MESSAGE };
  }

  try {
    return await searchService.search({
      query,
      limit,
      categories,
      ratingLabel,
      chunkType,
      language,
      status,
      internal,
      enableFts,
      enableVec,
    });
  } catch (err) {
    setResponseStatus(event, 500);
    return { error: "Search failed", details: (err as Error).message };
  }
});
