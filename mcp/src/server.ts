import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { IncomingMessage, ServerResponse } from "node:http";
import { registerSearchFactchecksTool } from "./tools/searchFactchecks.js";
import { registerGetFactcheckTool } from "./tools/getFactcheck.js";
import { registerListCategoriesTool } from "./tools/listCategories.js";

interface SessionEntry {
  transport: StreamableHTTPServerTransport;
}

const sessions = new Map<string, SessionEntry>();

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "checkbot-rag",
    version: "1.0.0",
  });

  registerSearchFactchecksTool(server);
  registerGetFactcheckTool(server);
  registerListCategoriesTool(server);

  return server;
}

export async function handleMcpRequest(
  req: IncomingMessage,
  res: ServerResponse,
  body: unknown
): Promise<void> {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  let sessionEntry = sessionId ? sessions.get(sessionId) : undefined;

  if (!sessionEntry) {
    const mcpServer = createMcpServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (id) => {
        sessions.set(id, { transport });
      },
    });

    await mcpServer.connect(transport);
    sessionEntry = { transport };
  }

  await sessionEntry.transport.handleRequest(req, res, body);
}

