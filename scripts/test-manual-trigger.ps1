# Manuel Tetikleme Test Script
# Bu script manuel tetikleme akışını test eder

Write-Host "🧪 Manuel Tetikleme Test Başlatılıyor..." -ForegroundColor Cyan
Write-Host ""

# 1. Worker durumunu kontrol et
Write-Host "1️⃣ Worker Durumu Kontrolü" -ForegroundColor Yellow
Write-Host "   Worker container'ı çalışıyor mu?" -ForegroundColor Gray
docker ps | Select-String "worker"
Write-Host ""

# 2. Redis bağlantısını test et
Write-Host "2️⃣ Redis Bağlantı Testi" -ForegroundColor Yellow
Write-Host "   Redis PING testi..." -ForegroundColor Gray
docker exec -it $(docker ps -q -f name=redis) redis-cli PING
Write-Host ""

# 3. Manuel tetikleme API'sini test et
Write-Host "3️⃣ Manuel Tetikleme API Testi" -ForegroundColor Yellow
Write-Host "   POST /api/agent/trigger çağrılıyor..." -ForegroundColor Gray

$response = Invoke-RestMethod -Uri "http://localhost:3000/api/agent/trigger" `
    -Method POST `
    -Headers @{"Content-Type"="application/json"} `
    -Body '{"executeNow": true}' `
    -ErrorAction SilentlyContinue

if ($response.success) {
    Write-Host "   ✅ Job başarıyla kuyruğa eklendi!" -ForegroundColor Green
    Write-Host "   Job ID: $($response.data.jobId)" -ForegroundColor Gray
    Write-Host "   Execution Mode: $($response.data.executionMode)" -ForegroundColor Gray
    
    $jobId = $response.data.jobId
    
    # 4. Job durumunu kontrol et
    Write-Host ""
    Write-Host "4️⃣ Job Durumu Kontrolü" -ForegroundColor Yellow
    Write-Host "   BullMQ kuyruğu kontrol ediliyor..." -ForegroundColor Gray
    
    Start-Sleep -Seconds 2
    
    # Redis'ten job bilgisini al
    $jobKey = "bull:news-agent:$jobId"
    Write-Host "   Job Key: $jobKey" -ForegroundColor Gray
    
    docker exec -it $(docker ps -q -f name=redis) redis-cli EXISTS $jobKey
    
    # 5. Stream endpoint'ini test et
    Write-Host ""
    Write-Host "5️⃣ Stream Endpoint Testi" -ForegroundColor Yellow
    Write-Host "   GET /api/agent/stream?jobId=$jobId" -ForegroundColor Gray
    Write-Host "   (İlk 10 satır gösteriliyor...)" -ForegroundColor Gray
    Write-Host ""
    
    # EventSource simulation (curl ile)
    $streamUrl = "http://localhost:3000/api/agent/stream?jobId=$jobId"
    Write-Host "   Stream URL: $streamUrl" -ForegroundColor Gray
    Write-Host "   Bağlanıyor..." -ForegroundColor Gray
    Write-Host ""
    
    # curl ile stream'i dinle (ilk 10 satır)
    curl -N $streamUrl | Select-Object -First 10
    
} else {
    Write-Host "   ❌ Job kuyruğa eklenemedi!" -ForegroundColor Red
    Write-Host "   Hata: $($response.error)" -ForegroundColor Red
}

Write-Host ""
Write-Host "✅ Test Tamamlandı!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Manuel Test Adımları:" -ForegroundColor Cyan
Write-Host "   1. http://localhost:3000/admin/agent-settings sayfasını aç" -ForegroundColor Gray
Write-Host "   2. 'Manuel Tetikle' butonuna tıkla" -ForegroundColor Gray
Write-Host "   3. /admin/scan sayfasına yönlendirilmelisin" -ForegroundColor Gray
Write-Host "   4. Real-time loglar görünmeli" -ForegroundColor Gray
Write-Host "   5. Worker job'u işlemeli" -ForegroundColor Gray
Write-Host "   6. Sonuç gösterilmeli" -ForegroundColor Gray
Write-Host ""
