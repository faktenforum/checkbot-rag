import { importService, config } from "@checkbot/core";
import type { ClaimJson } from "@checkbot/core";
import { IMPORT_LANGUAGE_CODES } from "@checkbot/core";
import { z } from "zod";

const SyncSchema = z.object({
  language: z.enum(IMPORT_LANGUAGE_CODES).default("de"),
});

export default defineEventHandler(async (event) => {
  const { url: faktenforum_url, apiKey: faktenforum_api_key } = config.faktenforum;

  if (!faktenforum_url) {
    setResponseStatus(event, 503);
    return { error: "CHECKBOT_RAG_FAKTENFORUM_URL is not configured" };
  }

  const body = await readBody(event).catch(() => ({}));
  const parsed = SyncSchema.safeParse(body ?? {});
  const language = parsed.success ? parsed.data.language : "de";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (faktenforum_api_key) {
    headers["x-api-key"] = faktenforum_api_key;
  }

  let claims: ClaimJson[];
  try {
    const response = await fetch(`${faktenforum_url}/api/v1/export/claims`, { headers });
    if (!response.ok) {
      setResponseStatus(event, 502);
      return {
        error: `Faktenforum export returned ${response.status}`,
        details: await response.text().catch(() => ""),
      };
    }
    claims = (await response.json()) as ClaimJson[];
  } catch (err) {
    setResponseStatus(event, 502);
    return { error: `Failed to reach Faktenforum: ${(err as Error).message}` };
  }

  if (!Array.isArray(claims) || claims.length === 0) {
    setResponseStatus(event, 400);
    return { error: "Faktenforum export returned no claims or invalid format" };
  }

  const jobId = await importService.start(claims, "faktenforum-sync", language);

  setResponseStatus(event, 202);
  return {
    jobId,
    message: `Sync started for ${claims.length} claims`,
    statusUrl: `/api/v1/import/jobs/${jobId}`,
  };
});
