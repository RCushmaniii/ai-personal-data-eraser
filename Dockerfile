# Stage 1: Build dashboard
FROM oven/bun:1 AS dashboard-builder
WORKDIR /app/dashboard
COPY src/dashboard/app/package.json src/dashboard/app/bun.lock ./
RUN bun install --frozen-lockfile
COPY src/dashboard/app/ ./
RUN bun run build

# Stage 2: Install production dependencies
FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# Stage 3: Runtime
FROM oven/bun:1-slim AS runtime
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=dashboard-builder /app/dashboard/dist ./src/dashboard/app/dist
COPY package.json ./
COPY src/ ./src/
COPY .env.example ./

RUN mkdir -p /app/data/vault && chown -R bun:bun /app/data

ENV DASHBOARD_HOST=0.0.0.0
ENV DB_PATH=/app/data/ai-eraser.db
ENV VAULT_DATA_DIR=/app/data/vault

USER bun
EXPOSE 3847

ENTRYPOINT ["bun", "run", "src/cli/index.ts"]
CMD ["dashboard"]
