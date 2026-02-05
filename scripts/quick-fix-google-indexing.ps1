# 🚀 Google Indexing Rate Limit - Hızlı Fix Script
# Bu script Prisma client'ı yeniden generate eder ve sistemi hazır hale getirir

Write-Host "🚀 Google Indexing Rate Limit Fix başlatılıyor..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Prisma Client Temizle
Write-Host "📦 Prisma client temizleniyor..." -ForegroundColor Yellow
Remove-Item -Path "node_modules/.prisma" -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "✅ Prisma client temizlendi" -ForegroundColor Green
Write-Host ""

# Step 2: Prisma Generate
Write-Host "🔧 Prisma client generate ediliyor..." -ForegroundColor Yellow
npx prisma generate
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Prisma client başarıyla generate edildi" -ForegroundColor Green
} else {
    Write-Host "❌ Prisma generate hatası!" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 3: TypeScript Type Check
Write-Host "🔍 TypeScript type check..." -ForegroundColor Yellow
npm run type-check
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Type check başarılı" -ForegroundColor Green
} else {
    Write-Host "⚠️  Type check uyarıları var (devam ediliyor)" -ForegroundColor Yellow
}
Write-Host ""

# Step 4: Build Test
Write-Host "🏗️  Build test..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build başarılı" -ForegroundColor Green
} else {
    Write-Host "❌ Build hatası!" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 5: Özet
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✅ FIX TAMAMLANDI!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Sonraki Adımlar:" -ForegroundColor Yellow
Write-Host "1. Admin panele git: http://localhost:3000/admin/google-indexing-batch"
Write-Host "2. Bildirilmemiş haberleri seç"
Write-Host "3. 'Yarın İçin Planla' butonuna tıkla"
Write-Host "4. Cron job otomatik çalışacak (her saat başı)"
Write-Host ""
Write-Host "📊 Monitoring:" -ForegroundColor Yellow
Write-Host "- Batch durumu: /admin/google-indexing-batch"
Write-Host "- Database: npx prisma studio"
Write-Host "- Logs: Vercel Dashboard"
Write-Host ""
Write-Host "🚀 Sistem hazır!" -ForegroundColor Green
