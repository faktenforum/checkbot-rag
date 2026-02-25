import { db } from "@checkbot/core";

export default defineEventHandler(async () => {
  try {
    await db.query("SELECT 1");
    return { status: "ok", db: "ok" };
  } catch {
    return { status: "degraded", db: "unreachable" };
  }
});
