import { importService } from "@checkbot/core";

export default defineEventHandler(async (event) => {
  assertPermission(event, "import");
  return importService.list();
});
