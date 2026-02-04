# Login Fix Script
Write-Host "🔧 Login Sorunu Düzeltme Script'i" -ForegroundColor Cyan
Write-Host ""

# 1. Clear .next cache
Write-Host "1️⃣ Build cache temizleniyor..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next"
    Write-Host "   ✅ .next klasörü silindi" -ForegroundColor Green
}

# 2. Clear node_modules/.cache
Write-Host "2️⃣ Node cache temizleniyor..." -ForegroundColor Yellow
if (Test-Path "node_modules/.cache") {
    Remove-Item -Recurse -Force "node_modules/.cache"
    Write-Host "   ✅ Node cache silindi" -ForegroundColor Green
}

# 3. Clear auth cache from database
Write-Host "3️⃣ Database auth cache temizleniyor..." -ForegroundColor Yellow
npx tsx scripts/clear-auth-cache.ts

Write-Host ""
Write-Host "✅ Tüm cache'ler temizlendi!" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Şimdi yapmanız gerekenler:" -ForegroundColor Cyan
Write-Host "   1. Browser'da Ctrl+Shift+Delete ile cookie'leri temizleyin" -ForegroundColor White
Write-Host "   2. npm run dev ile sunucuyu başlatın" -ForegroundColor White
Write-Host "   3. http://localhost:3000/admin/login adresine gidin" -ForegroundColor White
Write-Host "   4. Console'da [AUTH] ve [LOGIN] log'larını kontrol edin" -ForegroundColor White
Write-Host ""
