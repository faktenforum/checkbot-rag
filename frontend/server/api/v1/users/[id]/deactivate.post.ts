import { userService } from "@checkbot/core";
import type { Actor } from "@checkbot/core";

export default defineEventHandler(async (event) => {
  assertPermission(event, "users:write");

  const id = getRouterParam(event, "id");
  if (!id) {
    setResponseStatus(event, 400);
    return { error: "Missing id" };
  }

  const user = event.context.user!;
  const actor: Actor = { type: "user", userId: user.id, permissions: user.permissions };

  try {
    await userService.deactivate(id, actor);
    setResponseStatus(event, 204);
    return null;
  } catch (err) {
    const message = (err as Error).message;
    if (message.includes("not found")) {
      setResponseStatus(event, 404);
      return { error: "User not found" };
    }
    setResponseStatus(event, 400);
    return { error: message };
  }
});
