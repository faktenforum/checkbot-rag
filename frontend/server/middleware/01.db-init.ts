import { db } from "@checkbot/core";

let initialized = false;
let initPromise: Promise<void> | null = null;

export default defineEventHandler(async () => {
  if (initialized) return;
  if (!initPromise) {
    initPromise = db.initialize().then(() => {
      initialized = true;
    });
  }
  await initPromise;
});
