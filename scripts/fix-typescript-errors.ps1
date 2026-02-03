# TypeScript Errors Fix Script (PowerShell)
# Fixes Prisma schema sync issues

Write-Host "🔧 TypeScript Hatalarını Düzeltme Scripti" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Prisma Generate
Write-Host "📦 Step 1: Prisma Client Regenerate" -ForegroundColor Yellow
Write-Host "------------------------------------" -ForegroundColor Yellow
npx prisma generate
Write-Host "✅ Prisma client regenerated" -ForegroundColor Green
Write-Host ""

# Step 2: Check Migration Status
Write-Host "📊 Step 2: Migration Durumu Kontrol" -ForegroundColor Yellow
Write-Host "------------------------------------" -ForegroundColor Yellow
npx prisma migrate status
Write-Host ""

# Step 3: Apply Pending Migrations (if any)
Write-Host "🚀 Step 3: Pending Migration'ları Uygula" -ForegroundColor Yellow
Write-Host "------------------------------------" -ForegroundColor Yellow
npx prisma migrate deploy
Write-Host "✅ Migrations applied" -ForegroundColor Green
Write-Host ""

# Step 4: TypeScript Check
Write-Host "🔍 Step 4: TypeScript Kontrol" -ForegroundColor Yellow
Write-Host "------------------------------------" -ForegroundColor Yellow
npx tsc --noEmit
Write-Host ""

Write-Host "✅ Tüm adımlar tamamlandı!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Sonraki Adımlar:" -ForegroundColor Cyan
Write-Host "  1. npm run build - Build kontrol"
Write-Host "  2. npm run dev - Development server başlat"
Write-Host "  3. Test et: /api/admin/users"
