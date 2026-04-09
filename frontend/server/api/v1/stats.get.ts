import { claimStatsService } from "@checkbot/core";

export default defineEventHandler(async (event) => {
  assertPermission(event, "claims:read");
  return claimStatsService.get();
});
