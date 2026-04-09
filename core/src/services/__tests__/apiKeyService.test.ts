import { describe, it, expect, beforeEach } from "bun:test";
import { resetAuthTables, db } from "./helpers/db";
import { userService } from "../UserService";
import { apiKeyService } from "../ApiKeyService";
import type { Actor, User } from "../../types/auth";

const SYSTEM_ACTOR: Actor = { type: "system" };

async function seedUser(
  overrides: { name?: string; permissions?: string[] } = {}
): Promise<User> {
  return userService.create(
    {
      userType: "service",
      name: overrides.name ?? "test-user",
      permissions: overrides.permissions ?? ["claims:read", "search", "import"],
    },
    SYSTEM_ACTOR
  );
}

describe("ApiKeyService", () => {
  beforeEach(async () => {
    await resetAuthTables();
    apiKeyService.clearCache();
  });

  describe("create", () => {
    it("generates a unique raw key each call", async () => {
      const user = await seedUser();
      const a = await apiKeyService.create(
        { userId: user.id, name: "a", permissions: ["search"] },
        SYSTEM_ACTOR
      );
      const b = await apiKeyService.create(
        { userId: user.id, name: "b", permissions: ["search"] },
        SYSTEM_ACTOR
      );
      expect(a.rawKey).not.toBe(b.rawKey);
      expect(a.record.keyPrefix).not.toBe(b.record.keyPrefix);
    });

    it("returns the raw key only from create (never readable again)", async () => {
      const user = await seedUser();
      const { record, rawKey } = await apiKeyService.create(
        { userId: user.id, name: "a", permissions: ["search"] },
        SYSTEM_ACTOR
      );
      expect(rawKey).toBeTruthy();

      // Subsequent reads via get() never include the raw key
      const fetched = await apiKeyService.get(record.id);
      expect(fetched).not.toBeNull();
      // The ApiKey type doesn't expose key_hash or raw key - only the prefix
      expect(Object.keys(fetched!)).not.toContain("keyHash");
      expect(Object.keys(fetched!)).not.toContain("rawKey");
    });

    it("rejects permissions not in the owner user's set", async () => {
      const user = await seedUser({ permissions: ["search"] });
      expect(
        apiKeyService.create(
          { userId: user.id, name: "bad", permissions: ["search", "import"] },
          SYSTEM_ACTOR
        )
      ).rejects.toThrow(/subset/i);
    });

    it("allows permissions equal to the owner user's set", async () => {
      const user = await seedUser({ permissions: ["search", "import"] });
      const { record } = await apiKeyService.create(
        { userId: user.id, name: "ok", permissions: ["search", "import"] },
        SYSTEM_ACTOR
      );
      expect(record.permissions.sort()).toEqual(["import", "search"]);
    });

    it("rejects when creator actor lacks the permissions being granted", async () => {
      const admin = await seedUser({ permissions: ["admin"] });
      const partnerActor: Actor = {
        type: "user",
        userId: admin.id,
        permissions: ["search"],
      };
      expect(
        apiKeyService.create(
          { userId: admin.id, name: "escalation", permissions: ["import"] },
          partnerActor
        )
      ).rejects.toThrow(/grant permissions/i);
    });

    it("admin actor can grant any permissions the owner holds", async () => {
      const partner = await seedUser({ permissions: ["search", "import"] });
      const adminActor: Actor = {
        type: "user",
        userId: partner.id, // unused - just need permissions
        permissions: ["admin"],
      };
      const { record } = await apiKeyService.create(
        { userId: partner.id, name: "ok", permissions: ["import"] },
        adminActor
      );
      expect(record.permissions).toEqual(["import"]);
    });

    it("rejects unknown user", async () => {
      expect(
        apiKeyService.create(
          {
            userId: "00000000-0000-0000-0000-000000000999",
            name: "bad",
            permissions: [],
          },
          SYSTEM_ACTOR
        )
      ).rejects.toThrow(/not found/i);
    });

    it("rejects inactive user", async () => {
      const user = await seedUser();
      await userService.deactivate(user.id, SYSTEM_ACTOR);
      expect(
        apiKeyService.create(
          { userId: user.id, name: "bad", permissions: ["search"] },
          SYSTEM_ACTOR
        )
      ).rejects.toThrow(/inactive/i);
    });
  });

  describe("validate", () => {
    it("returns key + user for a valid raw key", async () => {
      const user = await seedUser();
      const { rawKey } = await apiKeyService.create(
        { userId: user.id, name: "a", permissions: ["search"] },
        SYSTEM_ACTOR
      );
      const result = await apiKeyService.validate(rawKey);
      expect(result).not.toBeNull();
      expect(result!.key.userId).toBe(user.id);
      expect(result!.user.id).toBe(user.id);
      expect(result!.effectivePermissions).toEqual(["search"]);
    });

    it("returns null for an unknown key", async () => {
      const result = await apiKeyService.validate(
        "ffk_unknown1_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
      );
      expect(result).toBeNull();
    });

    it("returns null for a revoked key", async () => {
      const user = await seedUser();
      const { rawKey, record } = await apiKeyService.create(
        { userId: user.id, name: "a", permissions: ["search"] },
        SYSTEM_ACTOR
      );
      await apiKeyService.revoke(record.id, SYSTEM_ACTOR);
      const result = await apiKeyService.validate(rawKey);
      expect(result).toBeNull();
    });

    it("returns null for an expired key", async () => {
      const user = await seedUser();
      const { rawKey, record } = await apiKeyService.create(
        {
          userId: user.id,
          name: "a",
          permissions: ["search"],
          expiresAt: new Date(Date.now() - 1000),
        },
        SYSTEM_ACTOR
      );
      expect(record.expiresAt).not.toBeNull();
      const result = await apiKeyService.validate(rawKey);
      expect(result).toBeNull();
    });

    it("returns null when the owner user is inactive", async () => {
      const user = await seedUser();
      const { rawKey } = await apiKeyService.create(
        { userId: user.id, name: "a", permissions: ["search"] },
        SYSTEM_ACTOR
      );
      await userService.deactivate(user.id, SYSTEM_ACTOR);
      apiKeyService.clearCache();
      const result = await apiKeyService.validate(rawKey);
      expect(result).toBeNull();
    });

    it("effective permissions are user ∩ key", async () => {
      // Owner had broader permissions, key was created with subset
      const user = await seedUser({
        permissions: ["search", "import", "claims:read"],
      });
      const { rawKey } = await apiKeyService.create(
        { userId: user.id, name: "limited", permissions: ["search"] },
        SYSTEM_ACTOR
      );
      const result = await apiKeyService.validate(rawKey);
      expect(result!.effectivePermissions).toEqual(["search"]);
    });

    it("effective permissions shrink if owner loses a permission", async () => {
      const user = await seedUser({ permissions: ["search", "import"] });
      const { rawKey } = await apiKeyService.create(
        { userId: user.id, name: "a", permissions: ["search", "import"] },
        SYSTEM_ACTOR
      );
      // Owner loses import
      await userService.update(user.id, { permissions: ["search"] }, SYSTEM_ACTOR);
      apiKeyService.clearCache();

      const result = await apiKeyService.validate(rawKey);
      expect(result!.effectivePermissions).toEqual(["search"]);
    });

    it("cache returns the same result without hitting DB", async () => {
      const user = await seedUser();
      const { rawKey } = await apiKeyService.create(
        { userId: user.id, name: "a", permissions: ["search"] },
        SYSTEM_ACTOR
      );

      // Warm cache
      await apiKeyService.validate(rawKey);

      // Revoke in DB bypassing the service → cache still says valid
      await db.query(`UPDATE api_keys SET active = false`);
      const stillValid = await apiKeyService.validate(rawKey);
      expect(stillValid).not.toBeNull();

      // After clearCache the fresh DB state wins
      apiKeyService.clearCache();
      const fresh = await apiKeyService.validate(rawKey);
      expect(fresh).toBeNull();
    });

    it("cache is invalidated when the key is revoked via the service", async () => {
      const user = await seedUser();
      const { rawKey, record } = await apiKeyService.create(
        { userId: user.id, name: "a", permissions: ["search"] },
        SYSTEM_ACTOR
      );
      await apiKeyService.validate(rawKey);
      await apiKeyService.revoke(record.id, SYSTEM_ACTOR);
      const result = await apiKeyService.validate(rawKey);
      expect(result).toBeNull();
    });

    it("cache is invalidated when the key is updated via the service", async () => {
      const user = await seedUser();
      const { rawKey, record } = await apiKeyService.create(
        { userId: user.id, name: "a", permissions: ["search", "import"] },
        SYSTEM_ACTOR
      );
      await apiKeyService.validate(rawKey);
      await apiKeyService.update(
        record.id,
        { permissions: ["search"] },
        SYSTEM_ACTOR
      );
      const result = await apiKeyService.validate(rawKey);
      expect(result!.effectivePermissions).toEqual(["search"]);
    });
  });

  describe("update", () => {
    it("enforces subset against current owner permissions", async () => {
      const user = await seedUser({ permissions: ["search"] });
      const { record } = await apiKeyService.create(
        { userId: user.id, name: "a", permissions: ["search"] },
        SYSTEM_ACTOR
      );
      expect(
        apiKeyService.update(
          record.id,
          { permissions: ["search", "import"] },
          SYSTEM_ACTOR
        )
      ).rejects.toThrow(/subset/i);
    });

    it("updates rate limit fields", async () => {
      const user = await seedUser();
      const { record } = await apiKeyService.create(
        { userId: user.id, name: "a", permissions: ["search"] },
        SYSTEM_ACTOR
      );
      const updated = await apiKeyService.update(
        record.id,
        { rateLimitPoints: 100, rateLimitDurationSec: 120 },
        SYSTEM_ACTOR
      );
      expect(updated.rateLimitPoints).toBe(100);
      expect(updated.rateLimitDurationSec).toBe(120);
    });

    it("can clear expires_at by setting it to null", async () => {
      const user = await seedUser();
      const { record } = await apiKeyService.create(
        {
          userId: user.id,
          name: "a",
          permissions: ["search"],
          expiresAt: new Date(Date.now() + 86400_000),
        },
        SYSTEM_ACTOR
      );
      const cleared = await apiKeyService.update(
        record.id,
        { expiresAt: null },
        SYSTEM_ACTOR
      );
      expect(cleared.expiresAt).toBeNull();
    });
  });

  describe("list", () => {
    it("filters by userId", async () => {
      const a = await seedUser({ name: "a" });
      const b = await seedUser({ name: "b" });
      await apiKeyService.create(
        { userId: a.id, name: "k1", permissions: ["search"] },
        SYSTEM_ACTOR
      );
      await apiKeyService.create(
        { userId: a.id, name: "k2", permissions: ["search"] },
        SYSTEM_ACTOR
      );
      await apiKeyService.create(
        { userId: b.id, name: "k3", permissions: ["search"] },
        SYSTEM_ACTOR
      );

      const aKeys = await apiKeyService.list({ userId: a.id });
      expect(aKeys.keys).toHaveLength(2);
      const bKeys = await apiKeyService.list({ userId: b.id });
      expect(bKeys.keys).toHaveLength(1);
    });

    it("excludes inactive keys by default", async () => {
      const user = await seedUser();
      const { record } = await apiKeyService.create(
        { userId: user.id, name: "k", permissions: ["search"] },
        SYSTEM_ACTOR
      );
      await apiKeyService.revoke(record.id, SYSTEM_ACTOR);

      const active = await apiKeyService.list();
      expect(active.keys).toHaveLength(0);
      const all = await apiKeyService.list({ includeInactive: true });
      expect(all.keys).toHaveLength(1);
    });
  });

  describe("touchLastUsed", () => {
    it("updates last_used_at", async () => {
      const user = await seedUser();
      const { record } = await apiKeyService.create(
        { userId: user.id, name: "a", permissions: ["search"] },
        SYSTEM_ACTOR
      );
      expect(record.lastUsedAt).toBeNull();

      await apiKeyService.touchLastUsed(record.id);
      const refreshed = await apiKeyService.get(record.id);
      expect(refreshed?.lastUsedAt).not.toBeNull();
    });
  });
});
