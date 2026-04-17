import { claimsService, auditLogService } from "@checkbot/core";
import { defineEventHandler, getRouterParam, setResponseStatus, getRequestIP } from "h3";

export default defineEventHandler(async (event) => {
  assertPermission(event, "import");
  const id = getRouterParam(event, "id");
  if (!id) {
    setResponseStatus(event, 400);
    return { error: "Missing id" };
  }
  const idStr = decodeURIComponent(id);

  const deleted = await claimsService.delete(idStr);

  const actor = actorFromEvent(event);
  void auditLogService.log("claim.delete", {
    userId: actor.userId,
    source: actor.source,
    metadata: { identifier: idStr, found: deleted },
    ipAddress: getRequestIP(event, { xForwardedFor: true }) ?? null,
  });

  setResponseStatus(event, 204);
  return null;
});
