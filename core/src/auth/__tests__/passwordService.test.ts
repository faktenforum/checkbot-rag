import { describe, it, expect } from "bun:test";
import { passwordService } from "../passwordService";

describe("passwordService", () => {
  it("hash returns an argon2id string", async () => {
    const hash = await passwordService.hash("correct-horse-battery-staple");
    expect(hash).toStartWith("$argon2id$");
  });

  it("hash returns a different value each call (random salt)", async () => {
    const pw = "correct-horse-battery-staple";
    const a = await passwordService.hash(pw);
    const b = await passwordService.hash(pw);
    expect(a).not.toBe(b);
  });

  it("verify returns true for the original password", async () => {
    const hash = await passwordService.hash("correct-horse-battery-staple");
    expect(await passwordService.verify(hash, "correct-horse-battery-staple")).toBe(
      true
    );
  });

  it("verify returns false for a wrong password", async () => {
    const hash = await passwordService.hash("correct-horse-battery-staple");
    expect(await passwordService.verify(hash, "Tr0ub4dor&3")).toBe(false);
  });

  it("verify returns false for a malformed hash", async () => {
    expect(await passwordService.verify("not-a-hash", "whatever")).toBe(false);
    expect(await passwordService.verify("", "whatever")).toBe(false);
  });

  it("hash rejects passwords shorter than 8 characters", async () => {
    expect(passwordService.hash("short")).rejects.toThrow();
    expect(passwordService.hash("")).rejects.toThrow();
  });

  it("hash accepts exactly 8 characters", async () => {
    const hash = await passwordService.hash("12345678");
    expect(await passwordService.verify(hash, "12345678")).toBe(true);
  });
});
