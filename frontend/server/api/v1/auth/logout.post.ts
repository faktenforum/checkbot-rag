import { authService } from "@search/core";
import { getCookie, deleteCookie, getRequestIP } from "h3";

const SESSION_COOKIE = "search_session";

export default defineEventHandler(async (event) => {
  const token = getCookie(event, SESSION_COOKIE);
  if (token) {
    const ip = getRequestIP(event);
    await authService.logout(token, ip);
  }
  deleteCookie(event, SESSION_COOKIE, { path: "/" });
  setResponseStatus(event, 204);
  return null;
});
