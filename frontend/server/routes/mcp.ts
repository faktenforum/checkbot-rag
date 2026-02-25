import { handleMcpRequest } from "@checkbot/mcp";

export default defineEventHandler(async (event) => {
  const node = event.node;
  if (!node?.req || !node?.res) {
    setResponseStatus(event, 500);
    return { error: "Node req/res not available" };
  }

  await handleMcpRequest(node.req, node.res, undefined);
});


