#!/bin/bash

# Coolify Build Verification Script
# Bu script build'in başarılı olup olmadığını test eder

set -e

echo "🔍 Coolify Build Verification"
echo "=============================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Check if db.ts has build-safe code
echo "📝 Test 1: Checking db.ts for build-safe code..."
if grep -q "SKIP_ENV_VALIDATION" src/lib/db.ts && grep -q "createMockPrismaClient" src/lib/db.ts; then
    echo -e "${GREEN}✓${NC} db.ts is build-safe"
else
    echo -e "${RED}✗${NC} db.ts is NOT build-safe"
    exit 1
fi
echo ""

# Test 2: Check if Dockerfile has dummy DATABASE_URL
echo "📝 Test 2: Checking Dockerfile for dummy DATABASE_URL..."
if grep -q 'DATABASE_URL="postgresql://dummy' Dockerfile; then
    echo -e "${GREEN}✓${NC} Dockerfile has dummy DATABASE_URL"
else
    echo -e "${RED}✗${NC} Dockerfile is missing dummy DATABASE_URL"
    exit 1
fi
echo ""

# Test 3: Check if Dockerfile has SKIP_ENV_VALIDATION
echo "📝 Test 3: Checking Dockerfile for SKIP_ENV_VALIDATION..."
if grep -q "SKIP_ENV_VALIDATION=1" Dockerfile; then
    echo -e "${GREEN}✓${NC} Dockerfile has SKIP_ENV_VALIDATION"
else
    echo -e "${RED}✗${NC} Dockerfile is missing SKIP_ENV_VALIDATION"
    exit 1
fi
echo ""

# Test 4: Check if Prisma generate is in Dockerfile
echo "📝 Test 4: Checking Dockerfile for Prisma generate..."
if grep -q "npx prisma generate" Dockerfile; then
    echo -e "${GREEN}✓${NC} Dockerfile has Prisma generate"
else
    echo -e "${RED}✗${NC} Dockerfile is missing Prisma generate"
    exit 1
fi
echo ""

# Test 5: Try to build locally (optional, requires Docker)
echo "📝 Test 5: Local Docker build test (optional)..."
if command -v docker &> /dev/null; then
    echo -e "${YELLOW}⚠${NC}  Starting Docker build test (this may take a few minutes)..."
    
    # Set build-time env vars
    export SKIP_ENV_VALIDATION=1
    export DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
    
    if docker build -t ai-news-build-test . --target builder; then
        echo -e "${GREEN}✓${NC} Docker build successful!"
        echo -e "${GREEN}✓${NC} Build stage completed without errors"
    else
        echo -e "${RED}✗${NC} Docker build failed"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠${NC}  Docker not found, skipping build test"
fi
echo ""

# Summary
echo "=============================="
echo -e "${GREEN}✓ All verification tests passed!${NC}"
echo ""
echo "📋 Next Steps:"
echo "1. git add src/lib/db.ts Dockerfile"
echo "2. git commit -m 'fix: build-safe PrismaClient for Coolify'"
echo "3. git push origin main"
echo "4. Coolify'da 'Redeploy' butonuna tıkla"
echo ""
echo "🎯 Expected Result:"
echo "   ✓ Build successful"
echo "   ✓ Container started"
echo "   ✓ Database connected"
echo ""
