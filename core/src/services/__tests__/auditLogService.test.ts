import { describe, it, expect, beforeEach } from "bun:test";
import { resetAuthTables, db } from "./helpers/db";
import { auditLogService } from "../AuditLogService";

describe("AuditLogService (db)", () => {
  beforeEach(async () => {
    await resetAuthTables();
  });

  it("writes a row with all fields", async () => {
    const userResult = await db.query<{ id: string }>(
      `INSERT INTO users (user_type, name, email, password_hash, permissions)
       VALUES ('human', 'Test', 'test@example.com', 'x', ARRAY['admin']::text[])
       RETURNING id`
    );
    const userId = userResult.rows[0]!.id;

    await auditLogService.log("user.create", {
      userId,
      targetType: "user",
      targetId: userId,
      metadata: { foo: "bar" },
      ipAddress: "1.2.3.4",
    });

    const { entries } = await auditLogService.list({ userId });
    expect(entries).toHaveLength(1);
    expect(entries[0]!.action).toBe("user.create");
    expect(entries[0]!.targetType).toBe("user");
    expect(entries[0]!.targetId).toBe(userId);
    expect(entries[0]!.metadata).toEqual({ foo: "bar" });
    expect(entries[0]!.ipAddress).toBe("1.2.3.4");
  });

  it("writes a row with null userId (system action)", async () => {
    await auditLogService.log("bootstrap.admin_created", {
      metadata: { email: "boot@example.com" },
    });

    const { entries } = await auditLogService.list({ action: "bootstrap.admin_created" });
    expect(entries).toHaveLength(1);
    expect(entries[0]!.userId).toBeNull();
  });

  it("paginates list results with offset and limit", async () => {
    for (let i = 0; i < 10; i++) {
      await auditLogService.log("auth.login", { metadata: { n: i } });
    }

    const first = await auditLogService.list({}, { offset: 0, limit: 5 });
    expect(first.entries).toHaveLength(5);
    expect(first.total).toBe(10);

    const second = await auditLogService.list({}, { offset: 5, limit: 5 });
    expect(second.entries).toHaveLength(5);
    expect(first.entries[0]!.id).not.toBe(second.entries[0]!.id);
  });

  it("filters by action", async () => {
    await auditLogService.log("auth.login");
    await auditLogService.log("auth.logout");
    await auditLogService.log("auth.login");

    const loginOnly = await auditLogService.list({ action: "auth.login" });
    expect(loginOnly.entries).toHaveLength(2);
    expect(loginOnly.entries.every((e) => e.action === "auth.login")).toBe(true);
  });

  it("filters by targetType", async () => {
    await auditLogService.log("user.create", { targetType: "user", targetId: "00000000-0000-0000-0000-000000000001" });
    await auditLogService.log("api_key.create", { targetType: "api_key", targetId: "00000000-0000-0000-0000-000000000002" });

    const userOnly = await auditLogService.list({ targetType: "user" });
    expect(userOnly.entries).toHaveLength(1);
    expect(userOnly.entries[0]!.action).toBe("user.create");
  });

  it("filters by date range", async () => {
    await auditLogService.log("auth.login");
    const { rows } = await db.query<{ now: Date }>(`SELECT NOW() AS now`);
    const cutoff = new Date(rows[0]!.now.getTime() + 10);
    await new Promise((r) => setTimeout(r, 20));
    await auditLogService.log("auth.login");

    const after = await auditLogService.list({ from: cutoff });
    expect(after.entries).toHaveLength(1);
  });

  it("sets user_id to null on user delete (ON DELETE SET NULL)", async () => {
    const { rows } = await db.query<{ id: string }>(
      `INSERT INTO users (user_type, name, email, password_hash, permissions)
       VALUES ('human', 'Test', 'test@example.com', 'x', ARRAY['admin']::text[])
       RETURNING id`
    );
    const userId = rows[0]!.id;

    await auditLogService.log("auth.login", { userId });
    await db.query(`DELETE FROM users WHERE id = $1`, [userId]);

    const all = await auditLogService.list({ action: "auth.login" });
    expect(all.entries).toHaveLength(1);
    expect(all.entries[0]!.userId).toBeNull();
  });
});
