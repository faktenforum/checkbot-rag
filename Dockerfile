# Stage 1: Build Nuxt frontend (vue-router comes from Nuxt; no explicit dep avoids @nuxt/ui conflict)
FROM node:24-alpine AS frontend-builder

WORKDIR /build/frontend

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install --frozen-lockfile

COPY frontend/ ./
# generate produces .output/public/index.html for static hosting; build alone does not
RUN npm run generate

# Stage 2: Build Nitro backend (workspace with core)
FROM oven/bun:1-alpine AS backend-builder

WORKDIR /build

COPY package.json bun.lock* package-lock.json* ./
COPY backend/package.json backend/bun.lock* backend/package-lock.json* ./backend/
COPY frontend/package.json frontend/package-lock.json* ./frontend/
COPY core/package.json ./core/
RUN bun install

COPY backend/ ./backend
COPY core/ ./core
# Copy generated frontend into backend/public so Nitro serves it via its public/ handling
COPY --from=frontend-builder /build/frontend/.output/public ./backend/public
RUN bun run --cwd backend build

# Stage 3: Production image with Node.js runtime
# (Bun fails at runtime: Nitro's internal require('h3') from nitro/lib/deps/h3.mjs is not resolved.)
FROM node:24-alpine AS runtime

WORKDIR /app

COPY --from=backend-builder /build/backend/.output ./.output
# Migrations dir resolved at runtime as .output/server/../migrations
COPY --from=backend-builder /build/core/src/migrations ./.output/migrations

RUN mkdir -p /data/exports

EXPOSE 3020

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -q --spider http://localhost:3020/health || exit 1

ENV NODE_ENV=production
# Nitro server: port and bind to all interfaces (required for Docker)
ENV PORT=3020
ENV HOST=0.0.0.0

CMD ["node", ".output/server/index.mjs"]
