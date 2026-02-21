# Stage 1: Build Nuxt frontend (vue-router comes from Nuxt; no explicit dep avoids @nuxt/ui conflict)
FROM node:24-alpine AS frontend-builder

WORKDIR /build/frontend

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install --frozen-lockfile

COPY frontend/ ./
# generate produces .output/public/index.html for static hosting; build alone does not
RUN npm run generate

# Stage 2: Production image with Bun runtime
# Uses oven/bun for native TypeScript execution without compilation
FROM oven/bun:1-alpine AS runtime

WORKDIR /app

# Install backend dependencies
COPY backend/package.json backend/bun.lockb* ./
RUN bun install --frozen-lockfile

# Copy backend source
COPY backend/src ./src
COPY backend/tsconfig.json ./

# Copy built frontend static files from stage 1
COPY --from=frontend-builder /build/frontend/.output/public ./public

# Exports directory for import feature (mount as volume)
RUN mkdir -p /data/exports

EXPOSE 3020

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -q --spider http://localhost:3020/health || exit 1

ENV CHECKBOT_RAG_STATIC_DIR=/app/public
ENV NODE_ENV=production

CMD ["bun", "src/server.ts"]
