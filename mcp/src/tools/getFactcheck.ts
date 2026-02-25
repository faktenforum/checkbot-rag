import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { claimsService } from "@checkbot/core";
import type { McpResult } from "../types.js";
import { text } from "../types.js";
import { z } from "zod";

export const registerGetFactcheckTool = (server: McpServer): void => {
  server.registerTool(
    "get_factcheck",
    {
      description:
        "Get the full details of a specific fact-check by its ID or short ID (for example '2025/11/20-2').",
      // Use an empty input schema to avoid Zod interop issues.
      // The tool still expects an `id` field in `arguments` at runtime.
      inputSchema: z.object({ id: z.string() }),
    },
    async (args): Promise<McpResult> => {
      const { id } = args;
      try {
        const claim = (await claimsService.get(id)) as
          | (Record<string, unknown> & { categories?: string[] })
          | null;

        if (!claim) {
          return { content: [text(`Fact-check not found: ${id}`)], isError: true };
        }

        const lines = [
          `## Fact-check: ${claim.synopsis ?? claim.short_id}`,
          `**ID:** ${claim.short_id}`,
          `**Rating:** ${claim.rating_label ?? "unknown"}`,
          `**Status:** ${claim.status}`,
        ];
        if (claim.rating_summary)
          lines.push(`\n**Summary:**\n${claim.rating_summary}`);
        if (claim.rating_statement)
          lines.push(`\n**Assessment:**\n${claim.rating_statement}`);
        if (claim.publishing_url) lines.push(`\n**Source:** ${claim.publishing_url}`);
        if (Array.isArray(claim.categories) && claim.categories.length > 0) {
          lines.push(`**Categories:** ${(claim.categories as string[]).join(", ")}`);
        }

        return { content: [text(lines.join("\n"))] };
      } catch (err) {
        return { content: [text(`Error: ${(err as Error).message}`)], isError: true };
      }
    }
  );
};

