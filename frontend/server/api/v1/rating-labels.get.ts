import { claimStatsService } from "@search/core";

export default defineEventHandler(async (event) => {
  assertPermission(event, "claims:read");
  return claimStatsService.listRatingLabels();
});
