import { db } from "./DatabaseService.js";
import { auditLogService } from "./AuditLogService.js";
import { userService } from "./UserService.js";
import { passwordService } from "../auth/passwordService.js";
import {
  generateSessionToken,
  hashSessionToken,
} from "../utils/sessionToken.js";
import { config } from "../config/index.js";
import type { User, Session } from "../types/auth.js";

export interface LoginResult {
  user: User;
  sessionToken: string;
}

interface SessionRow {
  id: string;
  user_id: string;
  session_token_hash: string;
  expires_at: Date;
  user_agent: string | null;
  ip_address: string | null;
  created_at: Date;
  last_activity_at: Date;
}

function toDate(v: unknown): Date {
  if (v instanceof Date) return v;
  return new Date(v as string);
}

function rowToSession(row: SessionRow): Session {
  return {
    id: row.id,
    userId: row.user_id,
    expiresAt: toDate(row.expires_at),
    userAgent: row.user_agent,
    ipAddress: row.ip_address,
    createdAt: toDate(row.created_at),
    lastActivityAt: toDate(row.last_activity_at),
  };
}

export class AuthService {
  private get secret() {
    return config.auth.sessionSecret;
  }

  private get lifetimeDays() {
    return config.auth.sessionLifetimeDays;
  }

  private get maxLifetimeDays() {
    return config.auth.sessionMaxLifetimeDays;
  }

  /**
   * Authenticate a user by email + password. Creates a session and returns
   * the raw session token (stored hashed server-side).
   *
   * Throws on wrong password, unknown email, or deactivated account - always
   * with the same generic message to avoid user enumeration.
   */
  async login(
    email: string,
    password: string,
    ip?: string,
    userAgent?: string
  ): Promise<LoginResult> {
    const withHash = await userService.getByEmail(email);

    // Constant-time: always attempt a verify even if user not found.
    const dummyHash =
      "$argon2id$v=19$m=65536,t=3,p=1$dummysaltsaltsalt$dummyhashhashhashhashhashhashhashhashhashhashhash";
    const hashToVerify = withHash?.passwordHash ?? dummyHash;
    const passwordOk = await passwordService.verify(hashToVerify, password);

    if (!withHash || !passwordOk || !withHash.active || !withHash.passwordHash) {
      await auditLogService.log("auth.login_failed", {
        source: "session",
        metadata: { email },
        ipAddress: ip,
      });
      throw new Error("Invalid email or password");
    }

    // Strip the password hash - never expose it outside the service
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _ph, ...user } = withHash;
    const rawToken = generateSessionToken();
    const tokenHash = hashSessionToken(rawToken, this.secret);

    const now = Date.now();
    const expiresAt = new Date(now + this.lifetimeDays * 86_400_000);

    await db.query(
      `INSERT INTO sessions (user_id, session_token_hash, expires_at, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.id, tokenHash, expiresAt, ip ?? null, userAgent ?? null]
    );

    await userService.touchLastLogin(user.id);

    await auditLogService.log("auth.login", {
      userId: user.id,
      source: "session",
      targetType: "user",
      targetId: user.id,
      ipAddress: ip,
    });

    return { user, sessionToken: rawToken };
  }

  /**
   * Invalidate a session by its raw token. No-op if the token doesn't exist.
   */
  async logout(sessionToken: string, ip?: string): Promise<void> {
    const tokenHash = hashSessionToken(sessionToken, this.secret);
    const { rows } = await db.query<{ user_id: string }>(
      `DELETE FROM sessions WHERE session_token_hash = $1 RETURNING user_id`,
      [tokenHash]
    );
    if (rows[0]) {
      await auditLogService.log("auth.logout", {
        userId: rows[0].user_id,
        source: "session",
        ipAddress: ip,
      });
    }
  }

  /**
   * Validate a session token. Returns null for unknown, expired, or inactive
   * sessions. Extends the rolling expiry on each valid access. Enforces an
   * absolute maximum session lifetime.
   */
  async validateSession(
    sessionToken: string
  ): Promise<{ user: User; session: Session } | null> {
    const tokenHash = hashSessionToken(sessionToken, this.secret);
    const now = Date.now();

    const { rows } = await db.query<SessionRow & { created_at_raw: string }>(
      `SELECT id, user_id, session_token_hash, expires_at, user_agent, ip_address,
              created_at, last_activity_at
       FROM sessions WHERE session_token_hash = $1`,
      [tokenHash]
    );
    const row = rows[0];
    if (!row) return null;

    const session = rowToSession(row);
    if (session.expiresAt.getTime() <= now) {
      // Expired - clean up
      await db.query(`DELETE FROM sessions WHERE id = $1`, [session.id]);
      return null;
    }

    // Look up user
    const user = await userService.get(session.userId);
    if (!user || !user.active) return null;

    // Rolling expiry: extend by lifetimeDays unless we'd exceed the absolute cap.
    const createdAt = session.createdAt.getTime();
    const absoluteCap = createdAt + this.maxLifetimeDays * 86_400_000;
    const rollingExpiry = now + this.lifetimeDays * 86_400_000;
    const newExpiry = new Date(Math.min(rollingExpiry, absoluteCap));

    await db.query(
      `UPDATE sessions SET expires_at = $1, last_activity_at = NOW() WHERE id = $2`,
      [newExpiry, session.id]
    );

    return { user, session: { ...session, expiresAt: newExpiry } };
  }
}

export const authService = new AuthService();
