import { auditLogService } from "@search/core";
import { AuditLogQuerySchema } from "../../../schemas/auditLog";

export default defineEventHandler(async (event) => {
  assertPermission(event, "admin");
  const query = getQuery(event);
  const parsed = AuditLogQuerySchema.safeParse(query);
  if (!parsed.success) {
    setResponseStatus(event, 400);
    return { error: "Validation error", details: parsed.error.flatten() };
  }
  const { offset, limit, ...filter } = parsed.data;
  return auditLogService.list(filter, { offset, limit });
});
