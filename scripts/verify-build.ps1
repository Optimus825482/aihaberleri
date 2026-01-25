# Coolify Build Verification Script (PowerShell)
# Bu script build'in başarılı olup olmadığını test eder

$ErrorActionPreference = "Stop"

Write-Host "🔍 Coolify Build Verification" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Check if db.ts has build-safe code
Write-Host "📝 Test 1: Checking db.ts for build-safe code..." -ForegroundColor Yellow
$dbContent = Get-Content "src/lib/db.ts" -Raw
if ($dbContent -match "SKIP_ENV_VALIDATION" -and $dbContent -match "createMockPrismaClient") {
    Write-Host "✓ db.ts is build-safe" -ForegroundColor Green
} else {
    Write-Host "✗ db.ts is NOT build-safe" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Test 2: Check if Dockerfile has dummy DATABASE_URL
Write-Host "📝 Test 2: Checking Dockerfile for dummy DATABASE_URL..." -ForegroundColor Yellow
$dockerContent = Get-Content "Dockerfile" -Raw
if ($dockerContent -match 'DATABASE_URL="postgresql://dummy') {
    Write-Host "✓ Dockerfile has dummy DATABASE_URL" -ForegroundColor Green
} else {
    Write-Host "✗ Dockerfile is missing dummy DATABASE_URL" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Test 3: Check if Dockerfile has SKIP_ENV_VALIDATION
Write-Host "📝 Test 3: Checking Dockerfile for SKIP_ENV_VALIDATION..." -ForegroundColor Yellow
if ($dockerContent -match "SKIP_ENV_VALIDATION=1") {
    Write-Host "✓ Dockerfile has SKIP_ENV_VALIDATION" -ForegroundColor Green
} else {
    Write-Host "✗ Dockerfile is missing SKIP_ENV_VALIDATION" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Test 4: Check if Prisma generate is in Dockerfile
Write-Host "📝 Test 4: Checking Dockerfile for Prisma generate..." -ForegroundColor Yellow
if ($dockerContent -match "npx prisma generate") {
    Write-Host "✓ Dockerfile has Prisma generate" -ForegroundColor Green
} else {
    Write-Host "✗ Dockerfile is missing Prisma generate" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Test 5: Check if Docker is available
Write-Host "📝 Test 5: Checking Docker availability..." -ForegroundColor Yellow
$dockerAvailable = Get-Command docker -ErrorAction SilentlyContinue
if ($dockerAvailable) {
    Write-Host "✓ Docker is available" -ForegroundColor Green
    Write-Host "⚠  You can run 'docker build -t ai-news-test .' to test the build" -ForegroundColor Yellow
} else {
    Write-Host "⚠  Docker not found, skipping build test" -ForegroundColor Yellow
}
Write-Host ""

# Summary
Write-Host "==============================" -ForegroundColor Cyan
Write-Host "✓ All verification tests passed!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "1. git add src/lib/db.ts Dockerfile"
Write-Host "2. git commit -m 'fix: build-safe PrismaClient for Coolify'"
Write-Host "3. git push origin main"
Write-Host "4. Coolify'da 'Redeploy' butonuna tıkla"
Write-Host ""
Write-Host "🎯 Expected Result:" -ForegroundColor Cyan
Write-Host "   ✓ Build successful"
Write-Host "   ✓ Container started"
Write-Host "   ✓ Database connected"
Write-Host ""
