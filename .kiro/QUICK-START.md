# 🚀 Kiro Skills System - Quick Start Guide

> **5 dakikada** Antigravity Kit'i Kiro'nun yeni Skills sistemi ile kullanmaya başla!

---

## ⚡ Hızlı Başlangıç

### 1. Migration'ı Çalıştır (Opsiyonel)

```powershell
# Test mode (hiçbir şey değiştirmez)
.\.kiro\scripts\migrate-skills.ps1 -DryRun

# Gerçek migration
.\.kiro\scripts\migrate-skills.ps1
```

**Not:** Migration opsiyoneldir. Mevcut `.agent/` yapısı hala çalışır. Yeni `.kiro/` yapısı daha optimize edilmiş skill loading sağlar.

---

### 2. İlk Skill'i Dene

```
# Kiro'ya sor:
"REST API tasarla"

# Otomatik olarak api-patterns skill yüklenir
```

**Nasıl çalışır?**

- Kiro, "REST API" keywords'lerini görür
- `api-patterns` skill'ini otomatik match eder
- Sadece metadata başlangıçta yüklenir
- Detaylı içerik ihtiyaç duyulduğunda yüklenir

---

### 3. Agent Kullan

```
@backend-specialist Node.js API endpoint tasarla
@frontend-specialist React component optimize et
@security-auditor Bu kodu audit et
```

**Agent'lar otomatik olarak ilgili skill'leri yükler:**

- `@backend-specialist` → `api-patterns`, `database-design`, `nodejs-best-practices`
- `@frontend-specialist` → `nextjs-react-expert`, `frontend-design`, `tailwind-patterns`

---

### 4. Workflow Kullan

```
/brainstorm Authentication strategy
/create E-commerce checkout flow
/debug Memory leak problemi
```

**Workflow'lar structured process sağlar:**

- `/brainstorm` → Seçenekleri keşfet
- `/create` → Feature oluştur
- `/debug` → Sistematik debug

---

## 📚 Temel Kavramlar

### Skills (36 adet)

Domain-specific bilgi modülleri. Progressive loading ile optimize edilmiş.

**Örnek:**

```yaml
---
name: "api-patterns"
description: "API design principles..."
keywords: ["api", "rest", "graphql"]
---
```

### Agents (20 adet)

Specialized AI personas. Otomatik olarak ilgili skill'leri yükler.

**Örnek:**

```yaml
---
name: "backend-specialist"
skills: ["api-patterns", "database-design"]
---
```

### Workflows (11 adet)

Slash command procedures. Structured process sağlar.

**Örnek:**

```yaml
---
name: "brainstorm"
trigger: "/brainstorm"
---
```

---

## 🎯 Kullanım Senaryoları

### Senaryo 1: API Tasarımı

```
1. /brainstorm REST vs GraphQL vs tRPC
   → Seçenekleri karşılaştır

2. @backend-specialist Seçilen yaklaşımı implement et
   → Otomatik olarak api-patterns skill yüklenir

3. /test API endpoints
   → Test suite oluştur
```

### Senaryo 2: Performance Optimization

```
1. @performance-optimizer Next.js performansını analiz et
   → nextjs-react-expert skill yüklenir (57 rules)

2. /enhance Bundle size'ı küçült
   → Optimization uygula

3. /test Performance metrics
   → Lighthouse test
```

### Senaryo 3: Full-Stack Feature

```
1. /plan User authentication feature
   → Task breakdown

2. /orchestrate
   - @backend-specialist: API endpoints
   - @frontend-specialist: Login UI
   - @security-auditor: Security audit
   - @test-engineer: Test suite

3. /deploy Production'a deploy et
```

---

## 🔍 Skill Matching Nasıl Çalışır?

Kiro, task'inizdeki keywords'lere göre otomatik skill seçer:

```
User: "REST API tasarla"
→ Keywords: ["rest", "api", "design"]
→ Matched: api-patterns
→ Loads: api-patterns.md (metadata only)
→ Full content: On-demand

User: "React performansını artır"
→ Keywords: ["react", "performance"]
→ Matched: nextjs-react-expert
→ Loads: nextjs-react-expert.md (metadata only)
→ Full content: On-demand
```

---

## 📊 Mevcut Skills

### 🎨 Frontend (8)

- `nextjs-react-expert` - React/Next.js (57 rules)
- `frontend-design` - UI/UX patterns
- `tailwind-patterns` - Tailwind CSS
- `web-design-guidelines` - Web audit (100+ rules)
- `mobile-design` - Mobile UI/UX
- `ui-ux-pro-max` - 50 styles

### ⚙️ Backend (6)

- `api-patterns` - REST/GraphQL/tRPC
- `nodejs-best-practices` - Node.js
- `python-patterns` - Python/FastAPI
- `database-design` - Schema design
- `server-management` - Infrastructure

### 🧪 Testing (5)

- `testing-patterns` - Jest/Vitest
- `webapp-testing` - E2E/Playwright
- `tdd-workflow` - TDD
- `code-review-checklist` - Code review
- `lint-and-validate` - Linting

### 🔒 Security (2)

- `vulnerability-scanner` - OWASP
- `red-team-tactics` - Offensive security

### 🏗️ Architecture (4)

- `architecture` - System design
- `app-builder` - Full-stack scaffolding
- `clean-code` - Coding standards
- `plan-writing` - Task planning

### 🚀 DevOps (3)

- `deployment-procedures` - CI/CD
- `docker-expert` - Containerization
- `performance-profiling` - Optimization

### 📚 Other (8)

- `brainstorming` - Socratic questioning
- `systematic-debugging` - Troubleshooting
- `documentation-templates` - Docs
- `seo-fundamentals` - SEO
- `i18n-localization` - i18n
- `mcp-builder` - MCP
- `bash-linux` - Linux
- `powershell-windows` - Windows

---

## 🤖 Mevcut Agents

### Development

- `frontend-specialist` - React/Next.js
- `backend-specialist` - API/logic
- `mobile-developer` - iOS/Android
- `game-developer` - Game mechanics

### Architecture

- `orchestrator` - Multi-agent
- `project-planner` - Planning
- `database-architect` - Schema
- `code-archaeologist` - Refactoring

### Quality

- `security-auditor` - Security
- `penetration-tester` - Offensive
- `test-engineer` - Testing
- `qa-automation-engineer` - E2E
- `debugger` - Debug
- `performance-optimizer` - Performance

### DevOps

- `devops-engineer` - CI/CD
- `documentation-writer` - Docs
- `seo-specialist` - SEO

### Product

- `product-manager` - Requirements
- `product-owner` - Strategy

### Exploration

- `explorer-agent` - Codebase analysis

---

## ⚡ Workflows

| Command          | Description              |
| ---------------- | ------------------------ |
| `/brainstorm`    | Seçenekleri keşfet       |
| `/create`        | Feature oluştur          |
| `/debug`         | Sistematik debug         |
| `/deploy`        | Production deploy        |
| `/enhance`       | Code iyileştir           |
| `/orchestrate`   | Multi-agent              |
| `/plan`          | Task breakdown           |
| `/preview`       | Local preview            |
| `/status`        | Health check             |
| `/test`          | Test suite               |
| `/ui-ux-pro-max` | UI/UX design (50 styles) |

---

## 💡 Pro Tips

### 1. Skill Kombinasyonu

```
@backend-specialist + @security-auditor
Secure API endpoint tasarla
```

### 2. Workflow Zinciri

```
/brainstorm → /plan → /create → /test → /deploy
```

### 3. Manuel Skill Referansı

```
@skill:api-patterns REST best practices
@skill:nextjs-react-expert Performance optimization
```

### 4. Context Sağla

```
# İyi ❌
"API tasarla"

# Daha iyi ✅
"E-commerce için REST API tasarla. PostgreSQL kullanıyoruz. JWT auth gerekli."
```

---

## 🔧 Troubleshooting

### Skill yüklenmiyor?

```
# Manuel yükle:
@skill:skill-name [task]
```

### Agent çalışmıyor?

```
# Agent'ı kontrol et:
.kiro/agents/agent-name.md dosyasını incele
```

### Workflow hata veriyor?

```
# Workflow'u kontrol et:
.kiro/workflows/workflow-name.md dosyasını incele
```

---

## 📖 Daha Fazla Bilgi

- **Full Documentation:** `.kiro/README.md`
- **Migration Guide:** `.kiro/MIGRATION-PLAN.md`
- **Kiro Changelog:** https://kiro.dev/changelog/

---

## 🎉 Başarılı!

Artık Kiro'nun yeni Skills sistemini kullanmaya hazırsın!

**İlk task'ini dene:**

```
@frontend-specialist Merhaba! Nasıl yardımcı olabilirsin?
```

veya

```
/brainstorm En iyi state management çözümü nedir?
```

---

**Last Updated:** January 29, 2026
**Kiro Version:** Latest (January 2026 Update)
