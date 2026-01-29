# AI Haberleri - Copilot Instructions

An autonomous AI news aggregation platform built with Next.js 14, featuring automated content generation via DeepSeek AI and multi-container architecture with worker-based job processing.

## Architecture Overview

### Dual-Container System
- **App Container**: Next.js 14 (App Router) serving the web application
- **Worker Container**: Separate BullMQ worker processing scheduled news agent jobs
- **Critical**: Worker runs `src/workers/news-agent.worker.ts` independently - changes to agent logic require worker restart

### Data Flow
```
RSS Feeds → News Agent Worker (BullMQ) → DeepSeek AI → Content Processing → PostgreSQL → Next.js App
```

## Core Services

### Autonomous News Agent (`src/services/agent.service.ts`)
- **Trigger**: BullMQ jobs (scheduled) or API endpoint `/api/agent/trigger`
- **Workflow**: 
  1. Fetch AI news from RSS feeds (`src/lib/rss.ts`)
  2. Rank articles with Brave Search trends (`src/lib/brave.ts`)
  3. Select best articles via DeepSeek analysis (`src/lib/deepseek.ts`)
  4. Rewrite content (Turkish) with DeepSeek (`rewriteArticle`)
  5. Generate images via Pollinations API (`src/lib/pollinations.ts`)
  6. Publish to database and social media

### Content Processing (`src/services/content.service.ts`)
- **Duplicate Detection**: Multi-layer checks (URL normalization, title similarity via Levenshtein, content similarity)
- **Image Generation**: Fallback chain: Pollinations → Unsplash → Default
- **Auto-translation**: English articles created via DeepSeek translation API

### DeepSeek Integration (`src/lib/deepseek.ts`)
- **Model**: `deepseek-chat` (configurable via env)
- **Key Functions**: `analyzeNewsArticles`, `rewriteArticle`, `generateImagePrompt`
- **Rate Limits**: 120s timeout per request
- **Critical**: All content generation depends on `DEEPSEEK_API_KEY` being set

## Database (Prisma + PostgreSQL)

### Key Models
- `Article`: Core content with status (`DRAFT|PUBLISHED`), category, SEO metadata
- `AgentLog`: Tracks each agent execution (status, errors, articles created)
- `Visitor`: Real-time analytics with country/city geolocation
- `Category`: Article classification (seeded via `prisma/seed.ts`)

### Connection Handling
- **App**: Uses Neon serverless adapter for connection pooling
- **Worker**: Tests DB connection before starting (`ensureDatabaseConnection` in worker.ts)
- **Critical**: Worker crashes if PostgreSQL unavailable at startup

## Job Scheduling (BullMQ + Redis)

### Queue Structure
- **Queue**: `news-agent` (defined in `src/lib/queue.ts`)
- **Job ID**: `news-agent-scheduled-run` (prevents duplicate scheduling)
- **Interval**: Configurable via `agent.intervalHours` setting (default: 6 hours)
- **Fallback**: In-process scheduler (`src/lib/scheduler.ts`) if worker unavailable

### Manual Triggers
```typescript
// API Route: POST /api/agent/trigger
// Optionally pass { "executeNow": true } to run immediately
```

## Authentication & Authorization

### NextAuth v5 (Beta)
- **Strategy**: JWT with Credentials provider
- **Admin Guard**: `auth()` helper from `src/lib/auth.ts` in all `/api/admin/*` routes
- **Middleware**: `src/middleware.ts` currently only handles i18n - **admin routes protected via per-route checks**
- **Login**: `/admin/login` → bcrypt password comparison

### Protected Patterns
```typescript
// API Route Protection
const session = await auth();
if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

// Admin Layout Protection (client-side)
// src/components/AdminLayout.tsx uses useSession() + redirect
```

## Docker Build & Deployment

### Multi-Stage Build
- **Stage 1 (deps)**: Install ALL deps including devDependencies
- **Stage 2 (builder)**: Build Next.js with dummy env vars (prevents ENOTFOUND)
- **Stage 3 (runner)**: Minimal runtime with sharp binaries included
- **Critical**: `sharp@0.33.5` installed separately with `--legacy-peer-deps` to avoid conflicts

### Standalone Output
- `next.config.js` sets `output: "standalone"`
- Sharp binary tracing: `outputFileTracingIncludes` includes `node_modules/sharp/**/*`
- Ignores build errors: `ignoreBuildErrors: true` for TypeScript, `ignoreDuringBuilds: true` for ESLint

### Environment Variables
- **Build-time**: Requires dummy DATABASE_URL/REDIS_URL in Dockerfile
- **Runtime**: Actual env vars from docker-compose or Coolify
- **Secrets**: Firebase, Stripe, DeepSeek, social media API keys

### Coolify Deployment (Production)
- **Compose File**: `docker-compose.coolify.yaml` (use this instead of `docker-compose.yaml`)
- **Network**: Uses two networks - `aihaberleri-network` (internal) + `coolify` (external for PostgreSQL)
- **PostgreSQL**: Separate Coolify-managed container accessed via `coolify` network
- **Redis**: Local container shared between app and worker via `aihaberleri-network`
- **Auto-deploy**: GitHub webhook triggers deployment on every push to `main`
- **Health Checks**: Configured for Redis (10s interval) and Worker (30s interval)
- **Port Mapping**: App exposed on 3001 (configurable via `APP_PORT` env var)
- **Critical**: After env var changes in Coolify Dashboard, always **Redeploy** containers
- **Documentation**: See `COOLIFY-DEPLOYMENT-GUIDE.md` for complete setup instructions

## Testing

### Jest Setup
- Config: `jest.config.js` (uses `next/jest`)
- Setup: `jest.setup.ts` for global test configuration
- Run: `npm test` or `npm run test:watch`

### Service Tests
- `src/services/__tests__/` for service layer unit tests
- `src/lib/__tests__/` for utility function tests

## Key Conventions

### File Naming
- API Routes: `src/app/api/[feature]/route.ts`
- Server Actions: Use `"use server"` directive
- Services: `*.service.ts` suffix for business logic
- Lib: `src/lib/*.ts` for reusable utilities

### Error Handling
- **API Routes**: Return `NextResponse.json({ error: "..." }, { status: X })`
- **Services**: Throw errors with descriptive messages
- **Worker**: Log errors but don't crash (resilient processing)

### Async Patterns
- **No Promises.all() for external APIs**: DeepSeek/Brave calls timeout individually
- **Sequential processing**: Agent workflow is intentionally synchronous for content quality

## Common Tasks

### Adding a New API Route
1. Create `src/app/api/[name]/route.ts`
2. Export `GET` or `POST` async function
3. Add auth check: `const session = await auth()`
4. Return `NextResponse.json(data)`

### Modifying Agent Behavior
1. Edit `src/services/agent.service.ts` or `content.service.ts`
2. Test locally with `npm run worker`
3. Rebuild worker container: `docker-compose build worker`
4. **Critical**: Worker must be restarted to apply changes

### Database Schema Changes
```bash
npx prisma migrate dev --name description
npx prisma generate
docker-compose restart app worker
```

### Debugging Worker Issues
```bash
docker-compose logs -f worker  # Live logs
# Check Redis: docker-compose exec redis redis-cli ping
# Check PostgreSQL: docker-compose exec postgres pg_isready
```

## Build Commands

- `npm run dev` - Development server
- `npm run build` - Production build
- `npm run worker` - Run BullMQ worker locally
- `npm run agent:start` - Legacy agent runner script
- `npm run test:queue` - Test Redis connection

## Deployment

### Coolify (Production)
1. Push to GitHub `main` branch
2. Coolify auto-deploys via webhook (~3-5 min)
3. Verify: Check Coolify Dashboard → Logs
4. **Environment changes**: Must click "Redeploy" after saving env vars
5. **Worker changes**: Restart worker container after code changes to agent service

**Quick References**:
- `docker-compose.coolify.yaml` - Production compose file
- `.env.coolify.example` - Environment template
- `COOLIFY-DEPLOYMENT-GUIDE.md` - Complete setup guide
- `COOLIFY-QUICK-START.md` - Quick checklist

### Local Development
```bash
docker-compose up -d          # Start all services
docker-compose logs -f app    # Follow app logs
docker-compose restart worker # Restart worker
```

## Critical Pitfalls

1. **Middleware Loop**: Static files (`_next/static/*`) must be excluded from middleware matcher
2. **Sharp Missing**: Worker needs `libvips-dev` in production, app needs sharp in standalone bundle
3. **Database Timeout**: Worker tests DB connection before starting; 30s retry with 5s delay
4. **Environment at Build**: Dockerfile uses dummy env vars for build - never commit real secrets
5. **BullMQ Job Duplication**: Use fixed `jobId` to prevent multiple scheduled jobs
6. **Coolify Deployment**: Use `docker-compose.coolify.yaml` NOT `docker-compose.yaml` in production
7. **Network Separation**: PostgreSQL accessed via `coolify` network, Redis via `aihaberleri-network`
8. **Environment Sync**: After updating env vars in Coolify Dashboard, MUST click "Redeploy"
9. **Worker Restart**: Changes to `src/services/agent.service.ts` or `content.service.ts` require worker container restart

## External Integrations

- **DeepSeek AI**: Content generation (rewrite, analysis, translation)
- **Brave Search**: News trend ranking
- **Pollinations AI**: Image generation (primary)
- **Unsplash**: Image fallback (requires API key)
- **Firebase Admin**: Push notifications
- **Twitter API v2**: Auto-tweeting (optional)
- **Facebook Graph API**: Auto-posting (optional)
- **SendGrid/SMTP**: Email notifications (optional)

## Admin Panel

- **Location**: `/admin/*` routes
- **Layout**: `src/components/AdminLayout.tsx` (glassmorphism design)
- **Pages**: Dashboard, Analytics, Articles, Agent Settings, Visitors, Messages
- **Charts**: Chart.js with `react-chartjs-2` and `recharts`
- **Real-time**: `/admin/visitors` shows live traffic (Visitor model updated on page views)
