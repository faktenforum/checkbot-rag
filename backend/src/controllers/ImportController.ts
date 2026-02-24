import fs from "node:fs";
import Router from "@koa/router";
import { z } from "zod";
import { importService } from "../services/ImportService.js";
import type { ClaimJson } from "../types/claim.js";

const ImportFromFileSchema = z.object({
  filePath: z.string(),
});

const JobIdParamSchema = z.object({
  jobId: z.string().uuid(),
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
  const parsed = JobIdParamSchema.safeParse(ctx.params);
  if (!parsed.success) {
    ctx.status = 400;
    ctx.body = { error: "Invalid job id", details: parsed.error.flatten() };
    return;
  }

  const status = await importService.getJobStatus(parsed.data.jobId);
  if (!status) {
    ctx.status = 404;
    ctx.body = { error: "Import job not found" };
    return;
  }
  ctx.body = status;
});

// Cancel a running or pending job. Idempotent if already terminal.
importRouter.post("/import/jobs/:jobId/cancel", async (ctx) => {
  const parsed = JobIdParamSchema.safeParse(ctx.params);
  if (!parsed.success) {
    ctx.status = 400;
    ctx.body = { error: "Invalid job id", details: parsed.error.flatten() };
    return;
  }

  const job = await importService.cancelJob(parsed.data.jobId);
  if (!job) {
    ctx.status = 404;
    ctx.body = { error: "Import job not found" };
    return;
  }

  ctx.status = 200;
  ctx.body = job;
});

// Delete a job only if it is in a terminal state (done, failed, canceled).
importRouter.delete("/import/jobs/:jobId", async (ctx) => {
  const parsed = JobIdParamSchema.safeParse(ctx.params);
  if (!parsed.success) {
    ctx.status = 400;
    ctx.body = { error: "Invalid job id", details: parsed.error.flatten() };
    return;
  }

  const result = await importService.deleteJob(parsed.data.jobId);
  if (result === "not_found") {
    ctx.status = 404;
    ctx.body = { error: "Import job not found" };
    return;
  }
  if (result === "not_deletable") {
    ctx.status = 409;
    ctx.body = { error: "Import job is not in a terminal state and cannot be deleted" };
    return;
  }

  ctx.status = 204;
});

export { importRouter };
