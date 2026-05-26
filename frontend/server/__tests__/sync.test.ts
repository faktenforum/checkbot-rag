import { describe, it, expect, mock, beforeEach, afterEach, spyOn } from "bun:test";

describe("POST /api/v1/sync - schema and config validation", () => {
  it("validates language defaults to 'de'", async () => {
    const { IMPORT_LANGUAGE_CODES } = await import("@search/core");
    const { z } = await import("zod");

    const SyncSchema = z.object({
      language: z.enum(IMPORT_LANGUAGE_CODES).default("de")
    });

    const result = SyncSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.language).toBe("de");
    }
  });

  it("rejects invalid language codes", async () => {
    const { IMPORT_LANGUAGE_CODES } = await import("@search/core");
    const { z } = await import("zod");

    const SyncSchema = z.object({
      language: z.enum(IMPORT_LANGUAGE_CODES).default("de")
    });

    const result = SyncSchema.safeParse({ language: "zz" });
    expect(result.success).toBe(false);
  });

  it("config has faktenforum section", async () => {
    const { config } = await import("@search/core");

    // faktenforum config key should exist (values depend on env)
    expect(typeof config).toBe("object");
    // @ts-expect-error - config type might not include faktenforum yet at import time
    expect("faktenforum" in config).toBe(true);
  });
});
