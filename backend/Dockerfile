# Standalone backend image (no frontend). For full stack use root Dockerfile.
FROM oven/bun:1-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN bun install
COPY . .
RUN bun run build

FROM oven/bun:1-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
RUN bun install --production
COPY --from=builder /app/.output ./.output
EXPOSE 3020
CMD ["bun", ".output/server/index.mjs"]
