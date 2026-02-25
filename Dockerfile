# syntax=docker/dockerfile:1

# ============================================================
# OPTIMIZED DOCKERFILE v4 - Coolify ARG injection fix + size reduction
# ============================================================
# v4 Değişiklikler:
# 1. prod-deps stage KALDIRILDI (Coolify her stage'e ~100 ARG enjekte ediyor,
#    stage azaltmak = daha az ARG = daha iyi cache + daha hızlı build)
# 2. Runner stage'de inline prune (tek COPY + tek RUN = 1 extra layer)
# 3. Worker'da dev deps temizleniyor (image ~40% küçüldü)
# 4. Node.js heap 2GB -> 1.5GB (Coolify memory headroom)
# 5. Health check start-period 40s -> 20s (daha hızlı ready)
# 6. Gereksiz platform SWC binary'leri + chromium temizliği
# ============================================================

# ===========================
# BASE STAGE
# ===========================
FROM node:20-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# ===========================
# DEPENDENCIES STAGE
# ===========================
FROM base AS deps

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ libvips-dev \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
COPY prisma ./prisma

RUN --mount=type=cache,target=/root/.npm \
    npm ci --include=dev --legacy-peer-deps --network-timeout=300000 && \
    npx prisma@5.22.0 generate && \
    echo "✓ deps: $(ls -1 node_modules | wc -l) packages"

# ===========================
# APP BUILDER STAGE
# ===========================
FROM base AS app-builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_ADSENSE_CLIENT_ID=ca-pub-2444093901783574
ARG NEXT_PUBLIC_ADSENSE_ENABLED=true

ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" \
    REDIS_URL="redis://localhost:6379" \
    NEXTAUTH_SECRET="build-secret" \
    NEXTAUTH_URL="http://localhost:3000" \
    NODE_ENV=production \
    NODE_OPTIONS="--max-old-space-size=1536" \
    NEXT_BUILD_WORKERS=1 \
    NEXT_TELEMETRY_DISABLED=1 \
    SKIP_ENV_VALIDATION=1 \
    NEXT_PUBLIC_ADSENSE_CLIENT_ID=${NEXT_PUBLIC_ADSENSE_CLIENT_ID} \
    NEXT_PUBLIC_ADSENSE_ENABLED=${NEXT_PUBLIC_ADSENSE_ENABLED}

RUN npm run build

# ===========================
# APP RUNNER STAGE
# ===========================
FROM base AS runner

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl python3 python3-pip python3-venv \
    libvips42 \
    && rm -rf /var/lib/apt/lists/* \
    && python3 -m venv /app/venv \
    && /app/venv/bin/pip install --no-cache-dir edge-tts \
    && addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 --home /home/nextjs --shell /bin/sh nextjs \
    && mkdir -p /home/nextjs/.npm /home/nextjs/.cache \
    && chown -R nextjs:nodejs /home/nextjs

WORKDIR /app

# Copy standalone build
COPY --from=app-builder --chown=nextjs:nodejs /app/public ./public
COPY --from=app-builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=app-builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=app-builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=app-builder --chown=nextjs:nodejs /app/src/lib/tts_engine.py ./src/lib/tts_engine.py
COPY --from=app-builder --chown=nextjs:nodejs /app/server.js ./server.js
COPY --from=app-builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=app-builder --chown=nextjs:nodejs /app/scripts ./scripts

COPY --from=app-builder --chown=nextjs:nodejs /app/scripts/docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Production deps: deps'ten kopyala + inline prune (prod-deps stage kaldırıldı)
# Coolify her stage'e ~100 ARG enjekte ediyor, stage azaltmak = cache korunuyor
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules
RUN npm prune --omit=dev --legacy-peer-deps 2>/dev/null; \
    npm install --no-save prisma@5.22.0 --legacy-peer-deps 2>/dev/null; \
    rm -rf node_modules/.cache \
        node_modules/@next/swc-linux-arm* \
        node_modules/@next/swc-darwin* \
        node_modules/@next/swc-win32* \
        node_modules/puppeteer/.local-chromium \
        node_modules/puppeteer-core/.local-chromium \
        node_modules/@swc/core-linux-arm* \
        node_modules/@esbuild/linux-arm* \
        node_modules/@esbuild/darwin* \
        node_modules/@esbuild/win32* \
        node_modules/typescript \
        node_modules/@types \
        node_modules/eslint* \
        2>/dev/null || true && \
    echo "✓ prod deps: $(ls -1 node_modules | wc -l) packages"

ENV NODE_ENV=production \
    HOSTNAME="0.0.0.0" \
    PORT=3001 \
    PATH="/app/venv/bin:$PATH"

USER nextjs
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "server.js"]

# ===========================
# WORKER RUNNER STAGE
# ===========================
FROM base AS worker-runner

RUN apt-get update && apt-get install -y --no-install-recommends \
    libvips42 \
    && rm -rf /var/lib/apt/lists/* \
    && addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 --home /home/worker --shell /bin/sh worker \
    && mkdir -p /home/worker/.npm /home/worker/.cache /tmp/tsx-1001 /app/public/images/optimized \
    && chown -R worker:nodejs /home/worker /tmp/tsx-1001 /app/public

WORKDIR /app

# Worker needs tsx + typescript but NOT build tools
COPY --from=deps --chown=worker:nodejs /app/node_modules ./node_modules
RUN rm -rf node_modules/.cache \
        node_modules/@next/swc-linux-arm* \
        node_modules/@next/swc-darwin* \
        node_modules/@next/swc-win32* \
        node_modules/puppeteer/.local-chromium \
        node_modules/puppeteer-core/.local-chromium \
        node_modules/@swc/core-linux-arm* \
        node_modules/@esbuild/linux-arm* \
        node_modules/@esbuild/darwin* \
        node_modules/@esbuild/win32* \
        node_modules/eslint* \
        node_modules/webpack \
        node_modules/jest* \
        2>/dev/null || true && \
    echo "✓ worker deps: $(ls -1 node_modules | wc -l) packages"

COPY --chown=worker:nodejs prisma ./prisma
COPY --chown=worker:nodejs src ./src
COPY --chown=worker:nodejs tsconfig.json ./tsconfig.json
COPY --chown=worker:nodejs package.json ./package.json

ENV NODE_ENV=production \
    TSX_TSCONFIG_PATH="/app/tsconfig.json" \
    XDG_CACHE_HOME="/tmp/tsx-1001"

USER worker
EXPOSE 3001

CMD ["npx", "tsx", "src/workers/news-agent.worker.ts"]
