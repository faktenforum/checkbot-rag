export default function errorHandler(
  error: { statusCode?: number; status?: number; message?: string },
  event: { res: { status?: number; statusText?: string; headers: Headers } }
) {
  const status = error.statusCode ?? error.status ?? 500;
  const message = status < 500 ? (error.message ?? "Bad request") : "Internal server error";
  if (status >= 500) {
    console.error("[App] Unhandled error:", error);
  }
  event.res.status = status;
  event.res.headers.set("Content-Type", "application/json");
  return { error: message };
}
