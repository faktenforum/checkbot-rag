import { describe, it, expect } from "bun:test";
import { CreateApiKeySchema, UpdateApiKeySchema, ApiKeyListQuerySchema } from "../apiKeys";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

describe("CreateApiKeySchema", () => {
  it("accepts a minimal valid key definition", () => {
    const result = CreateApiKeySchema.safeParse({
      userId: VALID_UUID,
      name: "test-key",
      permissions: ["search"],
    });
    expect(result.success).toBe(true);
  });

  it("accepts full key definition with rate limit and expiry", () => {
    const result = CreateApiKeySchema.safeParse({
      userId: VALID_UUID,
      name: "partner-key",
      description: "For partner X",
      permissions: ["search", "claims:read"],
      rateLimitPoints: 30,
      rateLimitDurationSec: 60,
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-UUID userId", () => {
    const result = CreateApiKeySchema.safeParse({
      userId: "not-a-uuid",
      name: "key",
      permissions: [],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("userId"))).toBe(true);
    }
  });

  it("rejects empty name", () => {
    const result = CreateApiKeySchema.safeParse({
      userId: VALID_UUID,
      name: "",
      permissions: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown permission strings", () => {
    const result = CreateApiKeySchema.safeParse({
      userId: VALID_UUID,
      name: "key",
      permissions: ["super:admin"],
    });
    expect(result.success).toBe(false);
  });

  it("accepts null expiresAt (no expiry)", () => {
    const result = CreateApiKeySchema.safeParse({
      userId: VALID_UUID,
      name: "no-expiry",
      permissions: [],
      expiresAt: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.expiresAt).toBeNull();
    }
  });

  it("rejects negative rate limit points", () => {
    const result = CreateApiKeySchema.safeParse({
      userId: VALID_UUID,
      name: "key",
      permissions: [],
      rateLimitPoints: -1,
    });
    expect(result.success).toBe(false);
  });

  it("accepts null rateLimitPoints (unlimited)", () => {
    const result = CreateApiKeySchema.safeParse({
      userId: VALID_UUID,
      name: "unlimited",
      permissions: [],
      rateLimitPoints: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rateLimitPoints).toBeNull();
    }
  });
});

describe("UpdateApiKeySchema", () => {
  it("accepts empty patch (no-op)", () => {
    expect(UpdateApiKeySchema.safeParse({}).success).toBe(true);
  });

  it("accepts partial update with only active flag", () => {
    expect(UpdateApiKeySchema.safeParse({ active: false }).success).toBe(true);
  });

  it("rejects invalid permission in patch", () => {
    const result = UpdateApiKeySchema.safeParse({ permissions: ["not:real"] });
    expect(result.success).toBe(false);
  });
});

describe("ApiKeyListQuerySchema", () => {
  it("applies defaults", () => {
    const result = ApiKeyListQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.offset).toBe(0);
      expect(result.data.limit).toBe(50);
      expect(result.data.includeInactive).toBe(false);
    }
  });

  it("accepts optional userId filter as UUID", () => {
    const result = ApiKeyListQuerySchema.safeParse({ userId: VALID_UUID });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.userId).toBe(VALID_UUID);
    }
  });

  it("rejects non-UUID userId", () => {
    const result = ApiKeyListQuerySchema.safeParse({ userId: "not-uuid" });
    expect(result.success).toBe(false);
  });
});
