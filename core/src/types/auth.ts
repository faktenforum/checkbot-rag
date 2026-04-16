export type UserType = "human" | "service";
export type UserSource = "manual" | "env_bootstrap";

export interface User {
  id: string;
  userType: UserType;
  name: string;
  email: string | null;
  permissions: string[];
  source: UserSource;
  envVarName: string | null;
  active: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
}

export interface UserWithPasswordHash extends User {
  passwordHash: string | null;
}

export interface ApiKey {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  keyPrefix: string;
  permissions: string[];
  rateLimitPoints: number | null;
  rateLimitDurationSec: number;
  active: boolean;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Return shape of ApiKeyService.validate on success. */
export interface AuthenticatedApiKey {
  key: ApiKey;
  user: User;
  /** user.permissions ∩ key.permissions, precomputed */
  effectivePermissions: string[];
}

export interface Session {
  id: string;
  userId: string;
  expiresAt: Date;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: Date;
  lastActivityAt: Date;
}

export interface AuditLogEntry {
  id: string;
  userId: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  createdAt: Date;
}

/**
 * The HTTP surface a request arrived on. Threaded into audit-log entries so
 * operators can distinguish "user X did Y via the admin UI" from "user X did Y
 * via an MCP tool call" or "an API client did Y" — crucial for forensics when
 * an API key is leaked.
 *
 * - 'session' — Admin UI / cookie-based session
 * - 'rest'    — Bearer-token request on /api/*
 * - 'mcp'     — Bearer-token request on /mcp
 * - 'system'  — Server-initiated (bootstrap, cron, migrations)
 */
export type ActorSource = "session" | "rest" | "mcp" | "system";

/**
 * The actor performing a mutating operation. Used for audit logging and
 * permission checks. `null` represents system actions (e.g. bootstrap).
 */
export type Actor =
  | {
      type: "user";
      userId: string;
      permissions: string[];
      source?: ActorSource;
    }
  | { type: "system"; source?: ActorSource }
  | null;
