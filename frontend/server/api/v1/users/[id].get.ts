import { userService } from "@checkbot/core";

export default defineEventHandler(async (event) => {
  assertPermission(event, "users:read");
  const id = getRouterParam(event, "id");
  if (!id) {
    setResponseStatus(event, 400);
    return { error: "Missing id" };
  }
  const user = await userService.get(id);
  if (!user) {
    setResponseStatus(event, 404);
    return { error: "User not found" };
  }
  return user;
});
