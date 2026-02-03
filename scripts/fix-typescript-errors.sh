#!/bin/bash

# TypeScript Errors Fix Script
# Fixes Prisma schema sync issues

echo "🔧 TypeScript Hatalarını Düzeltme Scripti"
echo "=========================================="
echo ""

# Step 1: Prisma Generate
echo "📦 Step 1: Prisma Client Regenerate"
echo "------------------------------------"
npx prisma generate
echo "✅ Prisma client regenerated"
echo ""

# Step 2: Check Migration Status
echo "📊 Step 2: Migration Durumu Kontrol"
echo "------------------------------------"
npx prisma migrate status
echo ""

# Step 3: Apply Pending Migrations (if any)
echo "🚀 Step 3: Pending Migration'ları Uygula"
echo "------------------------------------"
npx prisma migrate deploy
echo "✅ Migrations applied"
echo ""

# Step 4: TypeScript Check
echo "🔍 Step 4: TypeScript Kontrol"
echo "------------------------------------"
npx tsc --noEmit
echo ""

echo "✅ Tüm adımlar tamamlandı!"
echo ""
echo "📋 Sonraki Adımlar:"
echo "  1. npm run build - Build kontrol"
echo "  2. npm run dev - Development server başlat"
echo "  3. Test et: /api/admin/users"
