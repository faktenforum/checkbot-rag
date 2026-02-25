import { z } from "zod";
import { importService } from "@checkbot/core";

const JobIdParamSchema = z.string().uuid();

export default defineEventHandler(async (event) => {
  const jobId = getRouterParam(event, "jobId");
  const parsed = JobIdParamSchema.safeParse(jobId);
  if (!parsed.success) {
    setResponseStatus(event, 400);
    return { error: "Invalid job id", details: parsed.error.flatten() };
  }

  const job = await importService.cancel(parsed.data);
  if (!job) {
    setResponseStatus(event, 404);
    return { error: "Import job not found" };
  }
  return job;
});
