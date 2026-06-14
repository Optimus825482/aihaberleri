#!/bin/sh
set -e

PRISMA_VERSION="5.22.0"
RUN_PRISMA_MIGRATIONS="${RUN_PRISMA_MIGRATIONS:-false}"

echo "📂 Running SQL migration files (migrations/*.sql)..."
if node scripts/run-sql-migrations.js; then
  echo "✅ SQL migrations complete"
else
  echo "⚠️ Some SQL migrations had non-fatal errors, continuing..."
fi

if [ "$RUN_PRISMA_MIGRATIONS" = "true" ]; then
  echo "🔄 Running Prisma migrations..."

  # migrate deploy: production-safe, sadece pending migration'ları uygular
  if npx prisma@${PRISMA_VERSION} migrate deploy 2>&1; then
    echo "✅ Prisma migrations complete"
  else
    echo "⚠️ migrate deploy failed, trying db push as fallback..."
    if npx prisma@${PRISMA_VERSION} db push --skip-generate 2>&1; then
      echo "✅ db push complete"
    else
      echo "❌ Database migration failed — exiting"
      exit 1
    fi
  fi
else
  echo "⏭️ Skipping Prisma migrations (RUN_PRISMA_MIGRATIONS=false)"
fi

echo "🚀 Starting server..."
exec "$@"
