import { apiKeyService, hasPermission } from "@checkbot/core";
import { CreateApiKeySchema } from "../../../schemas/apiKeys";
import type { Actor } from "@checkbot/core";

export default defineEventHandler(async (event) => {
  const requestUser = event.context.user;
  if (!requestUser) {
    setResponseStatus(event, 401);
    return { error: "Unauthorized" };
  }

  const body = await readBody(event);
  const parsed = CreateApiKeySchema.safeParse(body);
  if (!parsed.success) {
    setResponseStatus(event, 400);
    return { error: "Validation error", details: parsed.error.flatten() };
  }

  // Non-admins can only create keys for themselves.
  const isAdmin = hasPermission(requestUser, "admin");
  if (!isAdmin && parsed.data.userId !== requestUser.id) {
    setResponseStatus(event, 403);
    return { error: "Cannot create keys for other users" };
  }

  const actor: Actor = {
    type: "user",
    userId: requestUser.id,
    permissions: event.context.effectivePermissions ?? requestUser.permissions,
  };

  try {
    const { record, rawKey } = await apiKeyService.create(parsed.data, actor);
    setResponseStatus(event, 201);
    return { record, rawKey };
  } catch (err) {
    const message = (err as Error).message;
    if (message.includes("subset")) {
      setResponseStatus(event, 403);
      return { error: message };
    }
    if (message.includes("not found") || message.includes("inactive")) {
      setResponseStatus(event, 400);
      return { error: message };
    }
    setResponseStatus(event, 400);
    return { error: message };
  }
});
