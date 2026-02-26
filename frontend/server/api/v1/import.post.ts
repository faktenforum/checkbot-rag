import fs from "node:fs";
import { importService } from "@checkbot/core";
import type { ClaimJson } from "@checkbot/core";
import { ImportFromFileSchema } from "../../schemas/import";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const result = ImportFromFileSchema.safeParse(body);
  if (!result.success) {
    setResponseStatus(event, 400);
    return { error: "Validation error", details: result.error.flatten() };
  }
  const { filePath, language } = result.data;

  if (!fs.existsSync(filePath)) {
    setResponseStatus(event, 400);
    return { error: `File not found: ${filePath}` };
  }

  let claims: ClaimJson[];
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    claims = JSON.parse(raw) as ClaimJson[];
  } catch (err) {
    setResponseStatus(event, 400);
    return { error: `Failed to parse JSON file: ${(err as Error).message}` };
  }

  if (!Array.isArray(claims)) {
    setResponseStatus(event, 400);
    return { error: "File must contain a JSON array of claims" };
  }

  const source = filePath.split("/").pop() ?? filePath;
  const jobId = await importService.start(claims, source, language);

  setResponseStatus(event, 202);
  return {
    jobId,
    message: `Import started for ${claims.length} claims`,
    statusUrl: `/api/v1/import/jobs/${jobId}`,
  };
});
