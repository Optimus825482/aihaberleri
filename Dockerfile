# Production-optimized Dockerfile (King Mode v2)
# Build timestamp: 2026-01-28 20:30

# Stage 1: Dependencies
FROM node:20.18-slim AS deps
RUN apt-get update && apt-get install -y openssl ca-certificates libc6 curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Ensure we install ALL dependencies for build
ENV NODE_ENV=development

# Copy package files
COPY package.json package-lock.json* .npmrc* ./

# Install ALL dependencies (including devDependencies) for build
# Using npm ci for reliable, exact versions based on lockfile
RUN npm ci --include=dev --network-timeout=100000

# Install sharp separately with legacy-peer-deps (prevents dependency conflicts)
# This ensures sharp is available for Next.js image optimization during build
RUN npm install --legacy-peer-deps sharp@0.33.5

# Stage 2: Builder
FROM node:20.18-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js
ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_ENV_VALIDATION=1
ENV NODE_ENV=production

# Mock environment variables for build to prevent ENOTFOUND etc.
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ENV REDIS_URL="redis://localhost:6379"
ENV NEXTAUTH_SECRET="dummy-secret-for-build"
ENV NEXTAUTH_URL="http://localhost:3000"

# Set Node memory limit for build process (Adjusted to 2GB for stability on smaller VPS)
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Run build
RUN npm run build

# Stage 3: Runner
FROM node:20.18-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Install runtime dependencies including sharp dependencies
RUN apt-get update && apt-get install -y \
    openssl \
    curl \
    ca-certificates \
    python3 \
    python3-pip \
    python3-venv \
    # Sharp native dependencies (required for image optimization)
    libvips-dev \
    libvips42 \
    && rm -rf /var/lib/apt/lists/*

# Install edge-tts for Audio Suite
RUN python3 -m venv /app/venv
ENV PATH="/app/venv/bin:$PATH"
RUN pip install edge-tts

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application (Standalone mode)
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/src/lib/tts_engine.py ./src/lib/tts_engine.py

# Copy custom server for Socket.io
COPY --from=builder --chown=nextjs:nodejs /app/server.js ./server.js

# Copy package.json for reference
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/package-lock.json* ./

# Copy sharp from builder (already installed with correct architecture)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/sharp ./node_modules/sharp

# Copy Socket.io dependencies for custom server.js
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/socket.io ./node_modules/socket.io
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/socket.io-client ./node_modules/socket.io-client
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/socket.io-parser ./node_modules/socket.io-parser
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/engine.io ./node_modules/engine.io
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/engine.io-parser ./node_modules/engine.io-parser
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/ws ./node_modules/ws

# Copy scripts and necessary node_modules for runtime scripts (Agent worker etc)
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts

# Specialized copy for tools used in scripts
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/tsx ./node_modules/tsx
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/esbuild ./node_modules/esbuild

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
