# Google Batch Indexing Deployment Script (Windows PowerShell)

Write-Host "🚀 Google Batch Indexing Sistemi Deployment Başlıyor..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Prisma Generate
Write-Host "📦 Adım 1: Prisma Client oluşturuluyor..." -ForegroundColor Yellow
npx prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Prisma generate başarısız!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Prisma Client oluşturuldu" -ForegroundColor Green
Write-Host ""

# Step 2: Prisma Migration (Development)
Write-Host "🗄️ Adım 2: Database migration uygulanıyor..." -ForegroundColor Yellow
$env:DATABASE_URL = Get-Content .env | Select-String "DATABASE_URL" | ForEach-Object { $_.ToString().Split('=')[1] }
npx prisma migrate dev --name add_language_field
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Migration başarısız!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Migration uygulandı" -ForegroundColor Green
Write-Host ""

# Step 3: Build Test
Write-Host "🔨 Adım 3: Build test yapılıyor..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build başarısız!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Build başarılı" -ForegroundColor Green
Write-Host ""

# Step 4: Git Commit
Write-Host "📝 Adım 4: Git commit yapılıyor..." -ForegroundColor Yellow
git add .
git commit -m "feat: Google Batch Indexing sistemi eklendi

- Article modelinde language field eklendi
- GoogleIndexingBatch ve GoogleIndexingBatchItem tabloları eklendi
- Admin panel sayfası oluşturuldu
- API endpoints eklendi (unindexed, batch, cron)
- Background worker implementasyonu
- Sidebar menüye eklendi
- Rate limiting ve retry mekanizması"

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️ Git commit başarısız (değişiklik yok olabilir)" -ForegroundColor Yellow
}
Write-Host "✅ Git commit tamamlandı" -ForegroundColor Green
Write-Host ""

# Step 5: Summary
Write-Host "🎉 Deployment Hazır!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Sonraki Adımlar:" -ForegroundColor Cyan
Write-Host "1. Production migration: npx prisma migrate deploy" -ForegroundColor White
Write-Host "2. Vercel Cron Job ayarla:" -ForegroundColor White
Write-Host "   - Path: /api/cron/google-indexing-batch" -ForegroundColor Gray
Write-Host "   - Schedule: 0 * * * * (Her saat başı)" -ForegroundColor Gray
Write-Host "3. Environment variable ekle:" -ForegroundColor White
Write-Host "   - CRON_SECRET=your-secret-key" -ForegroundColor Gray
Write-Host "4. Deploy: git push origin main" -ForegroundColor White
Write-Host ""
Write-Host "📖 Detaylı bilgi: GOOGLE-BATCH-INDEXING-DEPLOYMENT-SUCCESS.md" -ForegroundColor Cyan
Write-Host ""

# Ask for push
$push = Read-Host "Git push yapmak ister misiniz? (y/n)"
if ($push -eq "y" -or $push -eq "Y") {
    Write-Host "🚀 Git push yapılıyor..." -ForegroundColor Yellow
    git push origin main
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Push başarılı!" -ForegroundColor Green
    } else {
        Write-Host "❌ Push başarısız!" -ForegroundColor Red
    }
} else {
    Write-Host "⏭️ Push atlandı. Manuel olarak yapabilirsiniz: git push origin main" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✨ Deployment tamamlandı!" -ForegroundColor Green
