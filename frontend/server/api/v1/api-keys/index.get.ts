import { apiKeyService, hasPermission } from "@checkbot/core";
import { ApiKeyListQuerySchema } from "../../../schemas/apiKeys";

export default defineEventHandler(async (event) => {
  // Any authenticated user can list their own keys.
  // Admins and users with api_keys:read_all can list all keys or filter by userId.
  const requestUser = event.context.user;
  if (!requestUser) {
    setResponseStatus(event, 401);
    return { error: "Unauthorized" };
  }

  const query = getQuery(event);
  const parsed = ApiKeyListQuerySchema.safeParse(query);
  if (!parsed.success) {
    setResponseStatus(event, 400);
    return { error: "Validation error", details: parsed.error.flatten() };
  }

  const { offset, limit, userId, includeInactive } = parsed.data;

  const canReadAll = hasPermission(requestUser, "api_keys:read_all");
  const effectiveUserId = canReadAll ? userId : requestUser.id;

  return apiKeyService.list({ offset, limit, userId: effectiveUserId, includeInactive });
});
