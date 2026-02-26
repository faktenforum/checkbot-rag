## @checkbot/mcp

Reusable Model Context Protocol (MCP) server for Checkbot RAG. This package wires the MCP SDK to the `@checkbot/core` services and exposes tools for searching and inspecting Faktenforum fact-checks.

It is used by the Nuxt Nitro route at `/mcp` and can also be embedded in other Node.js HTTP servers.

### Tools

The server registers three tools:

| Tool | Description |
|------|-------------|
| `search_factchecks` | Hybrid semantic plus full-text search over fact-checks. Returns a Markdown summary list. |
| `get_factcheck` | Fetches a single fact-check by ID or short ID. Returns a Markdown detail view. |
| `list_categories` | Lists all categories with the number of fact-checks per category. |

#### `search_factchecks`

- **Description**: Search fact-checks using the hybrid search from `@checkbot/core`.
- **Input**:
  - `query` (`string`, required) - search query.
  - `limit` (`number`, optional, default `5`) - number of results (`1–20`).
  - `categories` (`string[]`, optional) - filter by categories.
  - `rating_label` (`string`, optional) - filter by rating label.
  - `language` (`string`, optional) - FTS language code (e.g. `de`, `en`, `fr`). Default `auto` is not supported; pass an explicit code.

The tool returns a single Markdown block containing:

- A short header with the query and total matches.
- A numbered list of fact-checks with rating, optional summary, source URL, categories, and a relevant excerpt when available.

#### `get_factcheck`

- **Description**: Fetch full details of a fact-check.
- **Input**:
  - `id` (`string`, required) - claim UUID or short ID (for example `2025/11/20-2`).

The tool returns a Markdown block with:

- Synopsis or short ID as heading.
- ID, rating, and status.
- Rating summary and statement when present.
- Source URL and categories.

#### `list_categories`

- **Description**: List all categories and their claim counts.
- **Input**: none.

The tool returns a Markdown list of `- <category>: <count> fact-checks`.

### HTTP transport and sessions

`@checkbot/mcp` uses `StreamableHTTPServerTransport` from `@modelcontextprotocol/sdk` and supports stateful sessions via the `mcp-session-id` header.

The Nuxt integration in `frontend` exposes the MCP server at:

- `POST /mcp` - HTTP/SSE transport, optional authentication via `CHECKBOT_RAG_MCP_API_KEY`.

If `CHECKBOT_RAG_MCP_API_KEY` is set, requests must include:

```http
Authorization: Bearer <CHECKBOT_RAG_MCP_API_KEY>
```

### Embedding in another HTTP server

You can reuse the MCP server outside of Nuxt by calling `createMcpServer` and `handleMcpRequest`:

```ts
import http from "node:http";
import { handleMcpRequest } from "@checkbot/mcp";

const server = http.createServer(async (req, res) => {
  if (req.url === "/mcp" && req.method === "POST") {
    await handleMcpRequest(req, res, undefined);
    return;
  }

  res.statusCode = 404;
  res.end("Not found");
});

server.listen(3020);
```

This setup behaves like the Nuxt route: each client can keep a long-lived MCP session by reusing the same `mcp-session-id` header value.

