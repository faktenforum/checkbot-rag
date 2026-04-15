import { authService } from "@checkbot/core";
import { defineEventHandler, getCookie } from "h3";

const SESSION_COOKIE = "checkbot_session";

export default defineEventHandler(async (event) => {
  const token = getCookie(event, SESSION_COOKIE);
  if (!token) return;

  const result = await authService.validateSession(token);
  if (!result) return;

  event.context.sessionUser = result.user;
  event.context.session = result.session;
});
