import { importService } from "@search/core";

export default defineEventHandler(async (event) => {
  assertPermission(event, "import");
  return importService.list();
});
