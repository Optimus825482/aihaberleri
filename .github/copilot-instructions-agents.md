# 🤖 AI Agent System (Antigravity Kit)

> **Global Multi-Project AI Capability Framework** - Use across ANY project, ANY tech stack, ANY request type

## System Overview

The `.agent` directory contains a modular AI agent system with:
- **20 Specialist Agents** - Domain-specific AI personas
- **36 Skills** - Reusable knowledge modules
- **11 Workflows** - Structured task execution patterns
- **Validation Scripts** - Automated quality checks

### Core Philosophy

1. **Modular**: Skills are independent, load only what you need
2. **Selective**: Read skill indexes first, then specific sections
3. **Intelligent Routing**: Auto-detect which agent/skill to apply based on context
4. **Global**: Works for any project (Next.js, React, Python, Mobile, Game Dev, etc.)

## Agent Selection Matrix

### When to Use Which Agent

| Task Type | Primary Agent | Required Skills | Use Case |
|-----------|--------------|-----------------|----------|
| **Web Frontend** | `frontend-specialist` | nextjs-react-expert, tailwind-patterns, frontend-design | React/Next.js apps, UI components, performance optimization |
| **Backend API** | `backend-specialist` | api-patterns, nodejs-best-practices, database-design | REST/GraphQL APIs, business logic, server optimization |
| **Database** | `database-architect` | database-design, prisma-expert | Schema design, migrations, query optimization |
| **Mobile App** | `mobile-developer` | mobile-design | iOS/Android/React Native development |
| **Game Dev** | `game-developer` | game-development | Game logic, mechanics, physics |
| **DevOps/Deploy** | `devops-engineer` | deployment-procedures, docker-expert, server-management | CI/CD, Docker, infrastructure |
| **Security Audit** | `security-auditor` | vulnerability-scanner, red-team-tactics | OWASP compliance, vulnerability scanning |
| **Testing** | `test-engineer` | testing-patterns, tdd-workflow, webapp-testing | Unit/E2E tests, test strategies |
| **Debugging** | `debugger` | systematic-debugging | Root cause analysis, troubleshooting |
| **Performance** | `performance-optimizer` | performance-profiling | Core Web Vitals, bundle optimization |
| **SEO** | `seo-specialist` | seo-fundamentals, geo-fundamentals | Search ranking, E-E-A-T, metadata |
| **Planning** | `project-planner` | brainstorming, plan-writing, architecture | Task breakdown, discovery, architecture |
| **Multi-Domain** | `orchestrator` | parallel-agents, behavioral-modes | Complex tasks requiring 3+ agents |
| **Documentation** | `documentation-writer` | documentation-templates | Manuals, API docs, guides |
| **Code Quality** | `code-archaeologist` | clean-code, code-review-checklist | Refactoring, code review |

## Skill Categories

### Frontend & UI (5 skills)
- `nextjs-react-expert` - React/Next.js optimization (57 Vercel rules)
- `web-design-guidelines` - 100+ UI/UX/accessibility rules
- `tailwind-patterns` - Tailwind CSS v4 utilities
- `frontend-design` - UI/UX patterns, design systems
- `ui-ux-pro-max` - 50 styles, 21 palettes, 50 fonts

### Backend & API (4 skills)
- `api-patterns` - REST, GraphQL, tRPC best practices
- `nodejs-best-practices` - Node.js async, modules, optimization
- `python-patterns` - Python/FastAPI standards
- `database-design` - Schema design, normalization, indexing

### Testing & Quality (5 skills)
- `testing-patterns` - Jest, Vitest, testing strategies
- `webapp-testing` - E2E with Playwright
- `tdd-workflow` - Test-driven development
- `code-review-checklist` - Code review standards
- `lint-and-validate` - Linting, validation automation

### Security (2 skills)
- `vulnerability-scanner` - OWASP, security auditing
- `red-team-tactics` - Offensive security, penetration testing

### Architecture & Planning (3 skills)
- `architecture` - System design patterns, scalability
- `plan-writing` - Task breakdown, estimation
- `brainstorming` - Socratic discovery, requirements gathering

### Other Domains
- `mobile-design` - Mobile UI/UX patterns
- `game-development` - Game logic, mechanics
- `seo-fundamentals` - SEO, Core Web Vitals
- `performance-profiling` - Performance optimization
- `i18n-localization` - Internationalization
- `deployment-procedures` - CI/CD workflows
- `clean-code` - Universal coding standards (ALWAYS active)

## Intelligent Routing Protocol

### Auto-Detection Rules

**Before ANY response, silently analyze:**
1. **Domain Detection**: Identify technical domain (Frontend/Backend/Security/etc.)
2. **Agent Selection**: Choose most appropriate specialist(s)
3. **Skill Loading**: Load required skills from agent's metadata
4. **Announce**: Inform user which expertise is being applied

### Response Format

```markdown
🤖 **Applying knowledge of `@[agent-name]`...**

[Continue with specialized response using agent's skills and rules]
```

### Multi-Domain Tasks

For complex requests spanning multiple domains:
1. Use `orchestrator` agent
2. Coordinate minimum 3 specialist agents
3. Synthesize results into cohesive solution

### Workflow Commands

Structured task execution patterns (invoke with `/command`):

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `/orchestrate` | Multi-agent coordination | Complex multi-domain tasks |
| `/plan` | Task breakdown | Before large implementations |
| `/create` | Feature implementation | New functionality |
| `/enhance` | Code improvement | Optimization, refactoring |
| `/debug` | Troubleshooting | Bug investigation |
| `/test` | Testing execution | Run test suites |
| `/deploy` | Deployment | CI/CD execution |
| `/brainstorm` | Discovery | Requirements gathering |
| `/ui-ux-pro-max` | Design system | UI with 50 style options |

## Skill Loading Protocol

### Selective Reading (MANDATORY)

**DO NOT read entire skill folders**. Follow this sequence:

1. **Read SKILL.md** (index file) - Contains:
   - Metadata (when to use, allowed tools)
   - Content map (which sections for which problems)
   - Quick decision trees
   - Impact priority guides

2. **Identify relevant sections** - Based on specific task

3. **Read only needed sections** - Skip irrelevant parts

### Example: Performance Issue

```
Problem: Slow page loads
↓
Read: nextjs-react-expert/SKILL.md
↓
Decision Tree → "Slow page loads" → Section 1 + 2
↓
Read ONLY:
  - 1-async-eliminating-waterfalls.md
  - 2-bundle-bundle-size-optimization.md
↓
Apply rules, skip other 6 sections
```

## Validation Scripts

### Master Scripts (`.agent/scripts/`)

| Script | Purpose | When to Run |
|--------|---------|-------------|
| `checklist.py` | Core validation (security, lint, tests) | Development, pre-commit |
| `verify_all.py` | Full suite (Lighthouse, E2E, mobile) | Pre-deployment, releases |

### Usage

```bash
# Quick validation during development
python .agent/scripts/checklist.py .

# Comprehensive verification before deploy
python .agent/scripts/verify_all.py . --url http://localhost:3000
```

### What Gets Checked

**checklist.py** (Essential):
- Security vulnerabilities
- Code quality (lint, types)
- Schema validation
- Test suite execution
- UX audit
- SEO check

**verify_all.py** (Comprehensive):
- Everything above PLUS:
- Lighthouse (Core Web Vitals)
- Playwright E2E tests
- Bundle size analysis
- Mobile responsiveness
- i18n completeness

## Integration with AI Haberleri Project

### Current Project Context

This AI Haberleri project benefits from:
- `frontend-specialist` - Next.js optimization, React patterns
- `backend-specialist` - API routes, BullMQ job processing
- `database-architect` - Prisma schema, PostgreSQL optimization
- `security-auditor` - NextAuth security, API protection
- `seo-specialist` - Article metadata, sitemap generation
- `devops-engineer` - Docker multi-stage builds, Coolify deployment

### Automatic Application

When working on this project:
- **API routes** → Auto-load `backend-specialist` + `api-patterns`
- **Components** → Auto-load `frontend-specialist` + `nextjs-react-expert`
- **Database changes** → Auto-load `database-architect` + `database-design`
- **Deployment issues** → Auto-load `devops-engineer` + `deployment-procedures`
- **Performance** → Auto-load `performance-optimizer` + `nextjs-react-expert`

## Critical Rules

1. **Always Read Before Acting**: Never implement without reading relevant agent/skill files
2. **Selective Loading**: Read indexes first, load only needed sections
3. **Announce Expertise**: Always inform which agent/skills are being applied
4. **Multi-Domain = Orchestrator**: Tasks requiring 3+ domains use orchestrator
5. **Skill Priority**: GEMINI.md (P0) > Agent .md (P1) > SKILL.md (P2)
6. **Universal Clean Code**: `clean-code` skill rules apply to ALL code generation
7. **Validation**: Run appropriate validation scripts before deployment

## Quick Reference

**Need help with...?**
- 🌐 Web frontend → `@frontend-specialist`
- 🔌 API/Backend → `@backend-specialist`
- 📊 Database → `@database-architect`
- 📱 Mobile → `@mobile-developer`
- 🔒 Security → `@security-auditor`
- 🧪 Testing → `@test-engineer`
- 🐛 Debugging → `@debugger`
- 🚀 Performance → `@performance-optimizer`
- 📈 SEO → `@seo-specialist`
- 🎯 Planning → `@project-planner`
- 🎭 Complex tasks → `@orchestrator`

**Full documentation**: See `.agent/ARCHITECTURE.md`

## Global Installation

### ONE Installation, ALL Projects

**❌ DON'T**: Copy `.agent` folder to every project  
**✅ DO**: Install once globally, reference everywhere

#### Setup Once

```bash
# Windows
mkdir %USERPROFILE%\.ai-agents
cd %USERPROFILE%\.ai-agents
# Copy Antigravity Kit here

# Linux/Mac
mkdir -p ~/.ai-agents
cd ~/.ai-agents
# Copy Antigravity Kit here
```

#### Use in Every Project

Just add minimal reference to `.github/copilot-instructions.md`:

```markdown
# AI Agents

Global system: `~/.ai-agents` (see ARCHITECTURE.md for docs)
Auto-routing enabled - AI selects appropriate agents/skills.
```

### This System Works For:

✅ **Web Applications** (React, Vue, Next.js, Remix)
✅ **Backend APIs** (Node.js, Python, FastAPI, NestJS)
✅ **Mobile Apps** (React Native, iOS, Android)
✅ **Game Development** (Unity, Unreal, Godot)
✅ **DevOps** (Docker, Kubernetes, CI/CD)
✅ **Security Audits** (OWASP, penetration testing)
✅ **Performance Optimization** (Core Web Vitals, bundle analysis)
✅ **Database Design** (SQL, NoSQL, ORMs)
✅ **Testing** (Unit, Integration, E2E)
✅ **SEO** (Metadata, structured data, Core Web Vitals)

### Project-Specific Customization

While agents/skills are universal, you can:
- Add project context to `.github/copilot-instructions.md`
- Reference specific files/patterns from your codebase
- Combine with project-specific conventions
- Use validation scripts with custom thresholds

**Example**: "When working on authentication, follow NextAuth v5 patterns in `src/lib/auth.ts` + apply `@security-auditor` rules"
