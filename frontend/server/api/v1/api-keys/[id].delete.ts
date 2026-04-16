import { apiKeyService, hasPermission } from "@checkbot/core";

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

  const existing = await apiKeyService.get(id);
  if (!existing) {
    setResponseStatus(event, 404);
    return { error: "API key not found" };
  }
  const canReadAll = hasPermission(requestUser, "api_keys:read_all");
  if (!canReadAll && existing.userId !== requestUser.id) {
    setResponseStatus(event, 403);
    return { error: "Forbidden" };
  }

  await apiKeyService.delete(id, actorFromEvent(event));
  setResponseStatus(event, 204);
  return null;
});
