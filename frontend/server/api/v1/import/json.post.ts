import { importService } from "@checkbot/core";
import type { ClaimJson } from "@checkbot/core";
import { ImportFromJsonSchema } from "../../../schemas/import";

export default defineEventHandler(async (event) => {
  assertPermission(event, "import");
  const body = await readBody(event);
  const result = ImportFromJsonSchema.safeParse(body);
  if (!result.success) {
    setResponseStatus(event, 400);
    return { error: "Validation error", details: result.error.flatten() };
  }
  const { claims, language, source } = result.data;

  const jobId = await importService.start(claims as ClaimJson[], source ?? "api-json", language);

  setResponseStatus(event, 202);
  return {
    jobId,
    message: `Import started for ${claims.length} claims`,
    statusUrl: `/api/v1/import/jobs/${jobId}`,
  };
});
