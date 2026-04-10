import { describe, it, expect } from "bun:test";
import {
  CreateUserSchema,
  UpdateUserSchema,
  UpdatePasswordSchema,
  UserListQuerySchema,
} from "../users";

describe("CreateUserSchema", () => {
  it("accepts a valid human user with email and password", () => {
    const result = CreateUserSchema.safeParse({
      userType: "human",
      name: "Alice",
      email: "alice@example.com",
      password: "SecurePass1!",
      permissions: ["claims:read", "search"],
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid service user without email or password", () => {
    const result = CreateUserSchema.safeParse({
      userType: "service",
      name: "partner-bot",
      permissions: ["search"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown userType", () => {
    const result = CreateUserSchema.safeParse({
      userType: "robot",
      name: "R2D2",
      permissions: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown permission strings", () => {
    const result = CreateUserSchema.safeParse({
      userType: "service",
      name: "bot",
      permissions: ["not:a:real:permission"],
    });
    expect(result.success).toBe(false);
  });

  it("accepts empty permissions array", () => {
    const result = CreateUserSchema.safeParse({
      userType: "service",
      name: "viewer-bot",
      permissions: [],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = CreateUserSchema.safeParse({
      userType: "service",
      name: "",
      permissions: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email format", () => {
    const result = CreateUserSchema.safeParse({
      userType: "human",
      name: "Alice",
      email: "not-valid",
      password: "SecurePass1!",
      permissions: [],
    });
    expect(result.success).toBe(false);
  });
});

describe("UpdateUserSchema", () => {
  it("accepts partial update with only name", () => {
    const result = UpdateUserSchema.safeParse({ name: "New Name" });
    expect(result.success).toBe(true);
  });

  it("accepts toggling active to false", () => {
    const result = UpdateUserSchema.safeParse({ active: false });
    expect(result.success).toBe(true);
  });

  it("accepts empty object (no-op patch)", () => {
    const result = UpdateUserSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe("UpdatePasswordSchema", () => {
  it("accepts password of 8 or more characters", () => {
    expect(UpdatePasswordSchema.safeParse({ password: "12345678" }).success).toBe(true);
  });

  it("rejects password shorter than 8 characters", () => {
    expect(UpdatePasswordSchema.safeParse({ password: "short" }).success).toBe(false);
  });
});

describe("UserListQuerySchema", () => {
  it("applies defaults for missing fields", () => {
    const result = UserListQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.offset).toBe(0);
      expect(result.data.limit).toBe(50);
      expect(result.data.includeInactive).toBe(false);
    }
  });

  it("coerces string numbers for offset and limit", () => {
    const result = UserListQuerySchema.safeParse({ offset: "10", limit: "25" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.offset).toBe(10);
      expect(result.data.limit).toBe(25);
    }
  });

  it("rejects limit above 500", () => {
    const result = UserListQuerySchema.safeParse({ limit: "501" });
    expect(result.success).toBe(false);
  });

  it("accepts userType filter", () => {
    const result = UserListQuerySchema.safeParse({ userType: "human" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.userType).toBe("human");
    }
  });
});
