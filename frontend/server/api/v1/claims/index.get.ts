import { z } from "zod";
import { claimsService } from "@checkbot/core";

const GetClaimsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  ratingLabel: z.string().optional(),
  category: z.string().optional(),
  status: z.string().optional(),
});

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const result = GetClaimsQuerySchema.safeParse(query);
  if (!result.success) {
    setResponseStatus(event, 400);
    return { error: "Validation error", details: result.error.flatten() };
  }
  const { page, limit, ratingLabel, category, status } = result.data;
  return claimsService.list({
    page,
    limit,
    ratingLabel,
    category,
    status,
  });
});
