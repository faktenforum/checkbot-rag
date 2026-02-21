import Router from "@koa/router";
import { healthRouter } from "./HealthController.js";
import { searchRouter } from "./SearchController.js";
import { claimRouter } from "./ClaimController.js";
import { importRouter } from "./ImportController.js";
import { statsRouter } from "./StatsController.js";

const apiRouter = new Router();

for (const router of [healthRouter, searchRouter, claimRouter, importRouter, statsRouter]) {
  apiRouter.use(router.routes(), router.allowedMethods());
}

export { apiRouter };
