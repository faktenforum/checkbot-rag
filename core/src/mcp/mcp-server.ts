import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { searchService } from "../services/SearchService.js";
import { db } from "../services/DatabaseService.js";

type McpResult = { content: Array<{ type: "text"; text: string }>; isError?: boolean };

const text = (t: string): { type: "text"; text: string } => ({ type: "text", text: t });

interface SessionEntry {
  transport: StreamableHTTPServerTransport;
}

const sessions = new Map<string, SessionEntry>();

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "checkbot-rag",
    version: "1.0.0",
  });

  server.registerTool(
    "search_factchecks",
    {
      description:
        "Search German fact-checks from Faktenforum using hybrid semantic and full-text search. Returns relevant fact-checks ranked by relevance.",
      inputSchema: {
        query: z.string().describe("Search query in German or English"),
        limit: z.number().optional().default(5).describe("Number of results (1-20, default: 5)"),
        categories: z.array(z.string()).optional().describe("Filter by categories"),
        rating_label: z.string().optional().describe("Filter by rating label"),
      } as any,
    },
    async (args: any): Promise<McpResult> => {
      const { query, limit, categories, rating_label } = args as {
        query: string;
        limit?: number;
        categories?: string[];
        rating_label?: string;
      };
      try {
        const result = await searchService.search({
          query,
          limit: Math.min(limit ?? 5, 20),
          categories,
          ratingLabel: rating_label,
          chunkType: "all",
        });

        if (result.claims.length === 0) {
          return { content: [text(`No fact-checks found for query: "${query}"`)] };
        }

        const formatted = result.claims
          .map((claim, i) => {
            const lines = [
              `**${i + 1}. ${claim.synopsis ?? claim.shortId}**`,
              `- Urteil: ${claim.ratingLabel ?? "unbekannt"}`,
            ];
            if (claim.ratingSummary) lines.push(`- ${claim.ratingSummary}`);
            if (claim.publishingUrl) lines.push(`- Quelle: ${claim.publishingUrl}`);
            if (claim.categories.length > 0)
              lines.push(`- Kategorien: ${claim.categories.join(", ")}`);

            const bestChunk = claim.chunks.sort((a, b) => b.rrfScore - a.rrfScore)[0];
            if (bestChunk && bestChunk.chunkType === "fact_detail") {
              const excerpt = bestChunk.content.slice(0, 500);
              lines.push(
                `\n*Relevanter Ausschnitt:*\n> ${excerpt}${bestChunk.content.length > 500 ? "..." : ""}`
              );
            }

            return lines.join("\n");
          })
          .join("\n\n---\n\n");

        return {
          content: [
            text(
              `## Faktencheck-Ergebnisse für: "${query}"\n\nGefunden: ${result.totalResults} Faktenchecks\n\n${formatted}`
            ),
          ],
        };
      } catch (err) {
        return { content: [text(`Search error: ${(err as Error).message}`)], isError: true };
      }
    }
  );

  server.registerTool(
    "get_factcheck",
    {
      description:
        "Get the full details of a specific fact-check by its ID or short ID (e.g. '2025/11/20-2')",
      inputSchema: {
        id: z.string().describe("Fact-check ID (UUID) or short ID (e.g. '2025/11/20-2')"),
      } as any,
    },
    async (args: any): Promise<McpResult> => {
      const { id } = args as { id: string };
      try {
        const { rows } = await db.query(
          `SELECT c.external_id, c.short_id, c.synopsis, c.rating_label,
                  c.rating_statement, c.rating_summary, c.categories,
                  c.publishing_url, c.publishing_date, c.status,
                  c.raw_data
           FROM claims c
           WHERE c.external_id = $1 OR c.short_id = $1`,
          [id]
        );

        if (rows.length === 0) {
          return { content: [text(`Fact-check not found: ${id}`)], isError: true };
        }

        const claim = rows[0] as Record<string, unknown>;
        const lines = [
          `## Faktencheck: ${claim.synopsis ?? claim.short_id}`,
          `**ID:** ${claim.short_id}`,
          `**Urteil:** ${claim.rating_label ?? "unbekannt"}`,
          `**Status:** ${claim.status}`,
        ];
        if (claim.rating_summary)
          lines.push(`\n**Zusammenfassung:**\n${claim.rating_summary}`);
        if (claim.rating_statement)
          lines.push(`\n**Einschätzung:**\n${claim.rating_statement}`);
        if (claim.publishing_url) lines.push(`\n**Quelle:** ${claim.publishing_url}`);
        if (Array.isArray(claim.categories) && claim.categories.length > 0) {
          lines.push(`**Kategorien:** ${(claim.categories as string[]).join(", ")}`);
        }

        return { content: [text(lines.join("\n"))] };
      } catch (err) {
        return { content: [text(`Error: ${(err as Error).message}`)], isError: true };
      }
    }
  );

  server.registerTool(
    "list_categories",
    {
      description: "List all available fact-check categories with their claim counts",
    },
    async (): Promise<McpResult> => {
      try {
        const { rows } = await db.query<{ category: string; count: number }>(`
          SELECT unnest(categories) AS category, COUNT(*)::int AS count
          FROM claims
          GROUP BY category
          ORDER BY count DESC
        `);

        const body = rows.map((r) => `- ${r.category}: ${r.count} Faktenchecks`).join("\n");

        return {
          content: [text(`## Verfügbare Kategorien\n\n${body || "Keine Kategorien gefunden"}`)],
        };
      } catch (err) {
        return { content: [text(`Error: ${(err as Error).message}`)], isError: true };
      }
    }
  );

  return server;
}

export type NodeReq = import("http").IncomingMessage;
export type NodeRes = import("http").ServerResponse;

export async function handleMcpRequest(
  req: NodeReq,
  res: NodeRes,
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
