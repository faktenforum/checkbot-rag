import { db } from "./DatabaseService.js";
import { auditLogService } from "./AuditLogService.js";
import { passwordService } from "../auth/passwordService.js";
import { actorSource, actorUserId } from "../utils/actor.js";
import { hashApiKey } from "../utils/keyHasher.js";
import { config } from "../config/index.js";
import type { Actor, User, UserType, UserSource, UserWithPasswordHash } from "../types/auth.js";

export interface CreateUserInput {
  userType: UserType;
  name: string;
  email?: string | null;
  password?: string;
  permissions: string[];
  source?: UserSource;
  envVarName?: string | null;
}

export interface UpdateUserInput {
  name?: string;
  email?: string | null;
  permissions?: string[];
  active?: boolean;
}

export interface UserListOptions {
  offset?: number;
  limit?: number;
  includeInactive?: boolean;
  userType?: UserType;
}

export interface PaginatedUsers {
  users: User[];
  total: number;
  offset: number;
  limit: number;
}

interface UserRow {
  id: string;
  user_type: UserType;
  name: string;
  email: string | null;
  password_hash: string | null;
  permissions: string[];
  source: UserSource;
  env_var_name: string | null;
  active: boolean;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
}

function rowToUser(row: UserRow): User {
  return {
    id: row.id,
    userType: row.user_type,
    name: row.name,
    email: row.email,
    permissions: row.permissions ?? [],
    source: row.source,
    envVarName: row.env_var_name,
    active: row.active,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
  };
}

function rowToUserWithHash(row: UserRow): UserWithPasswordHash {
  return { ...rowToUser(row), passwordHash: row.password_hash };
}

const USER_COLS = `id, user_type, name, email, password_hash, permissions,
  source, env_var_name, active, last_login_at, created_at, updated_at, created_by`;

export class UserService {
  async get(id: string): Promise<User | null> {
    const { rows } = await db.query<UserRow>(
      `SELECT ${USER_COLS} FROM users WHERE id = $1`,
      [id]
    );
    return rows[0] ? rowToUser(rows[0]) : null;
  }

  async getWithPasswordHash(id: string): Promise<UserWithPasswordHash | null> {
    const { rows } = await db.query<UserRow>(
      `SELECT ${USER_COLS} FROM users WHERE id = $1`,
      [id]
    );
    return rows[0] ? rowToUserWithHash(rows[0]) : null;
  }

  async getByEmail(email: string): Promise<UserWithPasswordHash | null> {
    const { rows } = await db.query<UserRow>(
      `SELECT ${USER_COLS} FROM users WHERE LOWER(email) = LOWER($1)`,
      [email]
    );
    return rows[0] ? rowToUserWithHash(rows[0]) : null;
  }

  async list(opts: UserListOptions = {}): Promise<PaginatedUsers> {
    const offset = opts.offset ?? 0;
    const limit = Math.min(opts.limit ?? 50, 500);

    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (!opts.includeInactive) {
      conditions.push(`active = true`);
    }
    if (opts.userType) {
      conditions.push(`user_type = $${idx++}`);
      params.push(opts.userType);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const [{ rows }, { rows: countRows }] = await Promise.all([
      db.query<UserRow>(
        `SELECT ${USER_COLS} FROM users ${where}
         ORDER BY user_type DESC, name ASC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, limit, offset]
      ),
      db.query<{ total: number }>(
        `SELECT COUNT(*)::int AS total FROM users ${where}`,
        params
      ),
    ]);

    return {
      users: rows.map(rowToUser),
      total: countRows[0]?.total ?? 0,
      offset,
      limit,
    };
  }

  async create(input: CreateUserInput, actor: Actor): Promise<User> {
    // Validate shape before hitting DB constraints so the error messages are useful
    if (input.userType === "human") {
      if (!input.email) throw new Error("Human users require an email");
      if (!input.password) throw new Error("Human users require a password");
    } else {
      if (input.password) {
        throw new Error("Service users cannot have a password");
      }
    }

    const passwordHash = input.password
      ? await passwordService.hash(input.password)
      : null;

    const source: UserSource = input.source ?? "manual";

    const { rows } = await db.query<UserRow>(
      `INSERT INTO users (user_type, name, email, password_hash, permissions, source, env_var_name, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING ${USER_COLS}`,
      [
        input.userType,
        input.name,
        input.email ?? null,
        passwordHash,
        input.permissions,
        source,
        input.envVarName ?? null,
        actorUserId(actor),
      ]
    );

    const user = rowToUser(rows[0]!);
    await auditLogService.log("user.create", {
      userId: actorUserId(actor),
      source: actorSource(actor),
      targetType: "user",
      targetId: user.id,
      metadata: {
        userType: user.userType,
        name: user.name,
        permissions: user.permissions,
        source: user.source,
      },
    });
    return user;
  }

  async update(id: string, patch: UpdateUserInput, actor: Actor): Promise<User> {
    const sets: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (patch.name !== undefined) {
      sets.push(`name = $${idx++}`);
      params.push(patch.name);
    }
    if (patch.email !== undefined) {
      sets.push(`email = $${idx++}`);
      params.push(patch.email);
    }
    if (patch.permissions !== undefined) {
      sets.push(`permissions = $${idx++}`);
      params.push(patch.permissions);
    }
    if (patch.active !== undefined) {
      sets.push(`active = $${idx++}`);
      params.push(patch.active);
    }

    if (sets.length === 0) {
      const existing = await this.get(id);
      if (!existing) throw new Error(`User ${id} not found`);
      return existing;
    }

    sets.push(`updated_at = NOW()`);
    params.push(id);

    const { rows } = await db.query<UserRow>(
      `UPDATE users SET ${sets.join(", ")} WHERE id = $${idx} RETURNING ${USER_COLS}`,
      params
    );
    if (!rows[0]) throw new Error(`User ${id} not found`);

    const user = rowToUser(rows[0]);
    await auditLogService.log("user.update", {
      userId: actorUserId(actor),
      source: actorSource(actor),
      targetType: "user",
      targetId: user.id,
      metadata: { patch },
    });
    return user;
  }

  async updatePassword(
    id: string,
    newPassword: string,
    actor: Actor
  ): Promise<void> {
    const hash = await passwordService.hash(newPassword);
    const { rowCount } = await db.query(
      `UPDATE users SET password_hash = $1, updated_at = NOW()
       WHERE id = $2 AND user_type = 'human'`,
      [hash, id]
    );
    if (!rowCount) {
      throw new Error(`Human user ${id} not found`);
    }
    // Invalidate all existing sessions after a password change. Covers the
    // "admin rotates my password because credentials leaked" case — without
    // this, a compromised session would survive the rotation.
    const { rowCount: sessionsKilled } = await db.query(
      `DELETE FROM sessions WHERE user_id = $1`,
      [id]
    );
    await auditLogService.log("user.password_reset", {
      userId: actorUserId(actor),
      source: actorSource(actor),
      targetType: "user",
      targetId: id,
      metadata: { sessionsInvalidated: sessionsKilled ?? 0 },
    });
  }

  async deactivate(id: string, actor: Actor): Promise<void> {
    const { rowCount } = await db.query(
      `UPDATE users SET active = false, updated_at = NOW() WHERE id = $1`,
      [id]
    );
    if (!rowCount) throw new Error(`User ${id} not found`);
    await auditLogService.log("user.deactivate", {
      userId: actorUserId(actor),
      source: actorSource(actor),
      targetType: "user",
      targetId: id,
    });
  }

  async delete(id: string, actor: Actor): Promise<void> {
    const { rows } = await db.query<{ source: UserSource }>(
      `SELECT source FROM users WHERE id = $1`,
      [id]
    );
    if (!rows[0]) throw new Error(`User ${id} not found`);
    if (rows[0].source === "env_bootstrap") {
      throw new Error(
        "Cannot delete env-bootstrapped user; remove the env var instead"
      );
    }
    await db.query(`DELETE FROM users WHERE id = $1`, [id]);
    await auditLogService.log("user.delete", {
      userId: actorUserId(actor),
      source: actorSource(actor),
      targetType: "user",
      targetId: id,
    });
  }

  async touchLastLogin(id: string): Promise<void> {
    await db.query(`UPDATE users SET last_login_at = NOW() WHERE id = $1`, [id]);
  }

  /**
   * Idempotent bootstrap of env-var defined users + keys. Safe to run on
   * every startup. See docs in .plan for the full behavior matrix.
   */
  async bootstrapFromEnv(): Promise<void> {
    await this.bootstrapAdmin();
    await this.bootstrapServiceUser({
      envVarName: "SEARCH_BOOTSTRAP_FAKTENFORUM_KEY",
      userName: "faktenforum",
      keyName: "faktenforum-bootstrap",
      permissions: ["claims:read", "claims:write", "search", "import"],
      rawKey: config.auth.bootstrap.faktenforumKey,
      rateLimitPoints: null,
    });
    await this.bootstrapServiceUser({
      envVarName: "SEARCH_BOOTSTRAP_MCP_KEY",
      userName: "mcp-agent",
      keyName: "mcp-bootstrap",
      permissions: ["mcp:use", "claims:read", "search"],
      rawKey: config.auth.bootstrap.mcpKey,
      rateLimitPoints: 60,
    });
  }

  private async bootstrapAdmin(): Promise<void> {
    const { adminEmail, adminPassword } = config.auth.bootstrap;
    const envVarName = "SEARCH_BOOTSTRAP_ADMIN_EMAIL";

    // Find existing bootstrapped admin by env_var_name (stable across email changes)
    const { rows } = await db.query<UserRow>(
      `SELECT ${USER_COLS} FROM users WHERE env_var_name = $1`,
      [envVarName]
    );
    const existing = rows[0];

    if (!adminEmail || !adminPassword) {
      if (existing && existing.active) {
        // Env vars removed → deactivate (but keep for audit)
        await db.query(
          `UPDATE users SET active = false, updated_at = NOW() WHERE id = $1`,
          [existing.id]
        );
        await auditLogService.log("bootstrap.admin_deactivated", {
          userId: null,
          source: "system",
          targetType: "user",
          targetId: existing.id,
        });
      }
      return;
    }

    const passwordHash = await passwordService.hash(adminPassword);

    if (!existing) {
      // Guard: only bootstrap the admin if no other human admin exists yet.
      // Prevents a re-added env var from silently creating a shadow admin.
      const { rows: anyAdmin } = await db.query<{ id: string }>(
        `SELECT id FROM users
         WHERE user_type = 'human' AND active = true AND 'admin' = ANY(permissions)
         LIMIT 1`
      );
      if (anyAdmin.length > 0) {
        console.warn(
          `[UserService] ${envVarName} set but another active admin exists; skipping bootstrap`
        );
        return;
      }
      const { rows: inserted } = await db.query<UserRow>(
        `INSERT INTO users (user_type, name, email, password_hash, permissions, source, env_var_name, active)
         VALUES ('human', 'Bootstrap Admin', $1, $2, ARRAY['admin'], 'env_bootstrap', $3, true)
         RETURNING ${USER_COLS}`,
        [adminEmail, passwordHash, envVarName]
      );
      await auditLogService.log("bootstrap.admin_created", {
        userId: null,
        source: "system",
        targetType: "user",
        targetId: inserted[0]!.id,
        metadata: { email: adminEmail },
      });
      return;
    }

    // Existing admin row - reconcile email, password, active state
    const needsUpdate =
      existing.email !== adminEmail ||
      existing.password_hash !== passwordHash ||
      !existing.active;
    if (needsUpdate) {
      await db.query(
        `UPDATE users
         SET email = $1, password_hash = $2, active = true, updated_at = NOW()
         WHERE id = $3`,
        [adminEmail, passwordHash, existing.id]
      );
      await auditLogService.log("bootstrap.admin_updated", {
        userId: null,
        source: "system",
        targetType: "user",
        targetId: existing.id,
      });
    }
  }

  private async bootstrapServiceUser(params: {
    envVarName: string;
    userName: string;
    keyName: string;
    permissions: string[];
    rawKey: string | undefined;
    rateLimitPoints: number | null;
  }): Promise<void> {
    const { envVarName, userName, keyName, permissions, rawKey, rateLimitPoints } =
      params;

    const { rows: existingUsers } = await db.query<UserRow>(
      `SELECT ${USER_COLS} FROM users WHERE env_var_name = $1`,
      [envVarName]
    );
    const existing = existingUsers[0];

    if (!rawKey) {
      if (existing && existing.active) {
        await db.query(
          `UPDATE users SET active = false, updated_at = NOW() WHERE id = $1`,
          [existing.id]
        );
        await db.query(
          `UPDATE api_keys SET active = false, updated_at = NOW() WHERE user_id = $1`,
          [existing.id]
        );
        await auditLogService.log("bootstrap.service_user_deactivated", {
          userId: null,
          source: "system",
          targetType: "user",
          targetId: existing.id,
          metadata: { envVarName },
        });
      }
      return;
    }

    const keyHash = hashApiKey(rawKey);
    // key_prefix is a display-only hint; for bootstrapped keys we use a
    // deterministic literal derived from the env var, not random bytes
    const keyPrefix = `env_${userName.slice(0, 4)}`;

    if (!existing) {
      const { rows: newUser } = await db.query<UserRow>(
        `INSERT INTO users (user_type, name, email, password_hash, permissions, source, env_var_name, active)
         VALUES ('service', $1, NULL, NULL, $2, 'env_bootstrap', $3, true)
         RETURNING ${USER_COLS}`,
        [userName, permissions, envVarName]
      );
      const userId = newUser[0]!.id;
      await db.query(
        `INSERT INTO api_keys (user_id, name, key_hash, key_prefix, permissions, rate_limit_points, rate_limit_duration_sec, active)
         VALUES ($1, $2, $3, $4, $5, $6, 60, true)`,
        [userId, keyName, keyHash, keyPrefix, permissions, rateLimitPoints]
      );
      await auditLogService.log("bootstrap.service_user_created", {
        userId: null,
        source: "system",
        targetType: "user",
        targetId: userId,
        metadata: { envVarName, userName, permissions },
      });
      return;
    }

    // Existing user - reconcile active state, permissions, and key hash
    const permsChanged =
      existing.permissions.length !== permissions.length ||
      !permissions.every((p) => existing.permissions.includes(p));

    if (!existing.active || permsChanged) {
      await db.query(
        `UPDATE users SET active = true, permissions = $1, updated_at = NOW() WHERE id = $2`,
        [permissions, existing.id]
      );
      await auditLogService.log("bootstrap.service_user_updated", {
        userId: null,
        source: "system",
        targetType: "user",
        targetId: existing.id,
        metadata: { envVarName, permissions },
      });
    }

    // Find the bootstrap key row (there should be exactly one per user)
    const { rows: keyRows } = await db.query<{
      id: string;
      key_hash: string;
      active: boolean;
      permissions: string[];
    }>(
      `SELECT id, key_hash, active, permissions FROM api_keys WHERE user_id = $1 AND name = $2`,
      [existing.id, keyName]
    );
    const existingKey = keyRows[0];

    if (!existingKey) {
      await db.query(
        `INSERT INTO api_keys (user_id, name, key_hash, key_prefix, permissions, rate_limit_points, rate_limit_duration_sec, active)
         VALUES ($1, $2, $3, $4, $5, $6, 60, true)`,
        [existing.id, keyName, keyHash, keyPrefix, permissions, rateLimitPoints]
      );
      return;
    }

    const keyPermsChanged =
      existingKey.permissions.length !== permissions.length ||
      !permissions.every((p) => existingKey.permissions.includes(p));

    if (
      existingKey.key_hash !== keyHash ||
      !existingKey.active ||
      keyPermsChanged
    ) {
      await db.query(
        `UPDATE api_keys
         SET key_hash = $1, active = true, permissions = $2, rate_limit_points = $3, updated_at = NOW()
         WHERE id = $4`,
        [keyHash, permissions, rateLimitPoints, existingKey.id]
      );
      await auditLogService.log("bootstrap.key_rotated", {
        userId: null,
        source: "system",
        targetType: "api_key",
        targetId: existingKey.id,
        metadata: { envVarName },
      });
    }
  }
}

export const userService = new UserService();
