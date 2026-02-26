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
  const { query, limit, categories, ratingLabel, chunkType, language } =
    result.data;
  try {
    return await searchService.search({
      query,
      limit,
      categories,
      ratingLabel,
      chunkType,
      language,
    });
  } catch (err) {
    const message = (err as Error).message;
    if (language === "auto" && message.includes(AUTO_LANGUAGE_ERROR_MESSAGE)) {
      setResponseStatus(event, 400);
      return { error: AUTO_LANGUAGE_ERROR_MESSAGE };
    }
    setResponseStatus(event, 500);
    return { error: "Search failed", details: message };
  }
});
