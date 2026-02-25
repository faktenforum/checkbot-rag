import { claimStatsService } from "@checkbot/core";

export default defineEventHandler(async () => {
  return claimStatsService.listCategories();
});
