# Syntax for BuildKit features
# syntax=docker/dockerfile:1

# ===========================
# BASE STAGE
# ===========================
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# ===========================
# DEPENDENCIES STAGE (APP)
# ===========================
FROM base AS deps
RUN apk add --no-cache python3 make g++ vips-dev

# Copy package files AND tsconfig (needed for TypeScript aliases)
COPY package.json package-lock.json* tsconfig.json ./

# Install all dependencies including sharp (single installation)
RUN npm ci --include=dev --legacy-peer-deps --network-timeout=300000 && \
    npm install --legacy-peer-deps sharp@0.33.5

# ===========================
# BUILDER STAGE (APP)
# ===========================
FROM base AS app-builder
WORKDIR /app

# Install build dependencies (openssl required for Prisma)
RUN apk add --no-cache openssl openssl-dev python3 make g++ vips-dev

# Copy dependencies AND tsconfig from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/tsconfig.json ./tsconfig.json
COPY --from=deps /app/package.json ./package.json

# Copy critical config files first (bypass cache if changed)
COPY next.config.js ./
COPY components.json ./

# Copy all application files (includes prisma/, src/, etc.)
COPY . .

# Verify src/components exists (debugging)
RUN ls -la src/ && ls -la src/components/ || echo "components dir missing!"

# Generate Prisma Client (locked to v5.22.0 - v7 has breaking changes)
RUN npx prisma@5.22.0 generate

# Build Next.js with dummy env vars (prevents ENOTFOUND errors)
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy?schema=public"
ENV REDIS_URL="redis://localhost:6379"
ENV NEXTAUTH_SECRET="build-time-secret-not-used-in-production"
ENV NEXTAUTH_URL="http://localhost:3000"
ENV NODE_ENV=production

RUN npm run build

# ===========================
# APP RUNNER STAGE
# ===========================
FROM node:20-bookworm-slim AS runner

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    openssl \
    curl \
    ca-certificates \
    python3 \
    python3-pip \
    python3-venv \
    libvips-dev \
    libvips42 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Setup Python venv for edge-tts
RUN python3 -m venv /app/venv
RUN /app/venv/bin/pip install edge-tts

# Create user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --home /home/nextjs --shell /bin/sh nextjs && \
    mkdir -p /home/nextjs/.npm /home/nextjs/.cache && \
    chown -R nextjs:nodejs /home/nextjs

# Copy built assets from app-builder
COPY --from=app-builder --chown=nextjs:nodejs /app/public ./public
COPY --from=app-builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=app-builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=app-builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=app-builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=app-builder --chown=nextjs:nodejs /app/src/lib/tts_engine.py ./src/lib/tts_engine.py
COPY --from=app-builder --chown=nextjs:nodejs /app/server.js ./server.js
COPY --from=app-builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=app-builder --chown=nextjs:nodejs /app/scripts ./scripts

# Copy sharp from deps stage (NO RE-INSTALLATION)
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/sharp ./node_modules/sharp
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/@img ./node_modules/@img

# Set environment
ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000
ENV PATH="/app/venv/bin:$PATH"

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
