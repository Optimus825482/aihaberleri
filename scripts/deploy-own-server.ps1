# Google Batch Indexing - Kendi Sunucu Deployment (Windows PowerShell)

Write-Host "🚀 Google Batch Indexing - Kendi Sunucu Deployment" -ForegroundColor Cyan
Write-Host ""

# 1. Prisma Generate
Write-Host "📦 Prisma Client oluşturuluyor..." -ForegroundColor Yellow
npx prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Prisma generate başarısız!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Prisma Client oluşturuldu" -ForegroundColor Green
Write-Host ""

# 2. Migration
Write-Host "🗄️ Database migration uygulanıyor..." -ForegroundColor Yellow
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Migration başarısız!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Migration uygulandı" -ForegroundColor Green
Write-Host ""

# 3. Build
Write-Host "🔨 Build yapılıyor..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build başarısız!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Build başarılı" -ForegroundColor Green
Write-Host ""

# 4. PM2 Restart (eğer PM2 kullanılıyorsa)
if (Get-Command pm2 -ErrorAction SilentlyContinue) {
    Write-Host "🔄 PM2 restart..." -ForegroundColor Yellow
    pm2 restart all
    Write-Host "✅ PM2 restart tamamlandı" -ForegroundColor Green
} else {
    Write-Host "⚠️ PM2 bulunamadı, restart atlandı" -ForegroundColor Yellow
}
Write-Host ""

# 5. CRON_SECRET Kontrolü
Write-Host "⏰ Cron ayarları kontrol ediliyor..." -ForegroundColor Yellow

# CRON_SECRET'i .env.production'dan al
$envFile = ".env.production"
if (-not (Test-Path $envFile)) {
    $envFile = ".env"
}

$cronSecret = Get-Content $envFile | Select-String "CRON_SECRET" | ForEach-Object { $_.ToString().Split('=')[1] }

if (-not $cronSecret) {
    Write-Host "❌ CRON_SECRET bulunamadı!" -ForegroundColor Red
    Write-Host "Lütfen $envFile dosyasına CRON_SECRET ekleyin:" -ForegroundColor Yellow
    Write-Host "CRON_SECRET=your-secret-key-here" -ForegroundColor Gray
    exit 1
}

# Port'u .env'den al (varsayılan 3000)
$port = Get-Content $envFile | Select-String "PORT" | ForEach-Object { $_.ToString().Split('=')[1] }
if (-not $port) {
    $port = 3000
}

Write-Host "✅ CRON_SECRET bulundu" -ForegroundColor Green
Write-Host "✅ Port: $port" -ForegroundColor Green
Write-Host ""

# 6. Windows Task Scheduler Kurulumu
Write-Host "📝 Windows Task Scheduler için komut hazırlanıyor..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Windows'ta cron job kurmak için Task Scheduler kullanmanız gerekiyor:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Task Scheduler'ı açın (taskschd.msc)" -ForegroundColor White
Write-Host "2. 'Create Basic Task' seçin" -ForegroundColor White
Write-Host "3. Name: Google Indexing Batch" -ForegroundColor White
Write-Host "4. Trigger: Daily, Repeat every 1 hour" -ForegroundColor White
Write-Host "5. Action: Start a program" -ForegroundColor White
Write-Host "6. Program: powershell.exe" -ForegroundColor White
Write-Host "7. Arguments:" -ForegroundColor White
Write-Host "   -Command `"Invoke-WebRequest -Uri 'http://localhost:$port/api/cron/google-indexing-batch' -Method POST -Headers @{'Authorization'='Bearer $cronSecret'} | Out-File -Append 'C:\logs\google-indexing-cron.log'`"" -ForegroundColor Gray
Write-Host ""

# Task Scheduler script oluştur
$taskScript = @"
`$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-Command `"Invoke-WebRequest -Uri 'http://localhost:$port/api/cron/google-indexing-batch' -Method POST -Headers @{'Authorization'='Bearer $cronSecret'} | Out-File -Append 'C:\logs\google-indexing-cron.log'`""
`$trigger = New-ScheduledTaskTrigger -Daily -At 00:00 -RepetitionInterval (New-TimeSpan -Hours 1) -RepetitionDuration (New-TimeSpan -Days 1)
`$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
Register-ScheduledTask -TaskName "Google Indexing Batch" -Action `$action -Trigger `$trigger -Settings `$settings -Description "Google Indexing Batch Job - Her saat başı çalışır"
"@

$taskScript | Out-File -FilePath "scripts\setup-task-scheduler.ps1" -Encoding UTF8
Write-Host "✅ Task Scheduler script oluşturuldu: scripts\setup-task-scheduler.ps1" -ForegroundColor Green
Write-Host ""

# 7. Test
Write-Host "🧪 Cron endpoint test ediliyor..." -ForegroundColor Yellow
Write-Host "URL: http://localhost:$port/api/cron/google-indexing-batch" -ForegroundColor Gray
Write-Host ""

try {
    $response = Invoke-WebRequest -Uri "http://localhost:$port/api/cron/google-indexing-batch" `
        -Method POST `
        -Headers @{
            "Authorization" = "Bearer $cronSecret"
            "Content-Type" = "application/json"
        } `
        -UseBasicParsing
    
    Write-Host "Yanıt:" -ForegroundColor Green
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
} catch {
    Write-Host "⚠️ Test başarısız (uygulama çalışmıyor olabilir):" -ForegroundColor Yellow
    Write-Host $_.Exception.Message -ForegroundColor Red
}
Write-Host ""

# 8. Git Commit (opsiyonel)
$gitCommit = Read-Host "Git commit yapmak ister misiniz? (y/n)"
if ($gitCommit -eq "y" -or $gitCommit -eq "Y") {
    Write-Host "📝 Git commit yapılıyor..." -ForegroundColor Yellow
    git add .
    git commit -m "feat: Google Batch Indexing sistemi eklendi (kendi sunucu)"
    
    $gitPush = Read-Host "Git push yapmak ister misiniz? (y/n)"
    if ($gitPush -eq "y" -or $gitPush -eq "Y") {
        git push origin main
        Write-Host "✅ Git push tamamlandı" -ForegroundColor Green
    }
}
Write-Host ""

# 9. Özet
Write-Host "✅ Deployment tamamlandı!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Sonraki Adımlar:" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "1. Task Scheduler kurulumu:" -ForegroundColor White
Write-Host "   .\scripts\setup-task-scheduler.ps1" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Manuel test:" -ForegroundColor White
Write-Host "   Invoke-WebRequest -Uri 'http://localhost:$port/api/cron/google-indexing-batch' -Method POST -Headers @{'Authorization'='Bearer $cronSecret'}" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Logları kontrol:" -ForegroundColor White
Write-Host "   Get-Content C:\logs\google-indexing-cron.log -Tail 50" -ForegroundColor Gray
Write-Host ""
Write-Host "4. PM2 logları:" -ForegroundColor White
Write-Host "   pm2 logs" -ForegroundColor Gray
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""
Write-Host "📖 Detaylı bilgi: KENDI-SUNUCU-DEPLOYMENT.md" -ForegroundColor Cyan
Write-Host ""
Write-Host "🎉 Sistem hazır! Admin panel: http://localhost:$port/admin/google-indexing-batch" -ForegroundColor Green
