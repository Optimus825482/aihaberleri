#!/bin/sh
set -e

PRISMA_VERSION="5.22.0"

echo "🔄 Running Prisma migrations..."

# migrate deploy: production-safe, sadece pending migration'ları uygular
if npx prisma@${PRISMA_VERSION} migrate deploy 2>&1; then
  echo "✅ Migrations complete"
else
  echo "⚠️ migrate deploy failed, trying db push as fallback..."
  if npx prisma@${PRISMA_VERSION} db push --skip-generate 2>&1; then
    echo "✅ db push complete"
  else
    echo "❌ Database migration failed — exiting"
    exit 1
  fi
fi

echo "🚀 Starting server..."
exec "$@"
