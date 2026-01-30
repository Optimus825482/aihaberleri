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

# Copy only package files for dependency installation
COPY package.json package-lock.json* ./

# FIX: npm install without --include=dev causes devDeps to be pruned!
# Must install ALL packages in single command OR use --include=dev on each install
RUN npm ci --include=dev --legacy-peer-deps --network-timeout=300000 && \
    npm install tailwindcss@3.4.19 postcss autoprefixer sharp@0.33.5 --include=dev --legacy-peer-deps && \
    echo "Package count:" && ls -1 node_modules | wc -l && \
    ls node_modules/tailwindcss/package.json && echo "✓ tailwindcss INSTALLED" && \
    ls node_modules/sharp/package.json && echo "✓ sharp INSTALLED"

# ===========================
# BUILDER STAGE (APP)
# ===========================
FROM base AS app-builder
WORKDIR /app

# Install build dependencies (openssl required for Prisma)
RUN apk add --no-cache openssl openssl-dev python3 make g++ vips-dev

# CRITICAL ORDER: Copy source files FIRST, then overlay node_modules
# This ensures deps stage node_modules is NOT overwritten by COPY . .

# Step 1: Copy ALL source files (excluding node_modules via .dockerignore)
COPY . .

# Step 2: Overlay node_modules from deps stage (overwrites any partial copies)
COPY --from=deps /app/node_modules ./node_modules

# Verify tailwindcss exists (debugging module not found issue)
RUN ls -la node_modules/tailwindcss/ || echo "TAILWINDCSS MISSING!"
RUN ls -la src/components/ui/ || echo "UI COMPONENTS MISSING!"

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
# APP RUNNER STAGE (Alpine for binary compatibility with deps stage)
# ===========================
FROM node:20-alpine AS runner

# Install runtime dependencies (Alpine packages)
RUN apk add --no-cache \
    openssl \
    curl \
    ca-certificates \
    python3 \
    py3-pip \
    vips \
    vips-dev \
    libc6-compat

WORKDIR /app

# Setup Python venv for edge-tts
RUN python3 -m venv /app/venv
RUN /app/venv/bin/pip install edge-tts

# Create user (Alpine syntax)
RUN addgroup -S -g 1001 nodejs && \
    adduser -S -u 1001 -h /home/nextjs -s /bin/sh -G nodejs nextjs && \
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

# Copy sharp and @img from deps (Alpine-compiled binaries)
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/sharp ./node_modules/sharp
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/@img ./node_modules/@img

# Copy ALL socket.io related modules (has many transitive deps)
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/socket.io ./node_modules/socket.io
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/socket.io-parser ./node_modules/socket.io-parser
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/socket.io-adapter ./node_modules/socket.io-adapter
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/engine.io ./node_modules/engine.io
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/engine.io-parser ./node_modules/engine.io-parser
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/ws ./node_modules/ws
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/accepts ./node_modules/accepts
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/base64id ./node_modules/base64id
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/cookie ./node_modules/cookie
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/cors ./node_modules/cors
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/debug ./node_modules/debug
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/ms ./node_modules/ms
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/mime-types ./node_modules/mime-types
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/mime-db ./node_modules/mime-db
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/negotiator ./node_modules/negotiator
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/object-assign ./node_modules/object-assign
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/vary ./node_modules/vary

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
