import { db } from "./DatabaseService.js";
import type { ActorSource, AuditLogEntry } from "../types/auth.js";

/**
 * Action strings used across the codebase. Kept as a union for type safety
 * but stored as TEXT in the DB for forward compatibility.
 */
export const AUDIT_ACTIONS = [
  "auth.login",
  "auth.login_failed",
  "auth.login_rate_limited",
  "auth.logout",
  "user.create",
  "user.update",
  "user.delete",
  "user.deactivate",
  "user.password_reset",
  "api_key.create",
  "api_key.update",
  "api_key.revoke",
  "api_key.delete",
  "api_key.access_denied",
  "bootstrap.admin_created",
  "bootstrap.admin_updated",
  "bootstrap.admin_deactivated",
  "bootstrap.service_user_created",
  "bootstrap.service_user_updated",
  "bootstrap.service_user_deactivated",
  "bootstrap.key_rotated",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export interface LogOptions {
  userId?: string | null;
  targetType?: "user" | "api_key" | null;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  /**
   * HTTP surface the action originated on. Stored in metadata under
   * `actorSource` (intentionally not plain `source` to avoid clobbering
   * `metadata.source` used by user.create to record env_bootstrap origin).
   * Operators can filter with `metadata->>'actorSource' = 'mcp'`.
   */
  source?: ActorSource;
}

export interface AuditLogFilter {
  userId?: string;
  action?: string;
  targetType?: string;
  targetId?: string;
  from?: Date;
  to?: Date;
}

export interface AuditLogListOptions {
  offset?: number;
  limit?: number;
}

export interface PaginatedAuditEntries {
  entries: AuditLogEntry[];
  total: number;
  offset: number;
  limit: number;
}

interface AuditLogRow {
  id: string;
  user_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  created_at: Date;
}

function rowToEntry(row: AuditLogRow): AuditLogEntry {
  return {
    id: row.id,
    userId: row.user_id,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    metadata: row.metadata ?? {},
    ipAddress: row.ip_address,
    createdAt: row.created_at,
  };
}

export class AuditLogService {
  /**
   * Record an audit event. Fire-and-forget at call sites is fine - errors
   * are caught and logged to console so a broken audit pipeline can't block
   * the request path, but in tests we await to assert ordering.
   */
  async log(action: AuditAction | string, opts: LogOptions = {}): Promise<void> {
    try {
      // Merge the `source` shorthand into metadata under `actorSource`. Keeping
      // it out of opts.metadata deliberately so the explicit field is the
      // canonical place call sites set it, and using a distinct key avoids
      // colliding with `metadata.source` which some entries use for unrelated
      // user-origin info (env_bootstrap vs manual).
      const metadata: Record<string, unknown> = { ...(opts.metadata ?? {}) };
      if (opts.source !== undefined) {
        metadata.actorSource = opts.source;
      }
      await db.query(
        `INSERT INTO audit_log (user_id, action, target_type, target_id, metadata, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          opts.userId ?? null,
          action,
          opts.targetType ?? null,
          opts.targetId ?? null,
          JSON.stringify(metadata),
          opts.ipAddress ?? null,
        ]
      );
    } catch (err) {
      console.error("[AuditLogService] Failed to write audit entry", {
        action,
        err,
      });
    }
  }

  async list(
    filter: AuditLogFilter = {},
    opts: AuditLogListOptions = {}
  ): Promise<PaginatedAuditEntries> {
    const offset = opts.offset ?? 0;
    const limit = Math.min(opts.limit ?? 50, 500);

    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (filter.userId) {
      conditions.push(`user_id = $${idx++}`);
      params.push(filter.userId);
    }
    if (filter.action) {
      conditions.push(`action = $${idx++}`);
      params.push(filter.action);
    }
    if (filter.targetType) {
      conditions.push(`target_type = $${idx++}`);
      params.push(filter.targetType);
    }
    if (filter.targetId) {
      conditions.push(`target_id = $${idx++}`);
      params.push(filter.targetId);
    }
    if (filter.from) {
      conditions.push(`created_at >= $${idx++}`);
      params.push(filter.from);
    }
    if (filter.to) {
      conditions.push(`created_at <= $${idx++}`);
      params.push(filter.to);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const [{ rows }, { rows: countRows }] = await Promise.all([
      db.query<AuditLogRow>(
        `SELECT id, user_id, action, target_type, target_id, metadata, ip_address, created_at
         FROM audit_log ${where}
         ORDER BY created_at DESC, id DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, limit, offset]
      ),
      db.query<{ total: number }>(
        `SELECT COUNT(*)::int AS total FROM audit_log ${where}`,
        params
      ),
    ]);

    return {
      entries: rows.map(rowToEntry),
      total: countRows[0]?.total ?? 0,
      offset,
      limit,
    };
  }
}

export const auditLogService = new AuditLogService();
