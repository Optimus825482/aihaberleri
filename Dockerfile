# syntax=docker/dockerfile:1

# ============================================================
# OPTIMIZED DOCKERFILE v5 - Deploy time optimization
# ============================================================
# v5 Değişiklikler:
# 1. prod-deps stage GERİ EKLENDİ — npm ci --omit=dev ile direkt prod deps
#    (copy+prune 66s → npm ci ~15s, net ~50s kazanç)
# 2. COPY --link kullanımı — layer caching bağımsızlığı
# 3. Runner'da npm prune KALDIRILDI — prod-deps zaten temiz
# 4. Worker prod-deps + inline tsx install (tüm deps copy yerine)
# 5. Multi-stage paralel build: deps + prod-deps aynı anda çalışır
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
# DEPENDENCIES STAGE (dev + prod — for build & worker)
# ===========================
FROM base AS deps

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ libvips-dev \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
COPY prisma ./prisma

RUN --mount=type=cache,target=/root/.npm \
    PRISMA_SKIP_POSTINSTALL_GENERATE=true npm ci --include=dev --legacy-peer-deps --network-timeout=300000 && \
    npx prisma@5.22.0 generate && \
    echo "✓ deps: $(ls -1 node_modules | wc -l) packages"

# ===========================
# PRODUCTION DEPS STAGE (prod only — deps ile PARALEL çalışır)
# ===========================
FROM base AS prod-deps

COPY package.json package-lock.json* ./
COPY prisma ./prisma

RUN --mount=type=cache,target=/root/.npm \
    PRISMA_SKIP_POSTINSTALL_GENERATE=true npm ci --omit=dev --legacy-peer-deps --network-timeout=300000 && \
    npx prisma@5.22.0 generate && \
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
        2>/dev/null || true && \
    echo "✓ prod deps: $(ls -1 node_modules | wc -l) packages"

# ===========================
# APP BUILDER STAGE
# ===========================
FROM base AS app-builder
WORKDIR /app

COPY --link --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_ADSENSE_CLIENT_ID=ca-pub-2444093901783574
ARG NEXT_PUBLIC_ADSENSE_ENABLED=true

ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" \
    REDIS_URL="redis://localhost:6379" \
    NEXTAUTH_SECRET="build-secret" \
    NEXTAUTH_URL="http://localhost:3000" \
    NODE_ENV=production \
    NODE_OPTIONS="--max-old-space-size=3072" \
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

# Production deps — direkt prod-deps stage'den (prune yok, zaten temiz)
COPY --link --from=prod-deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy standalone build
COPY --link --from=app-builder --chown=nextjs:nodejs /app/public ./public
COPY --link --from=app-builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --link --from=app-builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --link --from=app-builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --link --from=app-builder --chown=nextjs:nodejs /app/src/lib/tts_engine.py ./src/lib/tts_engine.py
COPY --link --from=app-builder --chown=nextjs:nodejs /app/server.js ./server.js
COPY --link --from=app-builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --link --from=app-builder --chown=nextjs:nodejs /app/scripts ./scripts

COPY --from=app-builder --chown=nextjs:nodejs /app/scripts/docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

ENV NODE_ENV=production \
    HOSTNAME="0.0.0.0" \
    PORT=3001 \
    PATH="/app/venv/bin:$PATH"

USER nextjs
EXPOSE 3001

HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3001/api/ready || exit 1

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

# Prod deps + tsx/typescript for running .ts files
COPY --link --from=deps --chown=worker:nodejs /app/node_modules ./node_modules
COPY --link --chown=worker:nodejs package.json package-lock.json* ./

RUN rm -rf node_modules/.cache 2>/dev/null || true && \
    echo "✓ worker deps: $(ls -1 node_modules | wc -l) packages"

COPY --link --chown=worker:nodejs prisma ./prisma
COPY --link --chown=worker:nodejs src ./src
COPY --link --chown=worker:nodejs scripts/worker-healthcheck.js ./scripts/worker-healthcheck.js
COPY --link --chown=worker:nodejs tsconfig.json ./tsconfig.json

ENV NODE_ENV=production \
    TSX_TSCONFIG_PATH="/app/tsconfig.json" \
    XDG_CACHE_HOME="/tmp/tsx-1001"

USER worker
EXPOSE 3001

CMD ["npx", "tsx", "src/workers/news-agent.worker.ts"]
