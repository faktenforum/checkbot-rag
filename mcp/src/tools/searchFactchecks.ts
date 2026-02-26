import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { searchService } from "@checkbot/core";
import type { McpResult } from "../types.js";
import { text } from "../types.js";

const LanguageSchema = z.enum([
  "auto",
  "de",
  "en",
  "fr",
  "es",
  "it",
  "pt",
  "nl",
  "da",
  "fi",
  "no",
  "nb",
  "nn",
  "ru",
  "sv",
  "tr",
  "ro",
  "hu",
  "id",
]);

type SearchLanguage = z.infer<typeof LanguageSchema>;

export const registerSearchFactchecksTool = (server: McpServer): void => {
  server.registerTool(
    "search_factchecks",
    {
      description:
        "Search fact-checks from Faktenforum using hybrid semantic and full-text search. Returns relevant fact-checks ranked by relevance.",
      inputSchema: {
        query: z.string().describe("Search query (user language, e.g. de, en, fr, ...)"),
        limit: z.number().optional().default(5).describe("Number of results (1-20, default: 5)"),
        categories: z.array(z.string()).optional().describe("Filter by categories"),
        rating_label: z.string().optional().describe("Filter by rating label"),
        language: LanguageSchema
          .optional()
          .describe(
            "Optional search language for the query (e.g. 'de', 'en', 'fr'). If omitted, defaults to 'auto'."
          ),
      },
    },
    async (args): Promise<McpResult> => {
      const { query, limit, categories, rating_label, language } = args as {
        query: string;
        limit?: number;
        categories?: string[];
        rating_label?: string;
        language?: SearchLanguage;
      };
      try {
        const result = await searchService.search({
          query,
          limit: Math.min(limit ?? 5, 20),
          categories,
          ratingLabel: rating_label,
          chunkType: "all",
          language: language ?? "auto",
        });

        if (result.claims.length === 0) {
          return { content: [text(`No fact-checks found for query: "${query}"`)] };
        }

        const formatted = result.claims
          .map((claim, i) => {
            const lines = [
              `**${i + 1}. ${claim.synopsis ?? claim.shortId}**`,
              `- Rating: ${claim.ratingLabel ?? "unknown"}`,
            ];
            if (claim.ratingSummary) lines.push(`- ${claim.ratingSummary}`);
            if (claim.publishingUrl) lines.push(`- Source: ${claim.publishingUrl}`);
            if (claim.categories.length > 0)
              lines.push(`- Categories: ${claim.categories.join(", ")}`);

            const bestChunk = claim.chunks.sort(
              (a, b) => b.rrfScore - a.rrfScore
            )[0];
            if (bestChunk && bestChunk.chunkType === "fact_detail") {
              const excerpt = bestChunk.content.slice(0, 500);
              lines.push(
                `\n*Relevant excerpt:*\n> ${excerpt}${
                  bestChunk.content.length > 500 ? "..." : ""
                }`
              );
            }

            return lines.join("\n");
          })
          .join("\n\n---\n\n");

        return {
          content: [
            text(
              `## Fact-check results for: "${query}"\n\nFound: ${result.totalResults} fact-checks\n\n${formatted}`
            ),
          ],
        };
      } catch (err) {
        const message = (err as Error).message;
        if (
          (language === undefined || language === "auto") &&
          message.includes("Search language 'auto' is not supported yet")
        ) {
          return {
            content: [
              text(
                "Search language 'auto' is not supported yet; please pass an explicit language code (e.g. 'de' or 'en')."
              ),
            ],
            isError: true,
          };
        }
        return { content: [text(`Search error: ${message}`)], isError: true };
      }
    }
  );
};

