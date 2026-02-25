import { defineHandler } from "nitro/h3";
import { importService } from "@checkbot/core";

export default defineHandler(async () => {
  return importService.listJobs();
});
