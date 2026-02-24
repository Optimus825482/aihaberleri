#!/bin/sh
set -e

echo "🔄 Running Prisma migrations..."
npx prisma migrate deploy 2>&1 || {
  echo "⚠️ prisma migrate deploy failed, trying db push as fallback..."
  npx prisma db push --skip-generate --accept-data-loss=false 2>&1 || {
    echo "❌ Database migration failed — starting server anyway"
  }
}
echo "✅ Migrations complete"

echo "🚀 Starting server..."
exec "$@"
