import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export type McpTextContent = { type: "text"; text: string };

export type McpResult = {
  content: McpTextContent[];
  isError?: boolean;
};

export const text = (t: string): McpTextContent => ({ type: "text", text: t });

export type ToolRegistrar = (server: McpServer) => void;

