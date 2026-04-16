import { authService } from "@checkbot/core";
import { getRequestIP, setCookie } from "h3";
import { LoginSchema } from "../../../schemas/auth";
import { loginTotal } from "../../../utils/metrics";

const SESSION_COOKIE = "checkbot_session";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days max lifetime

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    setResponseStatus(event, 400);
    return { error: "Validation error", details: parsed.error.flatten() };
  }

  const { email, password } = parsed.data;
  const ip = getRequestIP(event);
  const userAgent = getHeader(event, "user-agent") ?? undefined;

  let result: Awaited<ReturnType<typeof authService.login>>;
  try {
    result = await authService.login(email, password, ip, userAgent);
  } catch {
    loginTotal.inc({ result: "failed" });
    setResponseStatus(event, 401);
    return { error: "Invalid email or password" };
  }

  setCookie(event, SESSION_COOKIE, result.sessionToken, {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });

  loginTotal.inc({ result: "success" });
  setResponseStatus(event, 200);
  return { user: result.user };
});
