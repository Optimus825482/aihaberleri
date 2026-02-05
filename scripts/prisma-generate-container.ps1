# Prisma Generate in Container (PowerShell)
# Bu script container içinde Prisma client'ı yeniden generate eder

Write-Host "🔍 Container ID'sini buluyorum..." -ForegroundColor Cyan

$containers = docker ps --format "{{.ID}} {{.Names}}" | Select-String "app-i8ggkoowk4s8okc4gso8kg4w"

if (-not $containers) {
    Write-Host "❌ Container bulunamadı!" -ForegroundColor Red
    exit 1
}

$CONTAINER_ID = ($containers -split " ")[0]

Write-Host "✅ Container bulundu: $CONTAINER_ID" -ForegroundColor Green
Write-Host ""
Write-Host "🔄 Prisma client generate ediliyor..." -ForegroundColor Yellow

docker exec $CONTAINER_ID npx prisma generate

Write-Host ""
Write-Host "✅ Prisma client başarıyla generate edildi!" -ForegroundColor Green
Write-Host ""
Write-Host "🔄 Container'ı yeniden başlatıyorum..." -ForegroundColor Yellow

docker restart $CONTAINER_ID

Write-Host ""
Write-Host "✅ Tamamlandı! Container yeniden başlatıldı." -ForegroundColor Green
Write-Host ""
Write-Host "📝 Test için:" -ForegroundColor Cyan
Write-Host "   https://aihaberleri.org/admin/seo-notifications" -ForegroundColor White
