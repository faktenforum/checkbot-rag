import { defineHandler } from "nitro/h3";
import { db } from "@checkbot/core";

export default defineHandler(async () => {
  try {
    await db.query("SELECT 1");
    return { status: "ok", db: "ok" };
  } catch {
    return { status: "degraded", db: "unreachable" };
  }
});
