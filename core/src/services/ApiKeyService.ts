import { db } from "./DatabaseService.js";
import { auditLogService } from "./AuditLogService.js";
import { actorSource, actorUserId } from "../utils/actor.js";
import { generateApiKey } from "../utils/keyGenerator.js";
import { hashApiKey } from "../utils/keyHasher.js";
import {
  intersectPermissions,
  isPermissionSubset,
} from "../auth/permissions.js";
import type {
  Actor,
  ApiKey,
  AuthenticatedApiKey,
  User,
} from "../types/auth.js";

export interface CreateApiKeyInput {
  userId: string;
  name: string;
  description?: string | null;
  permissions: string[];
  rateLimitPoints?: number | null;
  rateLimitDurationSec?: number;
  expiresAt?: Date | null;
}

export interface UpdateApiKeyInput {
  name?: string;
  description?: string | null;
  permissions?: string[];
  rateLimitPoints?: number | null;
  rateLimitDurationSec?: number;
  expiresAt?: Date | null;
  active?: boolean;
}

export interface ApiKeyListOptions {
  offset?: number;
  limit?: number;
  userId?: string;
  includeInactive?: boolean;
}

export interface PaginatedApiKeys {
  keys: ApiKey[];
  total: number;
  offset: number;
  limit: number;
}

export interface CreateResult {
  record: ApiKey;
  rawKey: string;
}

interface ApiKeyRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  key_hash: string;
  key_prefix: string;
  permissions: string[];
  rate_limit_points: number | null;
  rate_limit_duration_sec: number;
  active: boolean;
  expires_at: Date | null;
  last_used_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface UserRow {
  id: string;
  user_type: "human" | "service";
  name: string;
  email: string | null;
  permissions: string[];
  source: "manual" | "env_bootstrap";
  env_var_name: string | null;
  active: boolean;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
}

function rowToApiKey(row: ApiKeyRow): ApiKey {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    keyPrefix: row.key_prefix,
    permissions: row.permissions ?? [],
    rateLimitPoints: row.rate_limit_points,
    rateLimitDurationSec: row.rate_limit_duration_sec,
    active: row.active,
    expiresAt: row.expires_at,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
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

const API_KEY_COLS = `id, user_id, name, description, key_hash, key_prefix, permissions,
  rate_limit_points, rate_limit_duration_sec, active, expires_at,
  last_used_at, created_at, updated_at`;

function toDate(v: unknown): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  return new Date(v as string);
}

function coerceKeyDates(row: ApiKeyRow): ApiKeyRow {
  return {
    ...row,
    expires_at: toDate(row.expires_at),
    last_used_at: toDate(row.last_used_at),
    created_at: toDate(row.created_at) as Date,
    updated_at: toDate(row.updated_at) as Date,
  };
}

function coerceUserDates(row: UserRow): UserRow {
  return {
    ...row,
    last_login_at: toDate(row.last_login_at),
    created_at: toDate(row.created_at) as Date,
    updated_at: toDate(row.updated_at) as Date,
  };
}

function actorPermissions(actor: Actor): string[] {
  return actor && actor.type === "user" ? actor.permissions : [];
}

/**
 * Simple TTL cache entry for ApiKeyService.validate lookups.
 */
interface CacheEntry {
  authenticatedKey: AuthenticatedApiKey;
  expiresAt: number;
}

// Short TTL so revocation via API propagates quickly without depending on
// cache invalidation. update/revoke/delete call invalidateById() to zero
// the entry immediately on THIS instance; the TTL bounds how long a stale
// entry lingers on OTHER instances if we ever run multi-replica (no cache
// coordination today, so replicas are independent).
const CACHE_TTL_MS = 5_000;

export class ApiKeyService {
  private cache = new Map<string, CacheEntry>();

  /**
   * Validate a raw API key. Returns null if the key is unknown, inactive,
   * expired, or owned by an inactive user. The returned object carries the
   * effective permissions (user ∩ key) for downstream authz.
   *
   * Results are cached in-memory for 5s to keep the hot path cheap.
   * Cache is invalidated on update/revoke/delete of the same key so revocation
   * takes effect immediately on the instance that processed it.
   */
  async validate(rawKey: string): Promise<AuthenticatedApiKey | null> {
    const keyHash = hashApiKey(rawKey);
    const now = Date.now();

    const cached = this.cache.get(keyHash);
    if (cached && cached.expiresAt > now) {
      return cached.authenticatedKey;
    }
    if (cached) this.cache.delete(keyHash);

    // Use row_to_json to cleanly separate key and user columns despite the
    // overlapping column names (both tables have id, permissions, etc.)
    const { rows: pair } = await db.query<{ key: ApiKeyRow; user: UserRow }>(
      `SELECT row_to_json(k)::jsonb AS key, row_to_json(u)::jsonb AS user
       FROM api_keys k
       INNER JOIN users u ON u.id = k.user_id
       WHERE k.key_hash = $1`,
      [keyHash]
    );
    const combined = pair[0];
    if (!combined) return null;

    // Postgres returns JSONB columns as strings via pg's default type parser.
    // row_to_json emits ISO 8601 strings for timestamptz - coerce back to Date.
    const key = rowToApiKey(coerceKeyDates(combined.key));
    const user = rowToUser(coerceUserDates(combined.user));

    if (!key.active) return null;
    if (key.expiresAt && key.expiresAt.getTime() <= now) return null;
    if (!user.active) return null;

    const effectivePermissions = user.permissions.includes("admin")
      ? key.permissions // admin user → key still restricted to its own subset
      : intersectPermissions(key.permissions, user.permissions);

    const result: AuthenticatedApiKey = { key, user, effectivePermissions };
    this.cache.set(keyHash, { authenticatedKey: result, expiresAt: now + CACHE_TTL_MS });
    return result;
  }

  /**
   * Clear the full validate cache. Call after bulk mutations in tests.
   */
  clearCache(): void {
    this.cache.clear();
  }

  private invalidateById(id: string): void {
    for (const [hash, entry] of this.cache.entries()) {
      if (entry.authenticatedKey.key.id === id) {
        this.cache.delete(hash);
      }
    }
  }

  async get(id: string): Promise<ApiKey | null> {
    const { rows } = await db.query<ApiKeyRow>(
      `SELECT ${API_KEY_COLS} FROM api_keys WHERE id = $1`,
      [id]
    );
    return rows[0] ? rowToApiKey(rows[0]) : null;
  }

  async list(opts: ApiKeyListOptions = {}): Promise<PaginatedApiKeys> {
    const offset = opts.offset ?? 0;
    const limit = Math.min(opts.limit ?? 50, 500);

    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (opts.userId) {
      conditions.push(`user_id = $${idx++}`);
      params.push(opts.userId);
    }
    if (!opts.includeInactive) {
      conditions.push(`active = true`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const [{ rows }, { rows: countRows }] = await Promise.all([
      db.query<ApiKeyRow>(
        `SELECT ${API_KEY_COLS} FROM api_keys ${where}
         ORDER BY created_at DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, limit, offset]
      ),
      db.query<{ total: number }>(
        `SELECT COUNT(*)::int AS total FROM api_keys ${where}`,
        params
      ),
    ]);

    return {
      keys: rows.map(rowToApiKey),
      total: countRows[0]?.total ?? 0,
      offset,
      limit,
    };
  }

  async create(input: CreateApiKeyInput, actor: Actor): Promise<CreateResult> {
    // Look up the owner user to verify permission subset constraint
    const { rows: ownerRows } = await db.query<{
      id: string;
      permissions: string[];
      active: boolean;
    }>(
      `SELECT id, permissions, active FROM users WHERE id = $1`,
      [input.userId]
    );
    const owner = ownerRows[0];
    if (!owner) throw new Error(`User ${input.userId} not found`);
    if (!owner.active) throw new Error(`User ${input.userId} is inactive`);

    // A key cannot hold permissions the owner doesn't already have.
    // The admin actor override lets admins create keys on behalf of users
    // but still enforces the owner's ceiling (security invariant).
    if (!isPermissionSubset(input.permissions, owner.permissions)) {
      throw new Error(
        "Key permissions must be a subset of the owner user's permissions"
      );
    }

    // A non-admin user actor creating a key must itself hold the
    // permissions being granted. Prevents a partner user from creating a
    // key with more permissions than they themselves have.
    //
    // System actors (null or type='system') bypass this check - they're
    // used by bootstrap and other unattended flows where the owner check
    // above is the only relevant constraint.
    const isUserActor = actor !== null && actor.type === "user";
    if (isUserActor) {
      const isActorAdmin = actorPermissions(actor).includes("admin");
      if (!isActorAdmin) {
        if (!isPermissionSubset(input.permissions, actorPermissions(actor))) {
          throw new Error(
            "Actor cannot grant permissions they do not themselves hold"
          );
        }
      }
    }

    const { rawKey, prefix } = generateApiKey();
    const keyHash = hashApiKey(rawKey);

    const { rows } = await db.query<ApiKeyRow>(
      `INSERT INTO api_keys
         (user_id, name, description, key_hash, key_prefix, permissions,
          rate_limit_points, rate_limit_duration_sec, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING ${API_KEY_COLS}`,
      [
        input.userId,
        input.name,
        input.description ?? null,
        keyHash,
        prefix,
        input.permissions,
        input.rateLimitPoints ?? null,
        input.rateLimitDurationSec ?? 60,
        input.expiresAt ?? null,
      ]
    );

    const record = rowToApiKey(rows[0]!);
    await auditLogService.log("api_key.create", {
      userId: actorUserId(actor),
      source: actorSource(actor),
      targetType: "api_key",
      targetId: record.id,
      metadata: {
        userId: input.userId,
        name: record.name,
        permissions: record.permissions,
      },
    });
    return { record, rawKey };
  }

  async update(
    id: string,
    patch: UpdateApiKeyInput,
    actor: Actor
  ): Promise<ApiKey> {
    // If updating permissions, re-check subset constraint against owner
    if (patch.permissions !== undefined) {
      const { rows } = await db.query<{
        user_id: string;
        owner_permissions: string[];
      }>(
        `SELECT k.user_id, u.permissions AS owner_permissions
         FROM api_keys k
         JOIN users u ON u.id = k.user_id
         WHERE k.id = $1`,
        [id]
      );
      const row = rows[0];
      if (!row) throw new Error(`API key ${id} not found`);
      if (!isPermissionSubset(patch.permissions, row.owner_permissions)) {
        throw new Error(
          "Key permissions must be a subset of the owner user's permissions"
        );
      }
    }

    const sets: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (patch.name !== undefined) {
      sets.push(`name = $${idx++}`);
      params.push(patch.name);
    }
    if (patch.description !== undefined) {
      sets.push(`description = $${idx++}`);
      params.push(patch.description);
    }
    if (patch.permissions !== undefined) {
      sets.push(`permissions = $${idx++}`);
      params.push(patch.permissions);
    }
    if (patch.rateLimitPoints !== undefined) {
      sets.push(`rate_limit_points = $${idx++}`);
      params.push(patch.rateLimitPoints);
    }
    if (patch.rateLimitDurationSec !== undefined) {
      sets.push(`rate_limit_duration_sec = $${idx++}`);
      params.push(patch.rateLimitDurationSec);
    }
    if (patch.expiresAt !== undefined) {
      sets.push(`expires_at = $${idx++}`);
      params.push(patch.expiresAt);
    }
    if (patch.active !== undefined) {
      sets.push(`active = $${idx++}`);
      params.push(patch.active);
    }

    if (sets.length === 0) {
      const existing = await this.get(id);
      if (!existing) throw new Error(`API key ${id} not found`);
      return existing;
    }

    sets.push(`updated_at = NOW()`);
    params.push(id);

    const { rows } = await db.query<ApiKeyRow>(
      `UPDATE api_keys SET ${sets.join(", ")} WHERE id = $${idx} RETURNING ${API_KEY_COLS}`,
      params
    );
    if (!rows[0]) throw new Error(`API key ${id} not found`);

    this.invalidateById(id);

    const record = rowToApiKey(rows[0]);
    await auditLogService.log("api_key.update", {
      userId: actorUserId(actor),
      source: actorSource(actor),
      targetType: "api_key",
      targetId: record.id,
      metadata: { patch },
    });
    return record;
  }

  async revoke(id: string, actor: Actor): Promise<void> {
    const { rowCount } = await db.query(
      `UPDATE api_keys SET active = false, updated_at = NOW() WHERE id = $1`,
      [id]
    );
    if (!rowCount) throw new Error(`API key ${id} not found`);
    this.invalidateById(id);
    await auditLogService.log("api_key.revoke", {
      userId: actorUserId(actor),
      source: actorSource(actor),
      targetType: "api_key",
      targetId: id,
    });
  }

  async delete(id: string, actor: Actor): Promise<void> {
    const { rowCount } = await db.query(`DELETE FROM api_keys WHERE id = $1`, [
      id,
    ]);
    if (!rowCount) throw new Error(`API key ${id} not found`);
    this.invalidateById(id);
    await auditLogService.log("api_key.delete", {
      userId: actorUserId(actor),
      source: actorSource(actor),
      targetType: "api_key",
      targetId: id,
    });
  }

  /**
   * Fire-and-forget update of last_used_at. Errors are swallowed - this is
   * telemetry, not a security-critical path.
   */
  async touchLastUsed(id: string): Promise<void> {
    try {
      await db.query(
        `UPDATE api_keys SET last_used_at = NOW() WHERE id = $1`,
        [id]
      );
    } catch (err) {
      console.error("[ApiKeyService] touchLastUsed failed", err);
    }
  }
}

export const apiKeyService = new ApiKeyService();
