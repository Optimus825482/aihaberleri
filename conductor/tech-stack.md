# Tech Stack - AI News Platform

## Frontend
- **Framework:** Next.js 15 (App Router)
- **Library:** React 18
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** Shadcn UI, Radix UI
- **Icons:** Lucide React

## Backend & API
- **Runtime:** Node.js
- **API:** Next.js Server Actions & API Routes
- **Validation:** Zod

## Database & Storage
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Caching & Queue:** Redis (IORedis)

## Background Processing
- **Task Queue:** BullMQ
- **Worker:** Autonomous News Agent Worker (Node.js/tsx)

## Authentication
- **Provider:** NextAuth.js

## AI & External Services
- **Primary AI:** DeepSeek API (Reasoner)
- **Search:** Brave Search API
- **Images:** Unsplash API
- **Audio/TTS:** Python `edge-tts` library (via Node.js spawn)

## Infrastructure
- **Containerization:** Docker, Docker Compose
- **Web Server:** Nginx (via Docker)
- **CI/CD:** Production-ready Dockerfiles (Simple & Production)