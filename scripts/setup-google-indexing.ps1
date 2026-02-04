# Google Indexing API Kurulum Script'i (PowerShell)

Write-Host "🚀 Google Indexing API Kurulum Başlıyor..." -ForegroundColor Green
Write-Host ""

# 1. Paket kurulumu
Write-Host "📦 1. googleapis paketi yükleniyor..." -ForegroundColor Cyan
npm install googleapis
Write-Host "✅ googleapis yüklendi" -ForegroundColor Green
Write-Host ""

# 2. JSON key dosyası kontrolü
Write-Host "🔑 2. Service Account JSON key dosyası kontrol ediliyor..." -ForegroundColor Cyan
if (Test-Path "aihaberleri-46042-861df20fa232.json") {
    Write-Host "✅ JSON key dosyası bulundu" -ForegroundColor Green
} else {
    Write-Host "❌ JSON key dosyası bulunamadı!" -ForegroundColor Red
    Write-Host "   Lütfen 'aihaberleri-46042-861df20fa232.json' dosyasını proje root'una kopyalayın" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# 3. Environment variables kontrolü
Write-Host "🌍 3. Environment variables kontrol ediliyor..." -ForegroundColor Cyan
if (Test-Path ".env") {
    $envContent = Get-Content ".env" -Raw
    if ($envContent -match "NEXT_PUBLIC_BASE_URL") {
        Write-Host "✅ NEXT_PUBLIC_BASE_URL tanımlı" -ForegroundColor Green
    } else {
        Write-Host "⚠️  NEXT_PUBLIC_BASE_URL tanımlı değil" -ForegroundColor Yellow
        Write-Host "   .env dosyanıza ekleyin: NEXT_PUBLIC_BASE_URL=https://aihaberleri.com.tr" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  .env dosyası bulunamadı" -ForegroundColor Yellow
}
Write-Host ""

# 4. Test
Write-Host "🧪 4. API testi yapılıyor..." -ForegroundColor Cyan
Write-Host "   Test komutu: npx tsx scripts/test-google-indexing.ts" -ForegroundColor Gray
Write-Host ""

Write-Host "✅ Kurulum tamamlandı!" -ForegroundColor Green
Write-Host ""
Write-Host "📚 Dokümantasyon: docs/GOOGLE-INDEXING-API-SETUP.md" -ForegroundColor Cyan
Write-Host ""
Write-Host "🎯 Sonraki adımlar:" -ForegroundColor Yellow
Write-Host "   1. npm install googleapis (eğer çalışmadıysa)" -ForegroundColor Gray
Write-Host "   2. npx tsx scripts/test-google-indexing.ts (test için)" -ForegroundColor Gray
Write-Host "   3. Haber oluşturma/güncelleme endpoint'lerine entegre edin" -ForegroundColor Gray
Write-Host ""
