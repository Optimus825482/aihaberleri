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

### Stack Summary
- **Framework**: Next.js 14.2 (App Router, Standalone Output)
- **Language**: TypeScript (strict mode disabled for build)
- **Database**: PostgreSQL 15+ (Prisma ORM with Neon serverless adapter)
- **Queue**: Redis 7+ with BullMQ for job processing
- **Auth**: NextAuth v5 (Beta) with JWT + Credentials
- **AI**: DeepSeek Chat API (`deepseek-chat` model)
- **i18n**: next-intl (Turkish default at root `/`, English at `/en`)
- **Styling**: Tailwind CSS + shadcn/ui components

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
  - URL normalization: Strips query params, trailing slashes, www prefix
  - Title similarity: Levenshtein distance threshold
  - Content hash comparison for exact duplicates
- **Image Generation**: Fallback chain: Pollinations → Unsplash → Default placeholder
- **Auto-translation**: English articles created via DeepSeek `translateToEnglish` API
- **SEO Generation**: Automatic meta title/description via DeepSeek

### Other Services
- **News Service** (`src/services/news.service.ts`): RSS feed fetching and parsing
- **Audio Service** (`src/services/AudioService.ts`): TTS via edge-tts (Python venv)
- **Email Service** (`src/lib/email.ts`): SendGrid/SMTP abstraction

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

### 🤖 AI Agent Assignment (Worker Monitoring)

**Assigned Agent**: `@backend-specialist`  
**Documentation**: `WORKER-AGENT-ASSIGNMENT.md`

The background worker (`src/workers/news-agent.worker.ts`) is monitored by the **@backend-specialist** AI agent with the following responsibilities:

**Active Skills:**
- `nodejs-best-practices` - Worker optimization and async patterns
- `performance-profiling` - Execution time and resource monitoring
- `database-design` - Prisma connection lifecycle management
- `api-patterns` - BullMQ job handling and queue health

**Automatic Intervention Triggers:**
- Worker crashes or unhandled rejections
- Job execution timeout (>18 minutes)
- Database/Redis connection failures
- Memory leaks or performance degradation
- Job success rate < 95%

**Agent Capabilities:**
- Real-time error pattern detection
- Performance bottleneck analysis
- Connection leak diagnosis
- Automatic optimization suggestions
- Weekly performance reports

**Usage Example:**
```markdown
User: "Worker çok yavaş çalışıyor"
Agent: 🤖 @backend-specialist analyzing worker performance...
[Detailed analysis with optimization suggestions]
```

## Internationalization (i18n)

### next-intl Configuration (`src/i18n.ts`)
- **Supported locales**: `["tr", "en"]` (Turkish default, English secondary)
- **Locale prefix**: `as-needed` - only `/en/*` prefixed, Turkish at root
- **Messages**: `src/messages/tr.json` and `src/messages/en.json`
- **Components**: `LanguageSwitcher.tsx` with dropdown/inline variants
- **Critical**: Middleware currently disabled - i18n handled via App Router structure

### URL Structure
```
/ → Turkish (default)
/en → English
/haberler → Turkish articles
/en/news → English articles
```

## Authentication & Authorization

### NextAuth v5 (Beta)
- **Strategy**: JWT with Credentials provider (`src/lib/auth.ts`)
- **Admin Guard**: `auth()` helper in all `/api/admin/*` routes - **per-route protection, not middleware**
- **Middleware**: `src/middleware.ts` currently **disabled** (empty matcher `[]`) - all routing/auth handled per-route
- **Login**: `/admin/login` → bcrypt password comparison against `User.password`
- **Session**: JWT stored in cookies, validated via `auth()` helper

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
- **Build-time**: Requires dummy DATABASE_URL/REDIS_URL in Dockerfile (prevents ENOTFOUND)
- **Runtime**: Actual env vars from docker-compose or Coolify
- **Required for Agent**: `DEEPSEEK_API_KEY`, `DATABASE_URL`, `REDIS_URL`
- **Optional**: Firebase, Stripe, social media API keys, Unsplash, Brave, Tavily, Exa

### Environment Variable Categories
```bash
# Database & Cache
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://redis:6379

# AI Services (Required for agent)
DEEPSEEK_API_KEY=sk-...

# Search APIs (Optional)
BRAVE_API_KEY=...
TAVILY_API_KEY=...
EXA_API_KEY=...

# Auth (Required)
NEXTAUTH_SECRET=...  # Generate with: openssl rand -base64 32
NEXTAUTH_URL=https://aihaberleri.org

# Social Media (Optional)
TWITTER_API_KEY=...
FACEBOOK_ACCESS_TOKEN=...

# Email (Optional)
SMTP_HOST=smtp.sendgrid.net
SMTP_USER=apikey
SMTP_PASSWORD=...
```

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
3. Add auth check for admin routes:
   ```typescript
   import { auth } from "@/lib/auth";
   const session = await auth();
   if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   ```
4. Return `NextResponse.json(data)` or `NextResponse.json({ error: "..." }, { status: X })`

### API Route Directory Structure
```
src/app/api/
├── admin/          # Protected admin routes (auth required)
├── agent/          # Agent triggers (admin only)
├── analytics/      # Public analytics endpoints
├── articles/       # Article CRUD (mixed public/protected)
├── auth/           # NextAuth endpoints
└── health/         # Public health checks
```

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
# Option 1: Docker Compose (Full stack)
docker-compose up -d          # Start all services (app, worker, postgres, redis)
docker-compose logs -f app    # Follow app logs
docker-compose restart worker # Restart worker after agent changes

# Option 2: Native Node.js (Requires local PostgreSQL + Redis)
npm run dev                   # Start Next.js dev server (port 3000)
npm run worker                # Start BullMQ worker in separate terminal

# Database management
npx prisma studio              # Open Prisma Studio (GUI)
npx prisma migrate dev         # Create and apply migrations
npx prisma db seed             # Seed database with initial data

# Testing
npm test                       # Run Jest tests
npm run test:queue             # Test Redis connection
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

### AI & Search Services
- **DeepSeek AI**: Content generation (rewrite, analysis, translation) - `src/lib/deepseek.ts`
  - Model: `deepseek-chat` - 120s timeout per request
  - Functions: `analyzeNewsArticles`, `rewriteArticle`, `generateImagePrompt`, `translateToEnglish`
- **Brave Search**: News trend ranking - `src/lib/brave.ts`
- **Tavily API**: Alternative search (optional) - `src/lib/tavily.ts`
- **Exa API**: Semantic search (optional) - `src/lib/exa.ts`

### Image & Media
- **Pollinations AI**: Image generation (primary) - `src/lib/pollinations.ts`
- **Unsplash**: Image fallback (requires API key) - `src/lib/unsplash.ts`
- **Sharp**: Image optimization (v0.33.5) - installed separately with `--legacy-peer-deps`

### Social & Notifications
- **Firebase Admin**: Push notifications - `src/lib/firebase-admin.ts`
- **Twitter API v2**: Auto-tweeting (optional) - `src/lib/social/twitter.ts`
- **Facebook Graph API**: Auto-posting (optional) - `src/lib/social/facebook.ts`
- **SendGrid/SMTP**: Email notifications (optional) - `src/lib/email.ts`

### Pattern: External API Calls
```typescript
// DON'T: Use Promise.all() for external APIs (timeouts propagate)
await Promise.all([deepseekCall(), braveCall()]); // ❌

// DO: Sequential calls with individual error handling
try {
  const deepseekResult = await deepseekCall(); // 120s timeout
} catch (error) {
  console.error("DeepSeek failed:", error);
  // Continue with fallback
}
```

## Admin Panel

- **Location**: `/admin/*` routes
- **Layout**: `src/components/AdminLayout.tsx` (glassmorphism design)
- **Pages**: Dashboard, Analytics, Articles, Agent Settings, Visitors, Messages
- **Charts**: Chart.js with `react-chartjs-2` and `recharts`
- **Real-time**: `/admin/visitors` shows live traffic (Visitor model updated on page views)
## Admin Panel

- **Location**: /admin/* routes
- **Layout**: src/components/AdminLayout.tsx (glassmorphism design)
- **Pages**: Dashboard, Analytics, Articles, Agent Settings, Visitors, Messages
- **Charts**: Chart.js with 
eact-chartjs-2 and 
echarts
- **Real-time**: /admin/visitors shows live traffic (Visitor model updated on page views)

---

# 🤖 AI Agent System

This project includes the **Antigravity Kit** - a global multi-project AI agent framework with 20 specialist agents, 36 skills, and 11 workflows.

**📚 Full Agent Documentation**: See [.github/copilot-instructions-agents.md](.github/copilot-instructions-agents.md)

### Quick Agent Reference for This Project

- **Frontend work** → @frontend-specialist (nextjs-react-expert, tailwind-patterns)
- **API routes** → @backend-specialist (api-patterns, nodejs-best-practices)
- **Database changes** → @database-architect (database-design, prisma-expert)
- **Security review** → @security-auditor (vulnerability-scanner)
- **Performance** → @performance-optimizer (performance-profiling)
- **SEO** → @seo-specialist (seo-fundamentals)
- **Deployment** → @devops-engineer (deployment-procedures, docker-expert)
- **Complex multi-domain tasks** → @orchestrator (coordinates 3+ agents)
- **🔥 Background Worker (News Agent)** → @backend-specialist (assigned monitor - see `WORKER-AGENT-ASSIGNMENT.md`)

### Intelligent Auto-Routing

The system automatically detects which agent/skills to apply based on your request context. Before responding, the AI will:
1. Analyze the domain (Frontend/Backend/Database/etc.)
2. Select appropriate specialist agent(s)
3. Load required skills
4. Announce which expertise is being applied

**Example**: When you ask to optimize a React component, the system auto-applies @frontend-specialist with 
extjs-react-expert and performance-profiling skills.

### Validation Scripts

Run quality checks before deployment:

`ash
# Core validation (security, lint, tests)
python .agent/scripts/checklist.py .

# Full suite (Lighthouse, E2E, bundle analysis)
python .agent/scripts/verify_all.py . --url http://localhost:3000
`

**For complete agent system documentation, workflows, and skill details**: See [.github/copilot-instructions-agents.md](.github/copilot-instructions-agents.md)

