// koa-bodyparser adds a `body` property to ctx.request at runtime;
// this augmentation makes TypeScript aware of it.
import "koa";

declare module "koa" {
  interface Request {
    body?: unknown;
  }
}
