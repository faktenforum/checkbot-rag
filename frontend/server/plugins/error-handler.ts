import { send, setResponseHeader, setResponseStatus } from "h3";

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook("error", async (error, { event }) => {
    if (!event) return;
    const status = error.statusCode ?? (error as { status?: number }).status ?? 500;
    const message =
      status < 500 ? (error.message ?? "Bad request") : "Internal server error";
    if (status >= 500) {
      console.error("[App] Unhandled error:", error);
    }
    setResponseStatus(event, status);
    setResponseHeader(event, "Content-Type", "application/json");
    await send(event, JSON.stringify({ error: message }));
  });
});
