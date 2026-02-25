import { defineHandler, getRouterParam } from "nitro/h3";
import { z } from "zod";
import { importService } from "@checkbot/core";

const JobIdParamSchema = z.string().uuid();

export default defineHandler(async (event) => {
  const jobId = getRouterParam(event, "jobId");
  const parsed = JobIdParamSchema.safeParse(jobId);
  if (!parsed.success) {
    event.res.status = 400;
    return { error: "Invalid job id", details: parsed.error.flatten() };
  }

  const status = await importService.getJobStatus(parsed.data);
  if (!status) {
    event.res.status = 404;
    return { error: "Import job not found" };
  }
  return status;
});
