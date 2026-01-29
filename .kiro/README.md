# 🚀 Kiro Skills System - Antigravity Kit Migration

> **Antigravity Kit** artık Kiro'nun yeni **Progressive Loading Skills** sistemine uyumlu!

---

## 📋 Neler Değişti?

### ✨ Yeni Özellikler (Ocak 2026)

1. **Progressive Context Loading**
   - Sadece metadata başlangıçta yüklenir
   - Tam içerik ihtiyaç duyulduğunda yüklenir
   - Daha hızlı agent başlatma

2. **YAML Frontmatter**
   - Zengin metadata desteği
   - Keywords ile akıllı skill matching
   - Category ve priority sistemi

3. **Better Organization**
   - Skills, Agents, Workflows ayrı klasörlerde
   - Daha kolay keşfedilebilir
   - Daha iyi IDE entegrasyonu

---

## 📁 Yeni Yapı

```
.kiro/
├── skills/              # 36 domain-specific skills
│   ├── api-patterns.md
│   ├── nextjs-react-expert.md
│   ├── database-design.md
│   └── ...
├── agents/              # 20 specialist agents
│   ├── frontend-specialist.md
│   ├── backend-specialist.md
│   └── ...
├── workflows/           # 11 slash command workflows
│   ├── brainstorm.md
│   ├── create.md
│   └── ...
├── scripts/             # Migration & validation scripts
│   └── migrate-skills.ps1
├── MIGRATION-PLAN.md    # Migration documentation
└── README.md            # This file
```

---

## 🎯 Nasıl Kullanılır?

### 1. Skills Kullanımı

Skills artık otomatik olarak yüklenir. Kiro, task'e göre ilgili skill'i seçer:

```
# Örnek: API tasarımı
"REST API tasarla" → api-patterns skill otomatik yüklenir

# Örnek: Performance optimization
"Next.js performansını artır" → nextjs-react-expert skill yüklenir
```

**Manuel Skill Referansı:**

```
@skill:api-patterns REST vs GraphQL karşılaştır
@skill:database-design PostgreSQL schema tasarla
```

### 2. Agents Kullanımı

Agent'ları mention ederek çağır:

```
@frontend-specialist React component optimize et
@backend-specialist API endpoint tasarla
@security-auditor Bu kodu audit et
```

### 3. Workflows Kullanımı

Slash komutları ile workflow'ları tetikle:

```
/brainstorm Authentication strategy
/create E-commerce checkout flow
/debug Memory leak problemi
/deploy Production'a deploy et
```

---

## 🔧 Migration

### Otomatik Migration

```powershell
# Dry run (test mode)
.\.kiro\scripts\migrate-skills.ps1 -DryRun

# Gerçek migration
.\.kiro\scripts\migrate-skills.ps1

# Verbose output
.\.kiro\scripts\migrate-skills.ps1 -Verbose
```

### Manuel Migration

Eğer özel bir skill eklemek istersen:

```yaml
---
name: "my-custom-skill"
description: "Short description for skill matching"
keywords: ["keyword1", "keyword2", "keyword3"]
category: "frontend|backend|devops|testing|security"
relatedSkills: ["skill1", "skill2"]
priority: "critical|high|medium|low"
---
# Skill Content

Your skill documentation here...
```

---

## 📊 Migration Status

| Category      | Count | Status              |
| ------------- | ----- | ------------------- |
| **Skills**    | 36    | ✅ Ready to migrate |
| **Agents**    | 20    | ✅ Ready to migrate |
| **Workflows** | 11    | ✅ Ready to migrate |
| **Scripts**   | 20    | ✅ No change needed |

---

## 🎨 Skill Categories

### Frontend (8 skills)

- `nextjs-react-expert` - React/Next.js performance (57 rules)
- `frontend-design` - UI/UX patterns
- `tailwind-patterns` - Tailwind CSS v4
- `web-design-guidelines` - Web UI audit (100+ rules)
- `mobile-design` - Mobile UI/UX
- `ui-ux-pro-max` - 50 styles, 21 palettes

### Backend (6 skills)

- `api-patterns` - REST/GraphQL/tRPC
- `nodejs-best-practices` - Node.js patterns
- `python-patterns` - Python/FastAPI
- `database-design` - Schema design
- `server-management` - Infrastructure

### Testing & Quality (5 skills)

- `testing-patterns` - Jest/Vitest
- `webapp-testing` - E2E/Playwright
- `tdd-workflow` - Test-driven development
- `code-review-checklist` - Code review
- `lint-and-validate` - Linting

### Security (2 skills)

- `vulnerability-scanner` - OWASP auditing
- `red-team-tactics` - Offensive security

### Architecture (4 skills)

- `architecture` - System design
- `app-builder` - Full-stack scaffolding
- `clean-code` - Coding standards
- `plan-writing` - Task planning

### DevOps (3 skills)

- `deployment-procedures` - CI/CD
- `docker-expert` - Containerization
- `performance-profiling` - Optimization

### Other (8 skills)

- `brainstorming` - Socratic questioning
- `systematic-debugging` - Troubleshooting
- `documentation-templates` - Docs
- `seo-fundamentals` - SEO/E-E-A-T
- `i18n-localization` - Internationalization
- `mcp-builder` - Model Context Protocol
- `bash-linux` - Linux commands
- `powershell-windows` - Windows PowerShell

---

## 🤖 Available Agents

### Development

- `frontend-specialist` - React/Next.js expert
- `backend-specialist` - API/business logic
- `mobile-developer` - iOS/Android/RN
- `game-developer` - Game mechanics

### Architecture & Planning

- `orchestrator` - Multi-agent coordination
- `project-planner` - Task planning
- `database-architect` - Schema design
- `code-archaeologist` - Legacy refactoring

### Quality & Security

- `security-auditor` - Security compliance
- `penetration-tester` - Offensive security
- `test-engineer` - Testing strategies
- `qa-automation-engineer` - E2E testing
- `debugger` - Root cause analysis
- `performance-optimizer` - Speed optimization

### DevOps & Docs

- `devops-engineer` - CI/CD/Docker
- `documentation-writer` - Manuals/docs
- `seo-specialist` - SEO/ranking

### Product

- `product-manager` - Requirements/stories
- `product-owner` - Strategy/backlog

### Exploration

- `explorer-agent` - Codebase analysis

---

## ⚡ Workflows

| Command          | Description                             |
| ---------------- | --------------------------------------- |
| `/brainstorm`    | Socratic discovery & option exploration |
| `/create`        | Create new features/apps                |
| `/debug`         | Systematic debugging                    |
| `/deploy`        | Production deployment                   |
| `/enhance`       | Code improvement                        |
| `/orchestrate`   | Multi-agent coordination                |
| `/plan`          | Task breakdown & planning               |
| `/preview`       | Local preview & testing                 |
| `/status`        | Project health check                    |
| `/test`          | Test generation & execution             |
| `/ui-ux-pro-max` | Professional UI/UX design (50 styles)   |

---

## 🔍 Skill Matching

Kiro otomatik olarak task'e göre skill seçer:

```
User: "REST API tasarla"
→ Keywords: ["api", "rest", "design"]
→ Matched Skill: api-patterns
→ Loads: api-patterns.md

User: "React performansını artır"
→ Keywords: ["react", "performance", "optimization"]
→ Matched Skill: nextjs-react-expert
→ Loads: nextjs-react-expert.md
```

---

## 📚 Eski Yapı (Referans)

Eski `.agent/` yapısı hala mevcut ve referans için kullanılabilir:

```
.agent/
├── skills/              # Detaylı skill dosyaları
│   ├── api-patterns/
│   │   ├── SKILL.md
│   │   ├── rest.md
│   │   ├── graphql.md
│   │   └── ...
│   └── ...
├── agents/              # Agent tanımları
├── workflows/           # Workflow tanımları
└── scripts/             # Validation scripts
```

**Not:** `.agent/` klasörü migration sonrası backup olarak saklanabilir.

---

## 🎯 Best Practices

### Skill Yazarken

1. **Descriptive metadata** - Keywords'leri iyi seç
2. **Progressive content** - Özet → Detay yapısı
3. **Related skills** - İlgili skill'leri referans et
4. **Examples** - Kullanım örnekleri ekle

### Agent Kullanırken

1. **Specific tasks** - Net görev tanımla
2. **Context** - Gerekli context'i sağla
3. **Combine agents** - Karmaşık görevler için multiple agent kullan

### Workflow Kullanırken

1. **Right workflow** - Doğru workflow'u seç
2. **Clear input** - Net input sağla
3. **Chain workflows** - Workflow'ları zincirle

---

## 🚀 Sonraki Adımlar

1. **Migration'ı çalıştır:**

   ```powershell
   .\.kiro\scripts\migrate-skills.ps1
   ```

2. **Test et:**

   ```
   @frontend-specialist Merhaba!
   /brainstorm Authentication strategy
   ```

3. **Customize et:**
   - Keywords'leri güncelle
   - Categories'leri düzenle
   - Yeni skill'ler ekle

4. **Backup al:**
   ```powershell
   Copy-Item .agent .agent.backup -Recurse
   ```

---

## 📖 Daha Fazla Bilgi

- **Kiro Changelog:** https://kiro.dev/changelog/
- **Skills Documentation:** https://kiro.dev/docs/skills
- **Migration Guide:** `.kiro/MIGRATION-PLAN.md`

---

**Migration Date:** January 29, 2026
**Kiro Version:** Latest (January 2026 Update)
**Status:** ✅ Ready to use
