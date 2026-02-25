import { defineHandler } from "nitro/h3";
import { db } from "@checkbot/core";

let initialized = false;
let initPromise: Promise<void> | null = null;

export default defineHandler(async (event) => {
  if (initialized) return;
  if (!initPromise) {
    initPromise = db.initialize().then(() => {
      initialized = true;
    });
  }
  await initPromise;
});
