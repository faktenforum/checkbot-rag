import { handleMcpRequest } from "@checkbot/core/mcp";

export default defineEventHandler(async (event) => {
  const node = event.node;
  if (!node?.req || !node?.res) {
    setResponseStatus(event, 500);
    return { error: "Node req/res not available" };
  }
  const body =
    event.method === "POST" ? await readRawBody(event) ?? undefined : undefined;
  await handleMcpRequest(node.req, node.res, body);
});
