import { apiKeyService, hasPermission } from "@search/core";

export default defineEventHandler(async (event) => {
  const requestUser = event.context.user;
  if (!requestUser) {
    setResponseStatus(event, 401);
    return { error: "Unauthorized" };
  }

  const id = getRouterParam(event, "id");
  if (!id) {
    setResponseStatus(event, 400);
    return { error: "Missing id" };
  }

  const key = await apiKeyService.get(id);
  if (!key) {
    setResponseStatus(event, 404);
    return { error: "API key not found" };
  }

  // Non-admin users can only read their own keys.
  const canReadAll = hasPermission(requestUser, "api_keys:read_all");
  if (!canReadAll && key.userId !== requestUser.id) {
    setResponseStatus(event, 403);
    return { error: "Forbidden" };
  }

  return key;
});
