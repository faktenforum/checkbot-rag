import { userService } from "@checkbot/core";

export default defineEventHandler(async (event) => {
  assertPermission(event, "users:write");

  const id = getRouterParam(event, "id");
  if (!id) {
    setResponseStatus(event, 400);
    return { error: "Missing id" };
  }

  const actor = actorFromEvent(event);

  try {
    await userService.delete(id, actor);
    setResponseStatus(event, 204);
    return null;
  } catch (err) {
    const message = (err as Error).message;
    if (message.includes("not found")) {
      setResponseStatus(event, 404);
      return { error: "User not found" };
    }
    if (message.toLowerCase().includes("env")) {
      setResponseStatus(event, 409);
      return { error: message };
    }
    setResponseStatus(event, 400);
    return { error: message };
  }
});
