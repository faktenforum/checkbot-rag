import fs from "node:fs";
import Router from "@koa/router";
import { z } from "zod";
import { importService } from "../services/ImportService.js";
import type { ClaimJson } from "../types/claim.js";

const ImportFromFileSchema = z.object({
  filePath: z.string(),
});

const importRouter = new Router({ prefix: "/api/v1" });

// Trigger import from a file path accessible inside the container.
// Mount the exports directory via Docker volume:
//   volumes: - ./exports:/data/exports:ro
importRouter.post("/import", async (ctx) => {
  const result = ImportFromFileSchema.safeParse(ctx.request.body);
  if (!result.success) {
    ctx.status = 400;
    ctx.body = { error: "Validation error", details: result.error.flatten() };
    return;
  }

  const { filePath } = result.data;

  if (!fs.existsSync(filePath)) {
    ctx.status = 400;
    ctx.body = { error: `File not found: ${filePath}` };
    return;
  }

  let claims: ClaimJson[];
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    claims = JSON.parse(raw) as ClaimJson[];
  } catch (err) {
    ctx.status = 400;
    ctx.body = { error: `Failed to parse JSON file: ${(err as Error).message}` };
    return;
  }

  if (!Array.isArray(claims)) {
    ctx.status = 400;
    ctx.body = { error: "File must contain a JSON array of claims" };
    return;
  }

  const source = filePath.split("/").pop() ?? filePath;
  const jobId = await importService.startImport(claims, source);

  ctx.status = 202;
  ctx.body = {
    jobId,
    message: `Import started for ${claims.length} claims`,
    statusUrl: `/api/v1/import/jobs/${jobId}`,
  };
});

importRouter.get("/import/jobs", async (ctx) => {
  ctx.body = await importService.listJobs();
});

importRouter.get("/import/jobs/:jobId", async (ctx) => {
  const status = await importService.getJobStatus(ctx.params.jobId);
  if (!status) {
    ctx.status = 404;
    ctx.body = { error: "Import job not found" };
    return;
  }
  ctx.body = status;
});

export { importRouter };
