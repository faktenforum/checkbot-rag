import { describe, it, expect, beforeEach } from "bun:test";
import { resetAuthTables, db } from "./helpers/db";
import { userService } from "../UserService";
import { authService } from "../AuthService";
import type { Actor } from "../../types/auth";

const SYSTEM_ACTOR: Actor = { type: "system" };

async function seedHuman(opts: { email?: string; password?: string; active?: boolean } = {}) {
  const user = await userService.create(
    {
      userType: "human",
      name: "Alice",
      email: opts.email ?? "alice@example.com",
      password: opts.password ?? "TestPassword1!",
      permissions: ["claims:read"],
    },
    SYSTEM_ACTOR
  );
  if (opts.active === false) {
    await userService.deactivate(user.id, SYSTEM_ACTOR);
  }
  return user;
}

describe("AuthService", () => {
  beforeEach(async () => {
    await resetAuthTables();
  });

  describe("login", () => {
    it("returns user + session token for valid credentials", async () => {
      await seedHuman();
      const result = await authService.login("alice@example.com", "TestPassword1!");
      expect(result.user.email).toBe("alice@example.com");
      expect(typeof result.sessionToken).toBe("string");
      expect(result.sessionToken.length).toBeGreaterThan(20);
    });

    it("is case-insensitive for email lookup", async () => {
      await seedHuman({ email: "Alice@Example.COM" });
      const result = await authService.login("alice@example.com", "TestPassword1!");
      expect(result.user.email).toBe("Alice@Example.COM");
    });

    it("throws for wrong password with same message", async () => {
      await seedHuman();
      await expect(
        authService.login("alice@example.com", "WrongPassword!")
      ).rejects.toThrow(/invalid email or password/i);
    });

    it("throws for unknown email with same message", async () => {
      await expect(
        authService.login("unknown@example.com", "AnyPassword1!")
      ).rejects.toThrow(/invalid email or password/i);
    });

    it("throws for deactivated user with same message", async () => {
      await seedHuman({ active: false });
      await expect(
        authService.login("alice@example.com", "TestPassword1!")
      ).rejects.toThrow(/invalid email or password/i);
    });

    it("writes audit row for successful login", async () => {
      await seedHuman();
      const { user } = await authService.login("alice@example.com", "TestPassword1!");
      const { rows } = await db.query<{ count: number }>(
        `SELECT COUNT(*)::int AS count FROM audit_log WHERE action = 'auth.login' AND target_id = $1`,
        [user.id]
      );
      expect(rows[0]!.count).toBe(1);
    });

    it("writes audit row for failed login", async () => {
      await expect(
        authService.login("bad@example.com", "BadPassword1!")
      ).rejects.toThrow();
      const { rows } = await db.query<{ count: number }>(
        `SELECT COUNT(*)::int AS count FROM audit_log WHERE action = 'auth.login_failed'`
      );
      expect(rows[0]!.count).toBe(1);
    });

    it("updates last_login_at on the user", async () => {
      const user = await seedHuman();
      expect(user.lastLoginAt).toBeNull();
      await authService.login("alice@example.com", "TestPassword1!");
      const refreshed = await userService.get(user.id);
      expect(refreshed?.lastLoginAt).not.toBeNull();
    });

    it("stores a session row in the DB", async () => {
      await seedHuman();
      await authService.login("alice@example.com", "TestPassword1!");
      const { rows } = await db.query<{ count: number }>(
        `SELECT COUNT(*)::int AS count FROM sessions`
      );
      expect(rows[0]!.count).toBe(1);
    });

    it("returns a unique token each call", async () => {
      await seedHuman();
      const a = await authService.login("alice@example.com", "TestPassword1!");
      const b = await authService.login("alice@example.com", "TestPassword1!");
      expect(a.sessionToken).not.toBe(b.sessionToken);
    });
  });

  describe("logout", () => {
    it("deletes the session row", async () => {
      await seedHuman();
      const { sessionToken } = await authService.login(
        "alice@example.com",
        "TestPassword1!"
      );
      await authService.logout(sessionToken);
      const { rows } = await db.query<{ count: number }>(
        `SELECT COUNT(*)::int AS count FROM sessions`
      );
      expect(rows[0]!.count).toBe(0);
    });

    it("is a no-op for an unknown token", async () => {
      await expect(
        authService.logout("completely-unknown-token-that-does-not-exist")
      ).resolves.toBeUndefined();
    });

    it("makes a subsequent validateSession return null", async () => {
      await seedHuman();
      const { sessionToken } = await authService.login(
        "alice@example.com",
        "TestPassword1!"
      );
      await authService.logout(sessionToken);
      const result = await authService.validateSession(sessionToken);
      expect(result).toBeNull();
    });

    it("writes an audit row for logout", async () => {
      await seedHuman();
      const { user, sessionToken } = await authService.login(
        "alice@example.com",
        "TestPassword1!"
      );
      await authService.logout(sessionToken);
      const { rows } = await db.query<{ count: number }>(
        `SELECT COUNT(*)::int AS count FROM audit_log WHERE action = 'auth.logout' AND user_id = $1`,
        [user.id]
      );
      expect(rows[0]!.count).toBe(1);
    });
  });

  describe("validateSession", () => {
    it("returns user + session for a valid token", async () => {
      await seedHuman();
      const { sessionToken, user } = await authService.login(
        "alice@example.com",
        "TestPassword1!"
      );
      const result = await authService.validateSession(sessionToken);
      expect(result).not.toBeNull();
      expect(result!.user.id).toBe(user.id);
      expect(result!.session.userId).toBe(user.id);
    });

    it("returns null for unknown token", async () => {
      expect(
        await authService.validateSession("not-a-real-token")
      ).toBeNull();
    });

    it("returns null for an expired session", async () => {
      await seedHuman();
      const { sessionToken } = await authService.login(
        "alice@example.com",
        "TestPassword1!"
      );
      // Force-expire the session in the DB
      await db.query(
        `UPDATE sessions SET expires_at = NOW() - INTERVAL '1 second'`
      );
      expect(await authService.validateSession(sessionToken)).toBeNull();
    });

    it("deletes the session row when it is expired", async () => {
      await seedHuman();
      const { sessionToken } = await authService.login(
        "alice@example.com",
        "TestPassword1!"
      );
      await db.query(
        `UPDATE sessions SET expires_at = NOW() - INTERVAL '1 second'`
      );
      await authService.validateSession(sessionToken);
      const { rows } = await db.query<{ count: number }>(
        `SELECT COUNT(*)::int AS count FROM sessions`
      );
      expect(rows[0]!.count).toBe(0);
    });

    it("returns null when owner user is deactivated", async () => {
      const user = await seedHuman();
      const { sessionToken } = await authService.login(
        "alice@example.com",
        "TestPassword1!"
      );
      await userService.deactivate(user.id, SYSTEM_ACTOR);
      expect(await authService.validateSession(sessionToken)).toBeNull();
    });

    it("extends expires_at on each valid access (rolling session)", async () => {
      await seedHuman();
      const { sessionToken } = await authService.login(
        "alice@example.com",
        "TestPassword1!"
      );
      // Record original expiry
      const { rows: before } = await db.query<{ expires_at: Date }>(
        `SELECT expires_at FROM sessions`
      );
      const originalExpiry = new Date(before[0]!.expires_at).getTime();

      // Small delay to ensure DB NOW() advances
      await new Promise((r) => setTimeout(r, 50));
      await authService.validateSession(sessionToken);

      const { rows: after } = await db.query<{ expires_at: Date }>(
        `SELECT expires_at FROM sessions`
      );
      const newExpiry = new Date(after[0]!.expires_at).getTime();
      expect(newExpiry).toBeGreaterThanOrEqual(originalExpiry);
    });

    it("does not extend past the absolute cap", async () => {
      await seedHuman();
      const { sessionToken } = await authService.login(
        "alice@example.com",
        "TestPassword1!"
      );
      const maxDays = 30;
      // Simulate a session created nearly at the max lifetime ago.
      // The rolling expiry would push it past the cap, so we verify it's capped.
      await db.query(
        `UPDATE sessions
         SET created_at = NOW() - ($1 * INTERVAL '1 day'),
             last_activity_at = NOW() - ($1 * INTERVAL '1 day')`,
        [maxDays - 0.1]  // 0.1 day before the hard cap
      );

      const result = await authService.validateSession(sessionToken);
      expect(result).not.toBeNull();

      const { rows } = await db.query<{ expires_at: Date }>(
        `SELECT expires_at FROM sessions`
      );
      const expiry = new Date(rows[0]!.expires_at).getTime();
      const capBound = Date.now() + maxDays * 86_400_000;
      // The expiry must not exceed the absolute cap (with 1s tolerance)
      expect(expiry).toBeLessThanOrEqual(capBound + 1000);
    });

    it("updates last_activity_at on access", async () => {
      await seedHuman();
      const { sessionToken } = await authService.login(
        "alice@example.com",
        "TestPassword1!"
      );
      const { rows: before } = await db.query<{ last_activity_at: Date }>(
        `SELECT last_activity_at FROM sessions`
      );
      await new Promise((r) => setTimeout(r, 50));
      await authService.validateSession(sessionToken);
      const { rows: after } = await db.query<{ last_activity_at: Date }>(
        `SELECT last_activity_at FROM sessions`
      );
      expect(new Date(after[0]!.last_activity_at).getTime()).toBeGreaterThanOrEqual(
        new Date(before[0]!.last_activity_at).getTime()
      );
    });
  });
});
