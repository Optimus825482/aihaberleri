# Test manual trigger
$headers = @{
    "Content-Type" = "application/json"
}

$body = @{
    executeNow = $true
} | ConvertTo-Json

Write-Host "🧪 Testing manual trigger..." -ForegroundColor Cyan
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/agent/trigger" -Method POST -Headers $headers -Body $body -SessionVariable session
    
    Write-Host "✅ Response received:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
    
} catch {
    Write-Host "❌ Error:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Yellow
    $_.Exception.Response
}
