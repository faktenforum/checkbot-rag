import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { claimStatsService } from "@checkbot/core";
import type { McpResult } from "../types.js";
import { text } from "../types.js";

export const registerListCategoriesTool = (server: McpServer): void => {
  server.registerTool(
    "list_categories",
    {
      description: "List all available fact-check categories with their claim counts.",
    },
    async (): Promise<McpResult> => {
      try {
        const rows = await claimStatsService.listCategories();
        const body = rows
          .map((r) => `- ${r.category}: ${r.count} fact-checks`)
          .join("\n");

        return {
          content: [text(`## Available categories\n\n${body || "No categories found"}`)],
        };
      } catch (err) {
        return { content: [text(`Error: ${(err as Error).message}`)], isError: true };
      }
    }
  );
};

