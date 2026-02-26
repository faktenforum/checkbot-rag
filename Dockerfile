# Build Nuxt app (frontend + server API) with workspace core
FROM oven/bun:1-alpine AS builder

WORKDIR /build

COPY package.json bun.lock* ./
COPY frontend/package.json frontend/package-lock.json* ./frontend/
COPY core/package.json ./core/
COPY mcp/package.json ./mcp/
RUN bun install --frozen-lockfile

COPY frontend/ ./frontend/
COPY core/ ./core/
COPY mcp/ ./mcp/
RUN bun run --cwd frontend build

# Production image
FROM node:24-alpine AS runtime

WORKDIR /app

COPY --from=builder /build/frontend/.output ./.output

RUN mkdir -p /data/exports

EXPOSE 3020

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -q --spider http://localhost:3020/health || exit 1

ENV NODE_ENV=production
ENV PORT=3020
ENV HOST=0.0.0.0

CMD ["node", ".output/server/index.mjs"]
