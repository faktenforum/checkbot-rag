import { describe, it, expect } from "bun:test";
import { actorSource, actorUserId } from "../actor";
import type { Actor } from "../../types/auth";

describe("actor helpers", () => {
  describe("actorUserId", () => {
    it("returns userId for user actors", () => {
      const actor: Actor = { type: "user", userId: "u1", permissions: [] };
      expect(actorUserId(actor)).toBe("u1");
    });

    it("returns null for system actors", () => {
      expect(actorUserId({ type: "system" })).toBeNull();
    });

    it("returns null for null actor", () => {
      expect(actorUserId(null)).toBeNull();
    });
  });

  describe("actorSource", () => {
    it("returns explicit source from user actor", () => {
      const actor: Actor = {
        type: "user",
        userId: "u1",
        permissions: [],
        source: "mcp",
      };
      expect(actorSource(actor)).toBe("mcp");
    });

    it("defaults to 'system' when user actor has no source set", () => {
      const actor: Actor = { type: "user", userId: "u1", permissions: [] };
      expect(actorSource(actor)).toBe("system");
    });

    it("returns 'system' for null actor", () => {
      expect(actorSource(null)).toBe("system");
    });

    it("returns explicit source from system actor", () => {
      expect(actorSource({ type: "system", source: "system" })).toBe("system");
    });
  });
});
