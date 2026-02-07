# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Haberleri - An autonomous AI news aggregation platform built with Next.js 14. The system automatically fetches AI news from RSS feeds, ranks articles with Brave Search trends, rewrites content using DeepSeek AI, generates images, and publishes to the web.

**Dual-Container Architecture:**
- **App Container**: Next.js 14 (App Router) serving the web application
- **Worker Container**: Separate BullMQ worker processing scheduled news agent jobs

Critical: Worker runs `src/workers/news-agent.worker.ts` independently. Changes to agent logic require worker restart.

## Common Commands

### Development
```bash
npm run dev              # Start development server (via server.js)
npm run build            # Production build
npm run worker           # Run BullMQ worker locally
npm test                 # Run Jest tests
npm run test:queue       # Test Redis connection
```

### Database (Prisma)
```bash
npx prisma migrate dev --name description   # Create and apply migrations
npx prisma generate                         # Generate Prisma client
npx prisma studio                           # Open Prisma Studio GUI
npx prisma db seed                          # Seed database with initial data
```

### Docker
```bash
docker-compose up -d                # Start all services
docker-compose logs -f app          # Follow app logs
docker-compose restart worker       # Restart worker after agent changes
docker-compose exec app sh          # Enter app container
```

## Architecture

### Data Flow
```
RSS Feeds → News Agent Worker (BullMQ) → DeepSeek AI → Content Processing → PostgreSQL → Next.js App
```

### Stack
- **Framework**: Next.js 14.2 (App Router, Standalone Output)
- **Language**: TypeScript (strict mode disabled for build)
- **Database**: PostgreSQL 15+ (Prisma ORM with Neon serverless adapter)
- **Queue**: Redis 7+ with BullMQ for job processing
- **Auth**: NextAuth v5 (Beta) with JWT + Credentials
- **AI**: DeepSeek Chat API (`deepseek-chat` model)
- **i18n**: next-intl (Turkish default at root `/`, English at `/en`)
- **Styling**: Tailwind CSS + shadcn/ui components

### Key Services

**Agent Service** (`src/services/agent.service.ts`)
- Triggered by BullMQ jobs or `/api/agent/trigger`
- Fetches AI news from RSS feeds, ranks articles, rewrites content (Turkish), generates images

**Content Service** (`src/services/content.service.ts`)
- Duplicate detection (URL normalization, title similarity via Levenshtein)
- Image generation: Pollinations → Unsplash → Default placeholder
- Auto-translation to English
- SEO metadata generation

**DeepSeek Integration** (`src/lib/deepseek.ts`)
- Model: `deepseek-chat` (configurable via env)
- Functions: `analyzeNewsArticles`, `rewriteArticle`, `generateImagePrompt`
- Timeout: 120s per request

### Database (Prisma)

Key Models:
- `Article`: Core content with status (`DRAFT|PUBLISHED`), category, SEO metadata
- `AgentLog`: Tracks each agent execution (status, errors, articles created)
- `Visitor`: Real-time analytics with country/city geolocation
- `Category`: Article classification (seeded via `prisma/seed.ts`)

Connection Handling:
- App uses Neon serverless adapter for connection pooling
- Worker tests DB connection before starting

### Job Scheduling (BullMQ + Redis)

Queue Structure:
- Queue: `news-agent` (defined in `src/lib/queue.ts`)
- Job ID: `news-agent-scheduled-run` (prevents duplicate scheduling)
- Interval: Configurable via `agent.intervalHours` setting (default: 6 hours)

Manual trigger: `POST /api/agent/trigger` with optional `{ "executeNow": true }`

## File Structure Conventions

- API Routes: `src/app/api/[feature]/route.ts`
- Server Actions: Use `"use server"` directive
- Services: `*.service.ts` suffix for business logic
- Lib: `src/lib/*.ts` for reusable utilities

## Authentication & Authorization

NextAuth v5 (Beta):
- Strategy: JWT with Credentials provider (`src/lib/auth.ts`)
- Admin Guard: `auth()` helper in all `/api/admin/*` routes
- Middleware: `src/middleware.ts` currently disabled (empty matcher `[]`)
- Login: `/admin/login` → bcrypt password comparison
- Session: JWT stored in cookies, validated via `auth()` helper

Protected pattern:
```typescript
const session = await auth();
if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
```

## Docker Build & Deployment

Multi-stage build:
1. **deps**: Install ALL deps including devDependencies
2. **builder**: Build Next.js with dummy env vars (prevents ENOTFOUND)
3. **runner**: Minimal runtime with sharp binaries included

Critical: `sharp@0.33.5` installed separately with `--legacy-peer-deps`

### Coolify Deployment (Production)

- Use `docker-compose.coolify.yaml` (NOT `docker-compose.yaml`)
- PostgreSQL: Separate Coolify-managed container via `coolify` network
- Redis: Local container shared between app and worker via `aihaberleri-network`
- Auto-deploy: GitHub webhook triggers on push to `main`
- After env var changes in Coolify Dashboard, always **Redeploy** containers
- Health checks: Redis (10s interval), Worker (30s interval)
- Port mapping: App exposed on 3001 (configurable via `APP_PORT`)

## i18n (next-intl)

Configuration (`src/i18n.ts`):
- Locales: `["tr", "en"]` (Turkish default, English secondary)
- Locale prefix: `as-needed` - only `/en/*` prefixed, Turkish at root
- Messages: `src/messages/tr.json` and `src/messages/en.json`
- Middleware disabled - i18n handled via App Router structure

URL structure:
```
/ → Turkish (default)
/en → English
/haberler → Turkish articles
/en/news → English articles
```

## Critical Pitfalls

1. **Worker Restart**: Changes to `src/services/agent.service.ts` or `content.service.ts` require worker container restart
2. **Sharp Missing**: Worker needs `libvips-dev` in production, app needs sharp in standalone bundle
3. **Database Timeout**: Worker tests DB connection before starting; 30s retry with 5s delay
4. **Environment at Build**: Dockerfile uses dummy env vars for build - never commit real secrets
5. **BullMQ Job Duplication**: Use fixed `jobId` to prevent multiple scheduled jobs
6. **Coolify Deployment**: Use `docker-compose.coolify.yaml` NOT `docker-compose.yaml`
7. **Environment Sync**: After updating env vars in Coolify Dashboard, MUST click "Redeploy"
8. **No Promise.all() for External APIs**: DeepSeek/Brave calls timeout individually - use sequential processing

## External Integrations

AI & Search Services:
- **DeepSeek AI**: `src/lib/deepseek.ts` - content generation (120s timeout)
- **Brave Search**: `src/lib/brave.ts` - news trend ranking
- **Tavily API**: `src/lib/tavily.ts` - alternative search (optional)
- **Exa API**: `src/lib/exa.ts` - semantic search (optional)

Image & Media:
- **Pollinations AI**: `src/lib/pollinations.ts` - image generation (primary)
- **Unsplash**: `src/lib/unsplash.ts` - image fallback (requires API key)
- **Sharp**: Image optimization (v0.33.5) - installed separately

## Error Handling

- API Routes: Return `NextResponse.json({ error: "..." }, { status: X })`
- Services: Throw errors with descriptive messages
- Worker: Log errors but don't crash (resilient processing)
