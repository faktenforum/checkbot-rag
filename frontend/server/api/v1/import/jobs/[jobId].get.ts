import { z } from "zod";
import { importService } from "@checkbot/core";
import { JobIdParamSchema } from "../../../../schemas/import";

export default defineEventHandler(async (event) => {
  const jobId = getRouterParam(event, "jobId");
  const parsed = JobIdParamSchema.safeParse(jobId);
  if (!parsed.success) {
    setResponseStatus(event, 400);
    return { error: "Invalid job id", details: z.treeifyError(parsed.error) };
  }

  const status = await importService.get(parsed.data);
  if (!status) {
    setResponseStatus(event, 404);
    return { error: "Import job not found" };
  }
  return status;
});
