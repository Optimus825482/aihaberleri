# syntax=docker/dockerfile:1

# ============================================================
# OPTIMIZED DOCKERFILE v2 - Image boyutu ~40% küçüldü
# ============================================================
# Değişiklikler:
# 1. Tek base image (Debian) = sharp/prisma rebuild yok
# 2. worker-builder stage kaldırıldı (gereksizdi)
# 3. prod-deps stage: app runner için sadece production deps
# 4. Prisma generate deps + prod-deps'te (her biri 1 kez)
# 5. npm cache mount ile tekrarlayan build'larda hız
# 6. --no-install-recommends ile küçük image
# 7. RUN katmanları birleştirildi (layer sayısı azaldı)
# 8. Dev deps (typescript, eslint, @types/*) app image'dan çıkarıldı
# ============================================================

# ===========================
# BASE STAGE (Debian = runtime ile aynı)
# ===========================
FROM node:20-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# ===========================
# DEPENDENCIES STAGE (full - build + worker için)
# ===========================
FROM base AS deps

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ libvips-dev \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
COPY prisma ./prisma

# npm cache mount: tekrarlayan build'larda paket indirme atlanır (~2-3 dk kazanç)
# Prisma generate burada 1 kez çalışır (postinstall + explicit)
RUN --mount=type=cache,target=/root/.npm \
    npm ci --include=dev --legacy-peer-deps --network-timeout=300000 && \
    npx prisma@5.22.0 generate && \
    echo "✓ Full deps installed: $(ls -1 node_modules | wc -l) packages"

# ===========================
# PRODUCTION DEPENDENCIES STAGE (lean - app runner için)
# ===========================
FROM base AS prod-deps

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ libvips-dev \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
COPY prisma ./prisma

# Sadece production deps + prisma CLI (entrypoint'te migrate deploy için)
# npm cache mount sayesinde paketler zaten cache'de, hızlı install
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --legacy-peer-deps --network-timeout=300000 && \
    npm install --no-save prisma@5.22.0 --legacy-peer-deps && \
    npx prisma@5.22.0 generate && \
    rm -rf node_modules/.cache \
        node_modules/@next/swc-linux-arm* \
        node_modules/@next/swc-darwin* \
        node_modules/@next/swc-win32* \
        2>/dev/null || true && \
    echo "✓ Prod deps installed: $(ls -1 node_modules | wc -l) packages"

# ===========================
# APP BUILDER STAGE
# ===========================
FROM base AS app-builder
WORKDIR /app

# node_modules zaten Debian'da build edildi - doğrudan kopyala
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# AdSense build args (NEXT_PUBLIC_* must be available at build time)
ARG NEXT_PUBLIC_ADSENSE_CLIENT_ID=ca-pub-2444093901783574
ARG NEXT_PUBLIC_ADSENSE_ENABLED=true

# Build with dummy env vars (tek ENV bloğu = tek layer)
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" \
    REDIS_URL="redis://localhost:6379" \
    NEXTAUTH_SECRET="build-secret" \
    NEXTAUTH_URL="http://localhost:3000" \
    NODE_ENV=production \
    NODE_OPTIONS="--max-old-space-size=4096" \
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
    # Python venv + TTS kurulumu aynı layer'da
    && python3 -m venv /app/venv \
    && /app/venv/bin/pip install --no-cache-dir edge-tts \
    # Non-root user aynı layer'da
    && addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 --home /home/nextjs --shell /bin/sh nextjs \
    && mkdir -p /home/nextjs/.npm /home/nextjs/.cache \
    && chown -R nextjs:nodejs /home/nextjs

WORKDIR /app

# Copy standalone build (minimal footprint)
COPY --from=app-builder --chown=nextjs:nodejs /app/public ./public
COPY --from=app-builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=app-builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=app-builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=app-builder --chown=nextjs:nodejs /app/src/lib/tts_engine.py ./src/lib/tts_engine.py
COPY --from=app-builder --chown=nextjs:nodejs /app/server.js ./server.js
COPY --from=app-builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=app-builder --chown=nextjs:nodejs /app/scripts ./scripts

# Entrypoint: auto-migrate on deploy
COPY --from=app-builder --chown=nextjs:nodejs /app/scripts/docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# node_modules PRODUCTION ONLY (dev deps excluded = ~40% smaller image)
# Bu değişiklik exit code 255 hatasını çözer (image export sırasında disk/memory overflow)
COPY --from=prod-deps --chown=nextjs:nodejs /app/node_modules ./node_modules

ENV NODE_ENV=production \
    HOSTNAME="0.0.0.0" \
    PORT=3001 \
    PATH="/app/venv/bin:$PATH"

USER nextjs
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
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

# Worker needs FULL deps (tsx + typescript for runtime TS execution)
COPY --from=deps --chown=worker:nodejs /app/node_modules ./node_modules

# Worker source files - doğrudan context'ten kopyala (worker-builder stage kaldırıldı)
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
