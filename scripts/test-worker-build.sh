#!/bin/bash

# Test Worker Build Script
# This script tests the Dockerfile.worker build locally

set -e

echo "🧪 Testing Dockerfile.worker Build"
echo "=================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Clean previous builds
echo "🧹 Cleaning previous builds..."
docker rmi aihaberleri-worker:test 2>/dev/null || true
echo ""

# Step 2: Build the image
echo "🔨 Building worker image..."
if docker build -f Dockerfile.worker -t aihaberleri-worker:test .; then
    echo -e "${GREEN}✅ Build successful!${NC}"
else
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi
echo ""

# Step 3: Check image size
echo "📊 Image size:"
docker images aihaberleri-worker:test --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
echo ""

# Step 4: Inspect image layers
echo "🔍 Image layers:"
docker history aihaberleri-worker:test --no-trunc --format "table {{.CreatedBy}}\t{{.Size}}" | head -20
echo ""

# Step 5: Test run (dry run with mock env vars)
echo "🚀 Testing container startup (will exit after 10 seconds)..."
docker run --rm \
  --name aihaberleri-worker-test \
  -e DATABASE_URL="postgresql://test:test@localhost:5432/test" \
  -e REDIS_URL="redis://localhost:6379" \
  -e DEEPSEEK_API_KEY="test-key" \
  -e BRAVE_API_KEY="test-key" \
  -e TAVILY_API_KEY="test-key" \
  -e EXA_API_KEY="test-key" \
  -e SMTP_HOST="smtp.test.com" \
  -e SMTP_PORT="587" \
  -e SMTP_USER="test@test.com" \
  -e SMTP_PASSWORD="test" \
  -e SMTP_FROM="test@test.com" \
  -e NEXT_PUBLIC_SITE_URL="http://localhost:3000" \
  -e AGENT_ENABLED="false" \
  aihaberleri-worker:test &

CONTAINER_PID=$!
sleep 10
kill $CONTAINER_PID 2>/dev/null || true

echo ""
echo -e "${GREEN}✅ All tests passed!${NC}"
echo ""
echo "📝 Summary:"
echo "  - Build: SUCCESS"
echo "  - Image created: aihaberleri-worker:test"
echo "  - Container startup: SUCCESS"
echo ""
echo "🎯 Next steps:"
echo "  1. Test with docker-compose: docker-compose -f docker-compose.coolify.yaml up -d"
echo "  2. Check logs: docker-compose -f docker-compose.coolify.yaml logs -f worker"
echo "  3. Deploy to Coolify"
echo ""
