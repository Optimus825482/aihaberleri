# Pollinations.ai Image Generation Fix - Deployment Script
# Date: 2026-02-02

Write-Host "🎨 Deploying Pollinations.ai Image Generation Fix..." -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: Not in project root directory" -ForegroundColor Red
    exit 1
}

# Check if git is clean
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "📝 Git status:" -ForegroundColor Yellow
    git status --short
    Write-Host ""
} else {
    Write-Host "✅ Git working directory is clean" -ForegroundColor Green
    Write-Host ""
}

# Stage changes
Write-Host "📦 Staging changes..." -ForegroundColor Cyan
git add src/lib/pollinations.ts
git add .env.example
git add .env.production
git add scripts/test-pollinations-api.ts
git add POLLINATIONS-API-FIX-DEPLOYMENT.md
git add IMAGE-GENERATION-FIX-SUMMARY.md
git add deploy-image-fix.ps1

# Show what will be committed
Write-Host ""
Write-Host "📋 Files to be committed:" -ForegroundColor Cyan
git diff --cached --name-only

# Commit
Write-Host ""
Write-Host "💾 Creating commit..." -ForegroundColor Cyan
git commit -m "fix: migrate Pollinations.ai to authenticated API + fix Next.js image loop

- Migrate from legacy anonymous endpoint to new authenticated API
- Add Bearer token authentication for higher rate limits
- Enhance retry logic with exponential backoff (2s, 4s, 8s, 15s)
- Implement 3-tier fallback strategy (authenticated → anonymous → static)
- Fix Next.js 400 error from self-referencing URL loop
- Increase timeout from 120s to 180s
- Remove deprecated 'nologo' parameter
- Change default model from 'flux-realism' to 'flux'
- Add comprehensive test script for API validation
- Add deployment documentation

Fixes:
- Next.js Image 400 Bad Request (self-referencing URL)
- Pollinations.ai 502 Bad Gateway (service down + rate limits)

API Key: pk_sET1VlYd117D84BM (publishable, unlimited pollen budget)"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Commit created successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Commit failed" -ForegroundColor Red
    exit 1
}

# Push to remote
Write-Host ""
Write-Host "🚀 Pushing to remote..." -ForegroundColor Cyan
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Deployment successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Next steps:" -ForegroundColor Yellow
    Write-Host "1. Add POLLINATIONS_API_KEY to Coolify environment variables"
    Write-Host "   POLLINATIONS_API_KEY=pk_sET1VlYd117D84BM"
    Write-Host ""
    Write-Host "2. Wait for Coolify to rebuild and deploy"
    Write-Host ""
    Write-Host "3. Verify in production logs:"
    Write-Host "   🔑 Pollinations.ai API key ile görsel üretiliyor..."
    Write-Host "   ✅ Pollinations.ai görsel başarıyla oluşturuldu (authenticated)"
    Write-Host ""
    Write-Host "4. Monitor error rates for 24 hours"
    Write-Host ""
    Write-Host "📖 See IMAGE-GENERATION-FIX-SUMMARY.md for complete details"
} else {
    Write-Host ""
    Write-Host "❌ Push failed" -ForegroundColor Red
    exit 1
}
