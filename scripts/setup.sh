#!/bin/bash

# AI News Site - Automated Setup Script
# This script automates the entire setup process

set -e

echo "🚀 AI News Site - Automated Setup"
echo "=================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    echo "Please install Docker first: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed${NC}"
    echo "Please install Docker Compose first: https://docs.docker.com/compose/install/"
    exit 1
fi

echo -e "${GREEN}✅ Docker and Docker Compose are installed${NC}"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo -e "${GREEN}✅ .env file created${NC}"
    echo ""
    
    echo -e "${YELLOW}⚠️  Please edit .env and set your API keys:${NC}"
    echo "   - DEEPSEEK_API_KEY (required)"
    echo "   - NEXTAUTH_SECRET (generate with: openssl rand -base64 32)"
    echo "   - UNSPLASH_ACCESS_KEY (optional)"
    echo ""
    read -p "Press Enter after you've configured .env..."
else
    echo -e "${GREEN}✅ .env file already exists${NC}"
fi

# Validate required environment variables
echo ""
echo "🔍 Validating environment variables..."

if ! grep -q "DEEPSEEK_API_KEY=.*[a-zA-Z0-9]" .env; then
    echo -e "${RED}❌ DEEPSEEK_API_KEY is not set in .env${NC}"
    echo "Please set your DeepSeek API key in .env"
    exit 1
fi

if ! grep -q "NEXTAUTH_SECRET=.*[a-zA-Z0-9]" .env; then
    echo -e "${YELLOW}⚠️  NEXTAUTH_SECRET is not set${NC}"
    echo "Generating NEXTAUTH_SECRET..."
    SECRET=$(openssl rand -base64 32)
    sed -i.bak "s/NEXTAUTH_SECRET=.*/NEXTAUTH_SECRET=\"$SECRET\"/" .env
    echo -e "${GREEN}✅ NEXTAUTH_SECRET generated${NC}"
fi

echo -e "${GREEN}✅ Environment variables validated${NC}"
echo ""

# Start services
echo "🐳 Starting Docker services..."
docker-compose up -d

echo ""
echo "⏳ Waiting for services to be ready (30 seconds)..."
sleep 30

# Check if services are running
if ! docker-compose ps | grep -q "Up"; then
    echo -e "${RED}❌ Services failed to start${NC}"
    echo "Check logs with: docker-compose logs"
    exit 1
fi

echo -e "${GREEN}✅ Services are running${NC}"
echo ""

# Run database migrations
echo "🗄️  Running database migrations..."
docker-compose exec -T app npx prisma migrate deploy

echo -e "${GREEN}✅ Database migrations completed${NC}"
echo ""

# Seed categories
echo "🌱 Seeding categories..."
docker-compose exec -T app npx tsx scripts/seed-categories.ts

echo -e "${GREEN}✅ Categories seeded${NC}"
echo ""

# Create admin user
echo "👤 Creating admin user..."
echo ""
echo "Please enter admin credentials:"
read -p "Email: " ADMIN_EMAIL
read -sp "Password: " ADMIN_PASSWORD
echo ""
read -p "Name (optional): " ADMIN_NAME

# Create admin user using script
docker-compose exec -T app npx tsx -e "
import { db } from './src/lib/db';
import bcrypt from 'bcryptjs';

async function createAdmin() {
  const hashedPassword = await bcrypt.hash('${ADMIN_PASSWORD}', 10);
  const user = await db.user.create({
    data: {
      email: '${ADMIN_EMAIL}',
      password: hashedPassword,
      name: '${ADMIN_NAME}' || undefined,
      role: 'ADMIN',
    },
  });
  console.log('Admin user created:', user.email);
  await db.\$disconnect();
}
createAdmin();
"

echo -e "${GREEN}✅ Admin user created${NC}"
echo ""

# Schedule first agent run
echo "📅 Scheduling first agent run..."
docker-compose exec -T app npx tsx -e "
import { scheduleNewsAgentJob } from './src/lib/queue';
scheduleNewsAgentJob().then((result) => {
  console.log('Next execution scheduled for:', result.nextExecutionTime);
  process.exit(0);
});
"

echo -e "${GREEN}✅ Agent scheduled${NC}"
echo ""

# Setup complete
echo ""
echo "=================================="
echo -e "${GREEN}🎉 Setup Complete!${NC}"
echo "=================================="
echo ""
echo "Your AI News Site is now running!"
echo ""
echo "📍 Access Points:"
echo "   Website:      http://localhost:3000"
echo "   Admin Panel:  http://localhost:3000/admin"
echo ""
echo "🔐 Admin Credentials:"
echo "   Email:    ${ADMIN_EMAIL}"
echo "   Password: ********"
echo ""
echo "🤖 Agent Status:"
echo "   The autonomous agent is scheduled and will run automatically"
echo "   Check admin panel for execution history"
echo ""
echo "📊 Useful Commands:"
echo "   View logs:        docker-compose logs -f"
echo "   Stop services:    docker-compose down"
echo "   Restart services: docker-compose restart"
echo "   Run agent now:    docker-compose exec app npx tsx scripts/test-agent.ts"
echo ""
echo "📚 Documentation:"
echo "   Quick Start:  QUICKSTART.md"
echo "   Deployment:   DEPLOYMENT.md"
echo "   Full Guide:   README.md"
echo ""
echo -e "${GREEN}Happy publishing! 🚀${NC}"
