import { claimsService } from "@search/core";
import { GetClaimsQuerySchema } from "../../../schemas/claims";

export default defineEventHandler(async (event) => {
  assertPermission(event, "claims:read");
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
