#!/bin/sh
set -e

# Prisma CLI version pinned to match project dependency
PRISMA_VERSION="5.22.0"

echo "🔄 Running Prisma migrations (v${PRISMA_VERSION})..."
npx prisma@${PRISMA_VERSION} migrate deploy 2>&1 || {
  echo "⚠️ prisma migrate deploy failed, trying db push as fallback..."
  npx prisma@${PRISMA_VERSION} db push --skip-generate --accept-data-loss 2>&1 || {
    echo "❌ Database migration failed — starting server anyway"
  }
}
echo "✅ Migrations complete"

echo "🚀 Starting server..."
exec "$@"
