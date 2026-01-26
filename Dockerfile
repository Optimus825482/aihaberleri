# Production-optimized Dockerfile (King Mode)

# Stage 1: Dependencies
FROM node:20.18-slim AS deps
# Install essentials for Prisma and Sharp
RUN apt-get update && apt-get install -y openssl ca-certificates libc6 curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Memory & Network Optimization for NPM
ENV NPM_CONFIG_LOGLEVEL=warn
ENV NPM_CONFIG_PROGRESS=false
ENV NPM_CONFIG_FUND=false
ENV NPM_CONFIG_AUDIT=false

# Copy package files
COPY package.json package-lock.json* ./

# Install ALL dependencies (including devDeps for build)
# Use legacy-peer-deps if needed, and optimize for low RAM
RUN npm ci --network-timeout=100000 --prefer-offline

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
# Dummy DB URL for build time
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"

# Set Node memory limit for build process
ENV NODE_OPTIONS="--max-old-space-size=2048"

RUN npm run build

# Stage 3: Runner
FROM node:20.18-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Install runtime dependencies
RUN apt-get update && apt-get install -y openssl curl ca-certificates && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application (Standalone mode)
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

# Copy scripts and necessary node_modules for runtime scripts (Agent worker etc)
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# If you use tsx for background workers, ensure they have access to necessary deps
# Note: Next.js standalone bundles almost everything, but custom scripts might need more.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/tsx ./node_modules/tsx
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/esbuild ./node_modules/esbuild
# Optional: if scripts need other node_modules, you might need to copy more or use a separate worker container

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
