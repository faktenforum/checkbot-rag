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

  const result = await importService.delete(parsed.data);
  if (result === "not_found") {
    setResponseStatus(event, 404);
    return { error: "Import job not found" };
  }
  if (result === "not_deletable") {
    setResponseStatus(event, 409);
    return { error: "Import job is not in a terminal state and cannot be deleted" };
  }
  setResponseStatus(event, 204);
  return null;
});
