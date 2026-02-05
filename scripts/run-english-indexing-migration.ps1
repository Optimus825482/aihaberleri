# İngilizce indexing tracking migration'ını çalıştır

Write-Host "🚀 İngilizce indexing tracking migration başlatılıyor..." -ForegroundColor Cyan
Write-Host ""

# Migration dosyasını çalıştır
$migrationFile = "migrations/add-english-indexing-tracking.sql"

if (Test-Path $migrationFile) {
    Write-Host "📄 Migration dosyası bulundu: $migrationFile" -ForegroundColor Green
    
    # PostgreSQL connection string'i .env'den al
    $envFile = ".env"
    if (Test-Path $envFile) {
        $databaseUrl = (Get-Content $envFile | Select-String "DATABASE_URL").ToString().Split("=")[1].Trim()
        
        if ($databaseUrl) {
            Write-Host "🔗 Veritabanına bağlanılıyor..." -ForegroundColor Yellow
            
            # psql ile migration'ı çalıştır
            Get-Content $migrationFile | psql $databaseUrl
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host ""
                Write-Host "✅ Migration başarıyla tamamlandı!" -ForegroundColor Green
                Write-Host ""
                Write-Host "📊 Eklenen kolonlar:" -ForegroundColor Cyan
                Write-Host "   - indexNowStatusEn (TEXT)" -ForegroundColor White
                Write-Host "   - indexedAtEn (TIMESTAMP)" -ForegroundColor White
                Write-Host "   - googleIndexStatusEn (TEXT)" -ForegroundColor White
                Write-Host "   - googleIndexedAtEn (TIMESTAMP)" -ForegroundColor White
                Write-Host "   - facebookSharedEn (BOOLEAN)" -ForegroundColor White
                Write-Host ""
                Write-Host "🎯 Artık İngilizce versiyonlar da takip edilecek!" -ForegroundColor Green
            } else {
                Write-Host ""
                Write-Host "❌ Migration başarısız!" -ForegroundColor Red
                exit 1
            }
        } else {
            Write-Host "❌ DATABASE_URL bulunamadı!" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "❌ .env dosyası bulunamadı!" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "❌ Migration dosyası bulunamadı: $migrationFile" -ForegroundColor Red
    exit 1
}
