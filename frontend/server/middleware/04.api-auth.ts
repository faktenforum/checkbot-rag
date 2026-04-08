import { config } from "@checkbot/core";
import { defineEventHandler, getHeader, setResponseStatus, setResponseHeader } from "h3";

export default defineEventHandler((event) => {
  if (!event.path.startsWith("/api/")) return;
  const expected = config.apiKey;
  if (!expected) return;

  // Allow same-origin browser requests so the built-in admin UI keeps working
  // when an API key is configured. `Sec-Fetch-Site` is a forbidden request
  // header (browsers set it, JS cannot override it), so this only matches
  // fetches initiated by pages served from this same origin — i.e. our own
  // admin UI. External integrations (curl, other services) either omit the
  // header or send "none"/"cross-site" and must present a Bearer token.
  const secFetchSite = getHeader(event, "sec-fetch-site");
  if (secFetchSite === "same-origin") return;

  const auth = getHeader(event, "authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : "";
  if (token !== expected) {
    setResponseStatus(event, 401);
    setResponseHeader(event, "Content-Type", "application/json");
    return { error: "Unauthorized" };
  }
});
