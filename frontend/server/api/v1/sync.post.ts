import { config, importService, IMPORT_LANGUAGE_CODES } from "@checkbot/core";
import type { ClaimJson } from "@checkbot/core";
import { z } from "zod";

const SyncSchema = z.object({
  language: z.enum(IMPORT_LANGUAGE_CODES).default("de"),
  // Re-index every claim, bypassing the unchanged-hash skip.
  force: z.boolean().default(false),
});

export default defineEventHandler(async (event) => {
  assertPermission(event, "import");
  const { url: faktenforumUrl, apiKey: faktenforumApiKey } = config.faktenforum;

  if (!faktenforumUrl) {
    setResponseStatus(event, 503);
    return { error: "CHECKBOT_RAG_FAKTENFORUM_URL is not configured" };
  }

  const body = await readBody(event).catch(() => ({}));
  const parsed = SyncSchema.safeParse(body ?? {});
  const language = parsed.success ? parsed.data.language : "de";
  const force = parsed.success ? parsed.data.force : false;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (faktenforumApiKey) {
    headers["x-api-key"] = faktenforumApiKey;
  }

  let claims: ClaimJson[];
  try {
    const response = await fetch(`${faktenforumUrl}/api/v1/export/claims`, {
      headers,
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      const details = await response.text().catch(() => "");
      console.error(`[sync] Faktenforum export error ${response.status}:`, details);
      setResponseStatus(event, 502);
      return { error: `Faktenforum export returned ${response.status}` };
    }
    claims = (await response.json()) as ClaimJson[];
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[sync] Failed to reach Faktenforum:", message);
    setResponseStatus(event, 502);
    return { error: "Failed to reach Faktenforum" };
  }

  if (!Array.isArray(claims) || claims.length === 0) {
    setResponseStatus(event, 400);
    return { error: "Faktenforum export returned no claims or invalid format" };
  }

  const jobId = await importService.start(claims, "faktenforum-sync", language, force);

  setResponseStatus(event, 202);
  return {
    jobId,
    message: `Sync started for ${claims.length} claims`,
    statusUrl: `/api/v1/import/jobs/${jobId}`,
  };
});
