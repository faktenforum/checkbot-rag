import { describe, it, expect } from "bun:test";
import {
  PERMISSIONS,
  ROLE_PRESETS,
  expandPreset,
  hasPermission,
  intersectPermissions,
  isPermission,
  isPermissionSubset,
} from "../permissions";

describe("permissions catalog", () => {
  it("includes all expected permissions", () => {
    expect(PERMISSIONS).toContain("claims:read");
    expect(PERMISSIONS).toContain("claims:write");
    expect(PERMISSIONS).toContain("search");
    expect(PERMISSIONS).toContain("import");
    expect(PERMISSIONS).toContain("mcp:use");
    expect(PERMISSIONS).toContain("users:read");
    expect(PERMISSIONS).toContain("users:write");
    expect(PERMISSIONS).toContain("api_keys:read_all");
    expect(PERMISSIONS).toContain("admin");
  });

  it("defines the expected role presets", () => {
    expect(ROLE_PRESETS.admin).toEqual(["admin"]);
    expect(ROLE_PRESETS.viewer).toEqual(["claims:read"]);
    expect(ROLE_PRESETS.partner).toContain("claims:read");
    expect(ROLE_PRESETS.partner).toContain("search");
    expect(ROLE_PRESETS.mcp_agent).toContain("mcp:use");
  });

  it("isPermission narrows correctly", () => {
    expect(isPermission("search")).toBe(true);
    expect(isPermission("nonsense")).toBe(false);
    expect(isPermission("")).toBe(false);
  });

  it("expandPreset returns a fresh array", () => {
    const a = expandPreset("admin");
    const b = expandPreset("admin");
    expect(a).toEqual(["admin"]);
    a.push("tampered" as never);
    expect(b).toEqual(["admin"]);
  });
});

describe("hasPermission", () => {
  it("returns true for exact match", () => {
    expect(hasPermission({ permissions: ["search"] }, "search")).toBe(true);
  });

  it("returns false for missing permission", () => {
    expect(hasPermission({ permissions: ["search"] }, "import")).toBe(false);
  });

  it("returns true when subject has admin regardless of required", () => {
    expect(hasPermission({ permissions: ["admin"] }, "import")).toBe(true);
    expect(hasPermission({ permissions: ["admin"] }, "users:write")).toBe(true);
    expect(hasPermission({ permissions: ["admin"] }, "mcp:use")).toBe(true);
  });

  it("returns false for empty permission set", () => {
    expect(hasPermission({ permissions: [] }, "search")).toBe(false);
  });

  it("returns true when admin is one of many permissions", () => {
    expect(
      hasPermission(
        { permissions: ["claims:read", "admin", "search"] },
        "users:write"
      )
    ).toBe(true);
  });
});

describe("intersectPermissions", () => {
  it("returns shared elements only", () => {
    expect(
      intersectPermissions(["search", "import", "claims:read"], ["search", "claims:read"])
    ).toEqual(["search", "claims:read"]);
  });

  it("returns empty when no overlap", () => {
    expect(intersectPermissions(["search"], ["import"])).toEqual([]);
  });

  it("preserves order of the first input", () => {
    expect(
      intersectPermissions(
        ["claims:read", "search", "import"],
        ["import", "search", "claims:read"]
      )
    ).toEqual(["claims:read", "search", "import"]);
  });

  it("deduplicates", () => {
    expect(intersectPermissions(["search", "search"], ["search"])).toEqual([
      "search",
    ]);
  });

  it("treats admin as a concrete value, not a wildcard (intersection is pure set math)", () => {
    // intersectPermissions does not do wildcard expansion - that's the job of
    // hasPermission / isPermissionSubset. This test locks that behavior in.
    expect(intersectPermissions(["admin"], ["search"])).toEqual([]);
  });
});

describe("isPermissionSubset", () => {
  it("returns true when subset is fully contained", () => {
    expect(isPermissionSubset(["search"], ["search", "import"])).toBe(true);
    expect(isPermissionSubset([], ["search"])).toBe(true);
  });

  it("returns false when subset contains extra elements", () => {
    expect(isPermissionSubset(["search", "import"], ["search"])).toBe(false);
  });

  it("returns true when superset contains admin wildcard", () => {
    expect(isPermissionSubset(["search", "import", "users:write"], ["admin"])).toBe(
      true
    );
  });

  it("returns true for empty subset regardless of superset", () => {
    expect(isPermissionSubset([], [])).toBe(true);
    expect(isPermissionSubset([], ["admin"])).toBe(true);
  });
});
