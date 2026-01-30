# syntax=docker/dockerfile:1

# ===========================
# BASE STAGE
# ===========================
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# ===========================
# DEPENDENCIES STAGE
# ===========================
FROM base AS deps
RUN apk add --no-cache python3 make g++ vips-dev openssl

COPY package.json package-lock.json* ./

# Install all dependencies
RUN npm ci --include=dev --legacy-peer-deps --network-timeout=300000 && \
    npm install sharp@0.33.5 --legacy-peer-deps --include=dev && \
    echo "✓ Packages installed: $(ls -1 node_modules | wc -l)"

# ===========================
# APP BUILDER STAGE
# ===========================
FROM base AS app-builder
WORKDIR /app

RUN apk add --no-cache openssl openssl-dev python3 make g++ vips-dev

# Copy source files first, then node_modules
COPY . .
COPY --from=deps /app/node_modules ./node_modules

# Generate Prisma Client (locked to v5.22.0)
RUN npx prisma@5.22.0 generate

# Build with dummy env vars
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ENV REDIS_URL="redis://localhost:6379"
ENV NEXTAUTH_SECRET="build-secret"
ENV NEXTAUTH_URL="http://localhost:3000"
ENV NODE_ENV=production

RUN npm run build

# ===========================
# WORKER BUILDER STAGE
# ===========================
FROM base AS worker-builder
WORKDIR /app

RUN apk add --no-cache openssl python3 make g++

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma@5.22.0 generate

# ===========================
# APP RUNNER STAGE
# ===========================
FROM node:20-bookworm-slim AS runner

RUN apt-get update && apt-get install -y \
    openssl curl ca-certificates python3 python3-pip python3-venv \
    libvips-dev libvips42 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Setup Python venv
RUN python3 -m venv /app/venv && \
    /app/venv/bin/pip install edge-tts

# Create user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --home /home/nextjs --shell /bin/sh nextjs && \
    mkdir -p /home/nextjs/.npm /home/nextjs/.cache && \
    chown -R nextjs:nodejs /home/nextjs

# Copy standalone build
COPY --from=app-builder --chown=nextjs:nodejs /app/public ./public
COPY --from=app-builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=app-builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=app-builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=app-builder --chown=nextjs:nodejs /app/src/lib/tts_engine.py ./src/lib/tts_engine.py
COPY --from=app-builder --chown=nextjs:nodejs /app/server.js ./server.js
COPY --from=app-builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=app-builder --chown=nextjs:nodejs /app/scripts ./scripts

# Copy ENTIRE node_modules from deps (no missing packages!)
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy generated Prisma client from builder
COPY --from=app-builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

# Reinstall sharp for Debian runtime (glibc vs musl)
RUN npm install sharp@0.33.5 --legacy-peer-deps --os=linux --cpu=x64 2>/dev/null || true

# Regenerate Prisma for Debian runtime
RUN npx prisma@5.22.0 generate

# Clean up dev-only packages to reduce image size
RUN rm -rf ./node_modules/.cache \
    ./node_modules/typescript \
    ./node_modules/@next/swc-linux-arm* \
    ./node_modules/@next/swc-darwin* \
    ./node_modules/@next/swc-win32* \
    2>/dev/null || true

ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000
ENV PATH="/app/venv/bin:$PATH"

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]

# ===========================
# WORKER RUNNER STAGE
# ===========================
FROM node:20-bookworm-slim AS worker-runner

RUN apt-get update && apt-get install -y \
    openssl ca-certificates libvips-dev libvips42 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --home /home/worker --shell /bin/sh worker && \
    mkdir -p /home/worker/.npm /home/worker/.cache /tmp/tsx-1001 && \
    chown -R worker:nodejs /home/worker /tmp/tsx-1001

# Copy ENTIRE node_modules
COPY --from=deps --chown=worker:nodejs /app/node_modules ./node_modules

# Copy generated Prisma client
COPY --from=worker-builder --chown=worker:nodejs /app/node_modules/.prisma ./node_modules/.prisma

# Copy worker source files
COPY --from=worker-builder --chown=worker:nodejs /app/prisma ./prisma
COPY --from=worker-builder --chown=worker:nodejs /app/src ./src
COPY --from=worker-builder --chown=worker:nodejs /app/tsconfig.json ./tsconfig.json
COPY --from=worker-builder --chown=worker:nodejs /app/package.json ./package.json

# Reinstall sharp for Debian runtime
RUN npm install sharp@0.33.5 --legacy-peer-deps --os=linux --cpu=x64 2>/dev/null || true

# Regenerate Prisma for Debian runtime
RUN npx prisma@5.22.0 generate

ENV NODE_ENV=production
ENV TSX_TSCONFIG_PATH="/app/tsconfig.json"
ENV XDG_CACHE_HOME="/tmp/tsx-1001"

USER worker
EXPOSE 3001

CMD ["npx", "tsx", "src/workers/news-agent.worker.ts"]
