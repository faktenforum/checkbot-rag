export const PERMISSIONS = [
  // Data access
  "claims:read",
  "claims:write",
  "search",
  "import",
  "mcp:use",
  // Admin
  "users:read",
  "users:write",
  "api_keys:read_all",
  "admin",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_PRESETS = {
  admin: ["admin"],
  partner: ["claims:read", "search"],
  service: ["claims:read", "claims:write", "search", "import"],
  mcp_agent: ["mcp:use", "claims:read", "search"],
  viewer: ["claims:read"],
} as const satisfies Record<string, ReadonlyArray<Permission>>;

export type RolePreset = keyof typeof ROLE_PRESETS;

export function isPermission(value: string): value is Permission {
  return (PERMISSIONS as readonly string[]).includes(value);
}

export function expandPreset(preset: RolePreset): Permission[] {
  return [...ROLE_PRESETS[preset]];
}

/**
 * Returns true if the subject has the required permission.
 * The `admin` permission is a fast-path wildcard that grants everything.
 */
export function hasPermission(
  subject: { permissions: readonly string[] },
  required: Permission
): boolean {
  if (subject.permissions.includes("admin")) return true;
  return subject.permissions.includes(required);
}

/**
 * Returns a new array containing only permissions present in both inputs.
 * Preserves the order of the first input. Deduplicates.
 */
export function intersectPermissions(
  a: readonly string[],
  b: readonly string[]
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const p of a) {
    if (b.includes(p) && !seen.has(p)) {
      seen.add(p);
      result.push(p);
    }
  }
  return result;
}

/**
 * Returns true if every permission in `subset` is present in `superset`,
 * OR if `superset` contains the `admin` wildcard.
 */
export function isPermissionSubset(
  subset: readonly string[],
  superset: readonly string[]
): boolean {
  if (superset.includes("admin")) return true;
  return subset.every((p) => superset.includes(p));
}
