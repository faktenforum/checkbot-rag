import { userService } from "@checkbot/core";
import { CreateUserSchema } from "../../../schemas/users";
import type { Actor } from "@checkbot/core";

export default defineEventHandler(async (event) => {
  assertPermission(event, "users:write");

  const user = event.context.user!;
  const actor: Actor = { type: "user", userId: user.id, permissions: user.permissions };

  const body = await readBody(event);
  const parsed = CreateUserSchema.safeParse(body);
  if (!parsed.success) {
    setResponseStatus(event, 400);
    return { error: "Validation error", details: parsed.error.flatten() };
  }

  try {
    const created = await userService.create(parsed.data, actor);
    setResponseStatus(event, 201);
    return created;
  } catch (err) {
    const message = (err as Error).message;
    if (message.includes("duplicate") || message.includes("unique")) {
      setResponseStatus(event, 409);
      return { error: "Email already in use" };
    }
    setResponseStatus(event, 400);
    return { error: message };
  }
});
