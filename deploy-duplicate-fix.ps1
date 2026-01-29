# 🚀 Quick Deployment Script - Duplicate Detection Fix
# Run this to deploy the fix to production

Write-Host "🚨 URGENT DEPLOYMENT - Duplicate Detection Fix" -ForegroundColor Red
Write-Host ""

# Step 1: Check git status
Write-Host "1️⃣ Checking git status..." -ForegroundColor Yellow
git status --short

Write-Host ""
$confirm = Read-Host "Deploy these changes? (y/n)"

if ($confirm -ne "y") {
    Write-Host "❌ Deployment cancelled" -ForegroundColor Red
    exit
}

# Step 2: Add all changes
Write-Host ""
Write-Host "2️⃣ Adding changes to git..." -ForegroundColor Yellow
git add .

# Step 3: Commit
Write-Host ""
Write-Host "3️⃣ Committing changes..." -ForegroundColor Yellow
$commitMessage = "fix: Enhanced duplicate detection in publishArticle

- Added 2-layer duplicate check (slug/url + title/content similarity)
- Return null for duplicates instead of existing article
- Added null check in processAndPublishArticles
- Prevents duplicate articles after rewrite (e.g., Tesla news)
- Fixes race condition where same article published multiple times

Critical fix for production duplicate issue."

git commit -m $commitMessage

# Step 4: Push to repository
Write-Host ""
Write-Host "4️⃣ Pushing to repository..." -ForegroundColor Yellow
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Successfully pushed to repository!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Next Steps:" -ForegroundColor Cyan
    Write-Host "   1. Check Coolify dashboard for auto-deploy status" -ForegroundColor Gray
    Write-Host "   2. Restart worker container after deployment" -ForegroundColor Gray
    Write-Host "   3. Monitor logs for 'DUPLICATE' messages" -ForegroundColor Gray
    Write-Host "   4. Verify no new duplicates in database" -ForegroundColor Gray
    Write-Host ""
    Write-Host "🔍 Monitoring Commands:" -ForegroundColor Cyan
    Write-Host "   docker logs -f <worker-container> | grep DUPLICATE" -ForegroundColor Gray
    Write-Host "   docker logs -f <app-container> | grep 'Haber yayınlandı'" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ Push failed! Check git errors above." -ForegroundColor Red
    Write-Host ""
}

Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
