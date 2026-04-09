import { apiKeyService, hasPermission } from "@checkbot/core";
import { UpdateApiKeySchema } from "../../../schemas/apiKeys";
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

  // Check ownership before mutation
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

  const body = await readBody(event);
  const parsed = UpdateApiKeySchema.safeParse(body);
  if (!parsed.success) {
    setResponseStatus(event, 400);
    return { error: "Validation error", details: parsed.error.flatten() };
  }

  const actor: Actor = {
    type: "user",
    userId: requestUser.id,
    permissions: event.context.effectivePermissions ?? requestUser.permissions,
  };

  try {
    return await apiKeyService.update(id, parsed.data, actor);
  } catch (err) {
    const message = (err as Error).message;
    setResponseStatus(event, 400);
    return { error: message };
  }
});
