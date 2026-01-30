# Sharp Native Binary Fix - Deployment Script
# This script rebuilds both containers with proper sharp binaries for linux-x64

Write-Host "🔧 Sharp Native Binary Fix - Starting..." -ForegroundColor Cyan
Write-Host ""

# Stop running containers
Write-Host "⏹️  Stopping running containers..." -ForegroundColor Yellow
docker-compose -f docker-compose.coolify.yaml down

# Remove old images to force rebuild
Write-Host "🗑️  Removing old images..." -ForegroundColor Yellow
docker-compose -f docker-compose.coolify.yaml rm -f
docker image prune -f

# Rebuild with no cache to ensure sharp is properly installed
Write-Host ""
Write-Host "🏗️  Rebuilding containers (no cache)..." -ForegroundColor Green
docker-compose -f docker-compose.coolify.yaml build --no-cache --progress=plain

# Start services
Write-Host ""
Write-Host "🚀 Starting services..." -ForegroundColor Green
docker-compose -f docker-compose.coolify.yaml up -d

# Wait for services to start
Write-Host ""
Write-Host "⏳ Waiting 10 seconds for services to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Check logs
Write-Host ""
Write-Host "📋 Checking app logs..." -ForegroundColor Cyan
docker-compose -f docker-compose.coolify.yaml logs --tail=50 app

Write-Host ""
Write-Host "📋 Checking worker logs..." -ForegroundColor Cyan
docker-compose -f docker-compose.coolify.yaml logs --tail=50 worker

Write-Host ""
Write-Host "✅ Deployment complete! Check logs above for any errors." -ForegroundColor Green
Write-Host ""
Write-Host "💡 To monitor logs in real-time:" -ForegroundColor Yellow
Write-Host "   docker-compose -f docker-compose.coolify.yaml logs -f app"
Write-Host "   docker-compose -f docker-compose.coolify.yaml logs -f worker"
