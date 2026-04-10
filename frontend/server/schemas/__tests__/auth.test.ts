import { describe, it, expect } from "bun:test";
import { LoginSchema, ChangePasswordSchema } from "../auth";

describe("LoginSchema", () => {
  it("accepts valid email and password", () => {
    const result = LoginSchema.safeParse({ email: "user@example.com", password: "secret" });
    expect(result.success).toBe(true);
  });

  it("rejects missing email", () => {
    const result = LoginSchema.safeParse({ password: "secret" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email format", () => {
    const result = LoginSchema.safeParse({ email: "not-an-email", password: "secret" });
    expect(result.success).toBe(false);
  });

  it("rejects empty password", () => {
    const result = LoginSchema.safeParse({ email: "user@example.com", password: "" });
    expect(result.success).toBe(false);
  });

  it("rejects missing password", () => {
    const result = LoginSchema.safeParse({ email: "user@example.com" });
    expect(result.success).toBe(false);
  });
});

describe("ChangePasswordSchema", () => {
  it("accepts valid current and new password", () => {
    const result = ChangePasswordSchema.safeParse({
      currentPassword: "old-pass",
      newPassword: "new-pass-long-enough",
    });
    expect(result.success).toBe(true);
  });

  it("rejects new password shorter than 8 chars", () => {
    const result = ChangePasswordSchema.safeParse({
      currentPassword: "old-pass",
      newPassword: "short",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("newPassword"))).toBe(true);
    }
  });

  it("accepts exactly 8 character new password", () => {
    const result = ChangePasswordSchema.safeParse({
      currentPassword: "old-pass",
      newPassword: "exactly8",
    });
    expect(result.success).toBe(true);
  });
});
