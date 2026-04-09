import { userService } from "@checkbot/core";
import { UpdateUserSchema } from "../../../schemas/users";
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

  const body = await readBody(event);
  const parsed = UpdateUserSchema.safeParse(body);
  if (!parsed.success) {
    setResponseStatus(event, 400);
    return { error: "Validation error", details: parsed.error.flatten() };
  }

  try {
    return await userService.update(id, parsed.data, actor);
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
