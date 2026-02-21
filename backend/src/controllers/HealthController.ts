import Router from "@koa/router";
import { db } from "../services/DatabaseService.js";

const healthRouter = new Router();

healthRouter.get("/health", async (ctx) => {
  try {
    await db.query("SELECT 1");
    ctx.body = { status: "ok", db: "ok" };
  } catch {
    ctx.status = 200;
    ctx.body = { status: "degraded", db: "unreachable" };
  }
});

export { healthRouter };
