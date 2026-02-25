import { claimsService } from "@checkbot/core";
import { defineEventHandler, getRouterParam, setResponseStatus } from "h3";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) {
    setResponseStatus(event, 400);
    return { error: "Missing id" };
  }
  const idStr = decodeURIComponent(id);

  const claim = await claimsService.get(idStr);

  if (!claim) {
    setResponseStatus(event, 404);
    return { error: "Claim not found" };
  }
  return claim;
});
