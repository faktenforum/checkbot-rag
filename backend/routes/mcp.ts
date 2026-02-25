import { defineHandler } from "nitro/h3";
import { handleMcpRequest } from "@checkbot/core/mcp";

export default defineHandler(async (event) => {
  const node = event.runtime?.node;
  if (!node?.req || !node?.res) {
    event.res.status = 500;
    return { error: "Node req/res not available" };
  }
  const body =
    event.req.method === "POST"
      ? (await event.req.arrayBuffer()) ?? undefined
      : undefined;
  await handleMcpRequest(node.req as any, node.res as any, body ?? undefined);
  return undefined;
});
