import { userService } from "@checkbot/core";
import { UserListQuerySchema } from "../../../schemas/users";

export default defineEventHandler(async (event) => {
  assertPermission(event, "users:read");
  const query = getQuery(event);
  const parsed = UserListQuerySchema.safeParse(query);
  if (!parsed.success) {
    setResponseStatus(event, 400);
    return { error: "Validation error", details: parsed.error.flatten() };
  }
  return userService.list(parsed.data);
});
