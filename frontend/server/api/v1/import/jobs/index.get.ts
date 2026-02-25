import { importService } from "@checkbot/core";

export default defineEventHandler(async () => {
  return importService.listJobs();
});
