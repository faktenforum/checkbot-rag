import { db, userService } from "@checkbot/core";
import { defineEventHandler } from "h3";

let initialized = false;
let initPromise: Promise<void> | null = null;

// Paths that must respond even when the DB is unavailable. /metrics is used
// by Prometheus to alert *on* DB outages; /health deliberately reports the
// DB status without requiring it.
const DB_FREE_PATHS = new Set(["/metrics", "/health"]);

export default defineEventHandler(async (event) => {
  if (DB_FREE_PATHS.has(event.path)) return;
  if (initialized) return;
  if (!initPromise) {
    initPromise = db.initialize()
      .then(() => userService.bootstrapFromEnv())
      .then(() => {
        initialized = true;
      });
  }
  await initPromise;
});
