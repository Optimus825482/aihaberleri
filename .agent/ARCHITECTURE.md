# Antigravity Kit Architecture

> **Global Multi-Project AI Capability Expansion Toolkit**
> 
> **🌍 WORKS ACROSS ANY PROJECT** - Next.js, React, Python, Mobile, Game Dev, Backend APIs, and more

---

## 📋 Overview

Antigravity Kit is a **universal, modular AI agent system** that provides:

- **20 Specialist Agents** - Role-based AI personas for any domain
- **36 Skills** - Domain-specific knowledge modules (selectively loadable)
- **11 Workflows** - Slash command procedures for structured execution
- **Validation Scripts** - Automated quality checks

### 🎯 Key Features

- **🌐 Global**: Works for ANY project, ANY tech stack, ANY language
- **🧩 Modular**: Load only what you need - skills are independent
- **🤖 Intelligent**: Auto-detects which agent/skill to apply based on context
- **📊 Validated**: Built-in scripts for security, performance, and quality checks
- **📚 Selective**: Read skill indexes first, then only relevant sections

---

## 🚀 Quick Start

### Global Installation (Recommended)

#### ONE-TIME Setup

```bash
# Windows
mkdir %USERPROFILE%\.ai-agents
cd %USERPROFILE%\.ai-agents
# Clone or copy the .agent contents here

# Linux/Mac
mkdir -p ~/.ai-agents
cd ~/.ai-agents
# Clone or copy the .agent contents here
```

#### Set Environment Variable (Optional)

```bash
# Windows (PowerShell)
[System.Environment]::SetEnvironmentVariable('AI_AGENTS_PATH', "$env:USERPROFILE\.ai-agents", 'User')

# Linux/Mac (add to ~/.bashrc or ~/.zshrc)
export AI_AGENTS_PATH="$HOME/.ai-agents"
```

#### Use in ANY Project

Add minimal reference to `.github/copilot-instructions.md`:

```markdown
# AI Agent System

Global Antigravity Kit: `%USERPROFILE%\.ai-agents` (Windows) or `~/.ai-agents` (Unix)
See global ARCHITECTURE.md for full documentation.

Auto-routing: AI detects domain and applies appropriate agent/skills.
```

**That's it!** No copying, no duplication. ONE installation serves ALL projects.

### Intelligent Auto-Detection

The system automatically:
1. **Analyzes your request** - Identifies domain (Frontend/Backend/Database/etc.)
2. **Selects appropriate agents** - Chooses specialist(s) based on context
3. **Loads required skills** - Only reads relevant skill sections
4. **Announces expertise** - Informs you which knowledge is being applied

**Example**: 
- You ask: "Optimize this React component"
- System activates: `@frontend-specialist` + `nextjs-react-expert` + `performance-profiling`
- You see: `🤖 Applying knowledge of @frontend-specialist...`

---

## 🏗️ Directory Structure

```plaintext
.agent/
├── ARCHITECTURE.md          # This file
├── agents/                  # 20 Specialist Agents
├── skills/                  # 36 Skills
├── workflows/               # 11 Slash Commands
├── rules/                   # Global Rules
└── scripts/                 # Master Validation Scripts
```

---

## 🤖 Agents (20)

Specialist AI personas for different domains.

| Agent | Focus | Skills Used |
| ----- | ----- | ----------- |
| `orchestrator` | Multi-agent coordination | parallel-agents, behavioral-modes |
| `project-planner` | Discovery, task planning | brainstorming, plan-writing, architecture |
| `frontend-specialist` | Web UI/UX | frontend-design, nextjs-react-expert, tailwind-patterns |
| `backend-specialist` | API, business logic | api-patterns, nodejs-best-practices, database-design |
| `database-architect` | Schema, SQL | database-design, prisma-expert |
| `mobile-developer` | iOS, Android, RN | mobile-design |
| `game-developer` | Game logic, mechanics | game-development |
| `devops-engineer` | CI/CD, Docker | deployment-procedures, docker-expert |
| `security-auditor` | Security compliance | vulnerability-scanner, red-team-tactics |
| `penetration-tester` | Offensive security | red-team-tactics |
| `test-engineer` | Testing strategies | testing-patterns, tdd-workflow, webapp-testing |
| `debugger` | Root cause analysis | systematic-debugging |
| `performance-optimizer` | Speed, Web Vitals | performance-profiling |
| `seo-specialist` | Ranking, visibility | seo-fundamentals, geo-fundamentals |
| `documentation-writer` | Manuals, docs | documentation-templates |
| `product-manager` | Requirements, user stories | plan-writing, brainstorming |
| `product-owner` | Strategy, backlog, MVP | plan-writing, brainstorming |
| `qa-automation-engineer` | E2E testing, CI pipelines | webapp-testing, testing-patterns |
| `code-archaeologist` | Legacy code, refactoring | clean-code, code-review-checklist |
| `explorer-agent` | Codebase analysis | - |

---

## 🧩 Skills (36)

Modular knowledge domains that agents can load on-demand. based on task context.

### Frontend & UI

| Skill | Description |
| ----- | ----------- |
| `nextjs-react-expert` | React & Next.js performance optimization (Vercel - 57 rules) |
| `web-design-guidelines` | Web UI audit - 100+ rules for accessibility, UX, performance (Vercel) |
| `tailwind-patterns` | Tailwind CSS v4 utilities |
| `frontend-design` | UI/UX patterns, design systems |
| `ui-ux-pro-max` | 50 styles, 21 palettes, 50 fonts |

### Backend & API

| Skill | Description |
| ----- | ----------- |
| `api-patterns` | REST, GraphQL, tRPC |
| `nestjs-expert` | NestJS modules, DI, decorators |
| `nodejs-best-practices` | Node.js async, modules |
| `python-patterns` | Python standards, FastAPI |

### Database

| Skill | Description |
| ----- | ----------- |
| `database-design` | Schema design, optimization |
| `prisma-expert` | Prisma ORM, migrations |

### TypeScript/JavaScript

| Skill | Description |
| ----- | ----------- |
| `typescript-expert` | Type-level programming, performance |

### Cloud & Infrastructure

| Skill | Description |
| ----- | ----------- |
| `docker-expert` | Containerization, Compose |
| `deployment-procedures` | CI/CD, deploy workflows |
| `server-management` | Infrastructure management |

### Testing & Quality

| Skill | Description |
| ----- | ----------- |
| `testing-patterns` | Jest, Vitest, strategies |
| `webapp-testing` | E2E, Playwright |
| `tdd-workflow` | Test-driven development |
| `code-review-checklist` | Code review standards |
| `lint-and-validate` | Linting, validation |

### Security

| Skill | Description |
| ----- | ----------- |
| `vulnerability-scanner` | Security auditing, OWASP |
| `red-team-tactics` | Offensive security |

### Architecture & Planning

| Skill | Description |
| ----- | ----------- |
| `app-builder` | Full-stack app scaffolding |
| `architecture` | System design patterns |
| `plan-writing` | Task planning, breakdown |
| `brainstorming` | Socratic questioning |

### Mobile

| Skill | Description |
| ----- | ----------- |
| `mobile-design` | Mobile UI/UX patterns |

### Game Development

| Skill | Description |
| ----- | ----------- |
| `game-development` | Game logic, mechanics |

### SEO & Growth

| Skill | Description |
| ----- | ----------- |
| `seo-fundamentals` | SEO, E-E-A-T, Core Web Vitals |
| `geo-fundamentals` | GenAI optimization |

### Shell/CLI

| Skill | Description |
| ----- | ----------- |
| `bash-linux` | Linux commands, scripting |
| `powershell-windows` | Windows PowerShell |

### Other

| Skill | Description |
| ----- | ----------- |
| `clean-code` | Coding standards (Global) |
| `behavioral-modes` | Agent personas |
| `parallel-agents` | Multi-agent patterns |
| `mcp-builder` | Model Context Protocol |
| `documentation-templates` | Doc formats |
| `i18n-localization` | Internationalization |
| `performance-profiling` | Web Vitals, optimization |
| `systematic-debugging` | Troubleshooting |

---

## 🔄 Workflows (11)

Slash command procedures. Invoke with `/command`.

| Command | Description |
| ------- | ----------- |
| `/brainstorm` | Socratic discovery |
| `/create` | Create new features |
| `/debug` | Debug issues |
| `/deploy` | Deploy application |
| `/enhance` | Improve existing code |
| `/orchestrate` | Multi-agent coordination |
| `/plan` | Task breakdown |
| `/preview` | Preview changes |
| `/status` | Check project status |
| `/test` | Run tests |
| `/ui-ux-pro-max` | Design with 50 styles |

---

## 🎯 Skill Loading Protocol

```plaintext
User Request → Skill Description Match → Load SKILL.md
                                            ↓
                                    Read references/
                                            ↓
                                    Read scripts/
```

### Selective Reading Rule (CRITICAL)

**❌ DON'T**: Read all files in a skill folder
**✅ DO**: Follow this sequence:

1. **Read SKILL.md** (index) - Contains metadata, content map, decision trees
2. **Identify relevant sections** - Based on your specific task
3. **Read ONLY needed sections** - Skip irrelevant content
4. **Execute scripts if available** - Use automation when possible

### Example: Performance Issue

```plaintext
User Request: "My Next.js app loads slowly"
↓
Step 1: Match keywords → "slow", "loads" → performance domain
↓
Step 2: Auto-select agent: @performance-optimizer
↓
Step 3: Load skill: nextjs-react-expert/SKILL.md
↓
Step 4: Read content map → "Slow page loads" → Sections 1 & 2
↓
Step 5: Read ONLY:
  - 1-async-eliminating-waterfalls.md (5 rules)
  - 2-bundle-bundle-size-optimization.md (5 rules)
↓
Step 6: Apply 10 rules, skip other 47 rules
```

### Skill Structure

```plaintext
skill-name/
├── SKILL.md           # (Required) Metadata, content map, decision trees
├── scripts/           # (Optional) Python/Bash automation scripts
├── references/        # (Optional) Templates, docs, checklists
└── assets/            # (Optional) Images, logos, diagrams
```

### Enhanced Skills (with scripts/references)

| Skill | Automation Scripts | Reference Files | Total Assets |
| ----- | ------------------ | --------------- | ------------ |
| `typescript-expert` | Type validator | tsconfig templates | 5 files |
| `ui-ux-pro-max` | Style generator | 50 styles, 21 palettes | 27 files |
| `app-builder` | Scaffolding scripts | Full-stack templates | 20 files |
| `vulnerability-scanner` | Security scan | OWASP checklist | 3 files |
| `webapp-testing` | Playwright runner | E2E templates | 4 files |

---

## 🌍 Cross-Project Usage

### This System Works For:

| Project Type | Compatible? | Primary Agents | Key Skills |
|--------------|-------------|----------------|------------|
| **Web Apps** (React, Next.js, Vue) | ✅ Yes | frontend-specialist, backend-specialist | nextjs-react-expert, api-patterns |
| **Mobile Apps** (React Native, iOS, Android) | ✅ Yes | mobile-developer | mobile-design |
| **Backend APIs** (Node.js, Python, FastAPI) | ✅ Yes | backend-specialist, database-architect | nodejs-best-practices, database-design |
| **Game Development** (Unity, Unreal, Godot) | ✅ Yes | game-developer | game-development |
| **DevOps/Infrastructure** | ✅ Yes | devops-engineer | deployment-procedures, docker-expert |
| **Security Audits** | ✅ Yes | security-auditor, penetration-tester | vulnerability-scanner, red-team-tactics |
| **Performance Optimization** | ✅ Yes | performance-optimizer | performance-profiling |
| **SEO & Marketing** | ✅ Yes | seo-specialist | seo-fundamentals, geo-fundamentals |
| **Testing & QA** | ✅ Yes | test-engineer, qa-automation-engineer | testing-patterns, webapp-testing |

### Language Support

| Language | Supported? | Relevant Skills |
|----------|------------|-----------------|
| JavaScript/TypeScript | ✅ Full | nextjs-react-expert, nodejs-best-practices, typescript-expert |
| Python | ✅ Full | python-patterns |
| SQL | ✅ Full | database-design |
| Bash/Shell | ✅ Full | bash-linux |
| PowerShell | ✅ Full | powershell-windows |
| CSS/Tailwind | ✅ Full | tailwind-patterns, frontend-design |
| Others | ⚠️ Partial | Use clean-code (universal) + domain-specific agents |

---

## � Scripts (2)

Master validation scripts that orchestrate skill-level scripts.

### Master Scripts

| Script | Purpose | When to Use |
| ------ | ------- | ----------- |
| `checklist.py` | Priority-based validation (Core checks) | Development, pre-commit |
| `verify_all.py` | Comprehensive verification (All checks) | Pre-deployment, releases |

### Usage

```bash
# Quick validation during development
python .agent/scripts/checklist.py .

# Full verification before deployment
python .agent/scripts/verify_all.py . --url http://localhost:3000
```

### What They Check

**checklist.py** (Core checks):

- Security (vulnerabilities, secrets)
- Code Quality (lint, types)
- Schema Validation
- Test Suite
- UX Audit
- SEO Check

**verify_all.py** (Full suite):

- Everything in checklist.py PLUS:
- Lighthouse (Core Web Vitals)
- Playwright E2E
- Bundle Analysis
- Mobile Audit
- i18n Check

For details, see [scripts/README.md](scripts/README.md)

---

## 📊 Statistics

| Metric | Value |
| ------ | ----- |
| **Total Agents** | 20 |
| **Total Skills** | 36 |
| **Total Workflows** | 11 |
| **Total Scripts** | 2 (master) + 18 (skill-level) |
| **Coverage** | ~90% web/mobile development |

---

## 🔗 Quick Reference

| Need | Agent | Skills |
| ---- | ----- | ------ |
| Web App | `frontend-specialist` | nextjs-react-expert, frontend-design |
| API | `backend-specialist` | api-patterns, nodejs-best-practices |
| Mobile | `mobile-developer` | mobile-design |
| Database | `database-architect` | database-design, prisma-expert |
| Security | `security-auditor` | vulnerability-scanner |
| Testing | `test-engineer` | testing-patterns, webapp-testing |
| Debug | `debugger` | systematic-debugging |
| Plan | `project-planner` | brainstorming, plan-writing |

## 📊 Statistics

| Metric | Value |
| ------ | ----- |
| **Total Agents** | 20 |
| **Total Skills** | 36 |
| **Total Workflows** | 11 |
| **Total Scripts** | 2 (master) + 18 (skill-level) |
| **Coverage** | ~90% web/mobile development |
| **Language Support** | JS/TS, Python, SQL, Bash, PowerShell |
| **Project Types** | Web, Mobile, Backend, Game Dev, DevOps |
| **Deployment Ready** | ✅ Copy .agent folder to any project |

---

## 🔗 Quick Reference

### By Domain

| Domain | Agent | Skills |
| ------ | ----- | ------ |
| **Web Frontend** | `frontend-specialist` | nextjs-react-expert, tailwind-patterns, frontend-design |
| **Backend API** | `backend-specialist` | api-patterns, nodejs-best-practices |
| **Mobile** | `mobile-developer` | mobile-design |
| **Database** | `database-architect` | database-design, prisma-expert |
| **Security** | `security-auditor` | vulnerability-scanner, red-team-tactics |
| **Testing** | `test-engineer` | testing-patterns, webapp-testing |
| **Debug** | `debugger` | systematic-debugging |
| **Performance** | `performance-optimizer` | performance-profiling |
| **SEO** | `seo-specialist` | seo-fundamentals |
| **Planning** | `project-planner` | brainstorming, plan-writing, architecture |
| **Complex Tasks** | `orchestrator` | parallel-agents, behavioral-modes (coordinates 3+ agents) |

### By Task Type

| Task | Agent | Command |
| ---- | ----- | ------- |
| "Build a web app" | orchestrator → frontend + backend + database | `/orchestrate` |
| "Optimize performance" | performance-optimizer | `/enhance` |
| "Fix this bug" | debugger | `/debug` |
| "Review security" | security-auditor | Check OWASP |
| "Write tests" | test-engineer | `/test` |
| "Deploy to production" | devops-engineer | `/deploy` |
| "Plan feature" | project-planner | `/plan` |
| "Design UI" | frontend-specialist | `/ui-ux-pro-max` |

---

## 🎓 Best Practices

### For AI Agents (Using This System)

1. **Always announce**: `🤖 Applying knowledge of @[agent-name]...`
2. **Read indexes first**: Load `SKILL.md`, check content map
3. **Selective loading**: Read only relevant sections, not entire folders
4. **Follow skill priority**: GEMINI.md (P0) > Agent .md (P1) > SKILL.md (P2)
5. **Use validation**: Run scripts before claiming "done"
6. **Orchestrate complexity**: 3+ domains = use `orchestrator`
7. **Clean code always**: `clean-code` skill applies to ALL code generation

### For Developers (Extending This System)

1. **Add new agents**: Create `agents/new-agent.md` with frontmatter
2. **Add new skills**: Create `skills/new-skill/SKILL.md` with metadata
3. **Add automation**: Include scripts in `skills/name/scripts/`
4. **Test validation**: Run `python .agent/scripts/checklist.py .`
5. **Document clearly**: Use decision trees and content maps in SKILL.md
6. **Keep modular**: One skill = one domain, avoid dependencies
7. **Make global**: Don't hardcode project-specific paths in skills

---

## 🚦 Usage Examples

### Example 1: New Web Project

```bash
# Copy system to new project
cp -r .agent /path/to/new-project/

# Reference in Copilot instructions
echo "See .agent/ARCHITECTURE.md for agent system" >> .github/copilot-instructions.md

# Use in prompts
# "Build a landing page" → Auto-activates frontend-specialist + nextjs-react-expert
# "Add authentication" → Auto-activates backend-specialist + security-auditor
# "Optimize performance" → Auto-activates performance-optimizer + nextjs-react-expert
```

### Example 2: Security Audit

```bash
# Run security scan
python .agent/scripts/checklist.py .

# Or ask AI: "Review security vulnerabilities"
# → Auto-activates security-auditor + vulnerability-scanner
# → Scans for OWASP Top 10, secrets, dependencies
```

### Example 3: Multi-Domain Task

```bash
# User: "Build a full-stack e-commerce app"
# System:
# 1. Activates: @orchestrator
# 2. Coordinates: @project-planner → @frontend-specialist → @backend-specialist → @database-architect → @security-auditor → @test-engineer
# 3. Delivers: Complete plan + implementation + tests + security review
```

---

## 📚 Further Reading

- **Agent Details**: See individual files in `agents/` folder
- **Skill Catalogs**: Each skill has detailed SKILL.md with usage patterns
- **Validation Scripts**: `scripts/README.md` for script documentation
- **Workflow Guides**: `workflows/` folder for slash command details
- **Global Rules**: `rules/GEMINI.md` for system-wide protocols

---

## 🤝 Contributing

To extend this system:

1. Follow the modular structure (agents, skills, workflows)
2. Keep skills project-agnostic (no hardcoded paths)
3. Add content maps and decision trees to SKILL.md files
4. Include automation scripts where applicable
5. Test across multiple project types
6. Document with examples

**Goal**: Make every agent, skill, and workflow **universally reusable** across ANY project.

