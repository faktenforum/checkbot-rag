import fs from "node:fs";
import { defineHandler, readBody } from "nitro/h3";
import { z } from "zod";
import { importService } from "@checkbot/core";
import type { ClaimJson } from "@checkbot/core";

const ImportFromFileSchema = z.object({
  filePath: z.string(),
});

export default defineHandler(async (event) => {
  const body = await readBody(event);
  const result = ImportFromFileSchema.safeParse(body);
  if (!result.success) {
    event.res.status = 400;
    return { error: "Validation error", details: result.error.flatten() };
  }
  const { filePath } = result.data;

  if (!fs.existsSync(filePath)) {
    event.res.status = 400;
    return { error: `File not found: ${filePath}` };
  }

  let claims: ClaimJson[];
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    claims = JSON.parse(raw) as ClaimJson[];
  } catch (err) {
    event.res.status = 400;
    return { error: `Failed to parse JSON file: ${(err as Error).message}` };
  }

  if (!Array.isArray(claims)) {
    event.res.status = 400;
    return { error: "File must contain a JSON array of claims" };
  }

  const source = filePath.split("/").pop() ?? filePath;
  const jobId = await importService.startImport(claims, source);

  event.res.status = 202;
  return {
    jobId,
    message: `Import started for ${claims.length} claims`,
    statusUrl: `/api/v1/import/jobs/${jobId}`,
  };
});
