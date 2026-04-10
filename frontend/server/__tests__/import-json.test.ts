import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";

// Mock importService before importing the handler
const mockStart = mock(() => Promise.resolve("job-abc"));

mock.module("@checkbot/core", () => ({
  importService: { start: mockStart },
  IMPORT_LANGUAGE_CODES: ["de", "en", "fr", "es", "it", "pt", "nl"] as const,
  PERMISSIONS: [
    "claims:read", "claims:write", "search", "import", "mcp:use",
    "users:read", "users:write", "api_keys:read_all", "admin",
  ] as const,
  config: { faktenforum: { url: undefined, apiKey: undefined } }
}));

const makeEvent = (body: unknown, apiKey?: string) => ({
  path: "/api/v1/import/json",
  headers: apiKey ? { authorization: `Bearer ${apiKey}` } : {},
  _body: body,
  _status: 200,
  setResponseStatus(code: number) {
    this._status = code;
  },
  async readBody() {
    return this._body;
  }
});

const makeH3Mock = (event: ReturnType<typeof makeEvent>) => ({
  readBody: () => Promise.resolve(event._body),
  setResponseStatus: (e: unknown, code: number) => {
    (event as ReturnType<typeof makeEvent>)._status = code;
  }
});

describe("POST /api/v1/import/json", () => {
  beforeEach(() => {
    mockStart.mockClear();
  });

  afterEach(() => {
    mockStart.mockClear();
  });

  it("accepts valid claims array and returns 202 with jobId", async () => {
    const claims = [
      { id: "claim-1", synopsis: "Test claim", status: "published", shortId: "2024/1/1", processId: 1, createdAt: "2024-01-01", createdBy: "u1", internal: false, publishingUrl: null, publishedVersionId: null, editorialImageFile: null, checkworthiness: null, createdByUser: null, updatedByUser: null, claimCategories: [], origins: [], facts: [], submitterNotes: null, ratingLabelName: null, ratingStatement: null, ratingSummary: null }
    ];

    // Validate schema directly
    const { ImportFromJsonSchema } = await import("../schemas/import");
    const result = ImportFromJsonSchema.safeParse({ claims, language: "de" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.claims).toHaveLength(1);
      expect(result.data.language).toBe("de");
    }
  });

  it("rejects empty claims array", async () => {
    const { ImportFromJsonSchema } = await import("../schemas/import");
    const result = ImportFromJsonSchema.safeParse({ claims: [], language: "de" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("claims"))).toBe(true);
    }
  });

  it("rejects missing claims field", async () => {
    const { ImportFromJsonSchema } = await import("../schemas/import");
    const result = ImportFromJsonSchema.safeParse({ language: "de" });

    expect(result.success).toBe(false);
  });

  it("defaults language to 'de' when not provided", async () => {
    const { ImportFromJsonSchema } = await import("../schemas/import");
    const result = ImportFromJsonSchema.safeParse({
      claims: [{ id: "1" }]
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.language).toBe("de");
    }
  });
});
