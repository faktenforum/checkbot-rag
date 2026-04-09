import { apiKeyService, hasPermission } from "@checkbot/core";
import type { Actor } from "@checkbot/core";

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

  const actor: Actor = { type: "user", userId: requestUser.id, permissions: requestUser.permissions };
  await apiKeyService.revoke(id, actor);
  setResponseStatus(event, 204);
  return null;
});
