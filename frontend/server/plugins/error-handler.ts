import { send, setResponseHeader, setResponseStatus } from "h3";
import { defineNitroPlugin } from "nitropack/runtime/internal/plugin";

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook("error", async (error, { event }) => {
    if (!event) return;
    const err = error as { statusCode?: number; status?: number; message?: string };
    const status = err.statusCode ?? err.status ?? 500;
    const message =
      status < 500 ? (err.message ?? "Bad request") : "Internal server error";
    if (status >= 500) {
      console.error("[App] Unhandled error:", error);
    }
    setResponseStatus(event, status);
    setResponseHeader(event, "Content-Type", "application/json");
    await send(event, JSON.stringify({ error: message }));
  });
});
