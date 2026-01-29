# 📚 Kiro Skills System - Index

> **Hızlı erişim** için tüm dosyaların listesi ve açıklamaları

---

## 📁 Klasör Yapısı

```
.kiro/
├── skills/              # 36 domain-specific skills
├── agents/              # 20 specialist agents
├── workflows/           # 11 slash command workflows
├── scripts/             # Migration & validation scripts
└── docs/                # Documentation files
```

---

## 📖 Dokümantasyon Dosyaları

| Dosya                   | Açıklama           | Ne Zaman Oku               |
| ----------------------- | ------------------ | -------------------------- |
| `README.md`             | Full documentation | İlk kurulum, detaylı bilgi |
| `QUICK-START.md`        | 5-minute guide     | Hızlı başlangıç            |
| `MIGRATION-PLAN.md`     | Migration details  | Migration öncesi           |
| `MIGRATION-COMPLETE.md` | Migration summary  | Migration sonrası          |
| `INDEX.md`              | This file          | Hızlı referans             |

---

## 🧩 Skills (36)

### Frontend (8)

| Skill                   | Keywords                   | Priority |
| ----------------------- | -------------------------- | -------- |
| `nextjs-react-expert`   | nextjs, react, performance | CRITICAL |
| `frontend-design`       | ui, ux, design             | HIGH     |
| `tailwind-patterns`     | tailwind, css              | MEDIUM   |
| `web-design-guidelines` | web, audit, accessibility  | HIGH     |
| `mobile-design`         | mobile, ios, android       | MEDIUM   |
| `ui-ux-pro-max`         | design, styles, palettes   | MEDIUM   |
| `clean-code`            | code, quality, standards   | HIGH     |
| `lint-and-validate`     | lint, validation           | MEDIUM   |

### Backend (6)

| Skill                   | Keywords                 | Priority |
| ----------------------- | ------------------------ | -------- |
| `api-patterns`          | api, rest, graphql, trpc | HIGH     |
| `nodejs-best-practices` | nodejs, javascript       | MEDIUM   |
| `python-patterns`       | python, fastapi          | MEDIUM   |
| `database-design`       | database, schema, sql    | HIGH     |
| `server-management`     | server, infrastructure   | MEDIUM   |
| `mcp-builder`           | mcp, protocol            | LOW      |

### Testing (5)

| Skill                   | Keywords            | Priority |
| ----------------------- | ------------------- | -------- |
| `testing-patterns`      | test, jest, vitest  | HIGH     |
| `webapp-testing`        | e2e, playwright     | MEDIUM   |
| `tdd-workflow`          | tdd, test-driven    | MEDIUM   |
| `code-review-checklist` | review, quality     | HIGH     |
| `systematic-debugging`  | debug, troubleshoot | HIGH     |

### Security (2)

| Skill                   | Keywords            | Priority |
| ----------------------- | ------------------- | -------- |
| `vulnerability-scanner` | security, owasp     | CRITICAL |
| `red-team-tactics`      | security, offensive | HIGH     |

### Architecture (4)

| Skill           | Keywords             | Priority |
| --------------- | -------------------- | -------- |
| `architecture`  | architecture, design | HIGH     |
| `app-builder`   | scaffold, fullstack  | MEDIUM   |
| `plan-writing`  | planning, tasks      | MEDIUM   |
| `brainstorming` | brainstorm, ideas    | MEDIUM   |

### DevOps (3)

| Skill                   | Keywords                  | Priority |
| ----------------------- | ------------------------- | -------- |
| `deployment-procedures` | deploy, cicd              | HIGH     |
| `docker-expert`         | docker, container         | MEDIUM   |
| `performance-profiling` | performance, optimization | HIGH     |

### Other (8)

| Skill                     | Keywords              | Priority |
| ------------------------- | --------------------- | -------- |
| `documentation-templates` | docs, documentation   | MEDIUM   |
| `seo-fundamentals`        | seo, ranking          | MEDIUM   |
| `i18n-localization`       | i18n, translation     | LOW      |
| `bash-linux`              | bash, linux, shell    | LOW      |
| `powershell-windows`      | powershell, windows   | LOW      |
| `geo-fundamentals`        | geo, location         | LOW      |
| `behavioral-modes`        | behavior, modes       | LOW      |
| `parallel-agents`         | parallel, multi-agent | MEDIUM   |

---

## 🤖 Agents (20)

### Development (4)

| Agent                 | Keywords             | Skills                               |
| --------------------- | -------------------- | ------------------------------------ |
| `frontend-specialist` | frontend, react, ui  | nextjs-react-expert, frontend-design |
| `backend-specialist`  | backend, api, server | api-patterns, database-design        |
| `mobile-developer`    | mobile, ios, android | mobile-design                        |
| `game-developer`      | game, mechanics      | game-development                     |

### Architecture (4)

| Agent                | Keywords                 | Skills                      |
| -------------------- | ------------------------ | --------------------------- |
| `orchestrator`       | orchestrate, multi-agent | parallel-agents             |
| `project-planner`    | plan, tasks              | plan-writing, brainstorming |
| `database-architect` | database, schema         | database-design             |
| `code-archaeologist` | refactor, legacy         | clean-code                  |

### Quality (6)

| Agent                    | Keywords              | Skills                |
| ------------------------ | --------------------- | --------------------- |
| `security-auditor`       | security, audit       | vulnerability-scanner |
| `penetration-tester`     | security, offensive   | red-team-tactics      |
| `test-engineer`          | test, testing         | testing-patterns      |
| `qa-automation-engineer` | qa, e2e               | webapp-testing        |
| `debugger`               | debug, troubleshoot   | systematic-debugging  |
| `performance-optimizer`  | performance, optimize | performance-profiling |

### DevOps (3)

| Agent                  | Keywords            | Skills                  |
| ---------------------- | ------------------- | ----------------------- |
| `devops-engineer`      | devops, cicd        | deployment-procedures   |
| `documentation-writer` | docs, documentation | documentation-templates |
| `seo-specialist`       | seo, ranking        | seo-fundamentals        |

### Product (2)

| Agent             | Keywords              | Skills       |
| ----------------- | --------------------- | ------------ |
| `product-manager` | product, requirements | plan-writing |
| `product-owner`   | product, strategy     | plan-writing |

### Exploration (1)

| Agent            | Keywords          | Skills |
| ---------------- | ----------------- | ------ |
| `explorer-agent` | explore, codebase | -      |

---

## ⚡ Workflows (11)

| Workflow        | Trigger          | Keywords                | Use Case                 |
| --------------- | ---------------- | ----------------------- | ------------------------ |
| `brainstorm`    | `/brainstorm`    | ideas, options          | Seçenekleri keşfet       |
| `create`        | `/create`        | create, feature         | Feature oluştur          |
| `debug`         | `/debug`         | debug, fix              | Sistematik debug         |
| `deploy`        | `/deploy`        | deploy, production      | Production deploy        |
| `enhance`       | `/enhance`       | improve, optimize       | Code iyileştir           |
| `orchestrate`   | `/orchestrate`   | multi-agent, coordinate | Multi-agent koordinasyon |
| `plan`          | `/plan`          | plan, tasks             | Task breakdown           |
| `preview`       | `/preview`       | preview, test           | Local preview            |
| `status`        | `/status`        | status, health          | Health check             |
| `test`          | `/test`          | test, suite             | Test generation          |
| `ui-ux-pro-max` | `/ui-ux-pro-max` | design, ui, ux          | Professional UI/UX       |

---

## 🔧 Scripts

| Script               | Açıklama           | Kullanım                             |
| -------------------- | ------------------ | ------------------------------------ |
| `migrate-skills.ps1` | Otomatik migration | `.\.kiro\scripts\migrate-skills.ps1` |

---

## 🎯 Hızlı Referans

### Skill Kullanımı

```
# Otomatik matching
"REST API tasarla" → api-patterns

# Manuel referans
@skill:api-patterns REST best practices
```

### Agent Kullanımı

```
@backend-specialist Node.js API tasarla
@frontend-specialist React component optimize et
```

### Workflow Kullanımı

```
/brainstorm Authentication strategy
/create E-commerce checkout
```

---

## 📊 İstatistikler

| Kategori      | Miktar |
| ------------- | ------ |
| **Skills**    | 36     |
| **Agents**    | 20     |
| **Workflows** | 11     |
| **Docs**      | 5      |
| **Scripts**   | 1      |
| **Total**     | 73     |

---

## 🔍 Arama Tablosu

### Keyword → Skill Mapping

| Keyword                    | Skill                 |
| -------------------------- | --------------------- |
| api, rest, graphql         | api-patterns          |
| react, nextjs, performance | nextjs-react-expert   |
| database, schema, sql      | database-design       |
| test, jest, vitest         | testing-patterns      |
| security, owasp            | vulnerability-scanner |
| deploy, cicd               | deployment-procedures |
| ui, ux, design             | frontend-design       |
| docker, container          | docker-expert         |
| debug, troubleshoot        | systematic-debugging  |
| seo, ranking               | seo-fundamentals      |

### Use Case → Agent Mapping

| Use Case                 | Agent                 |
| ------------------------ | --------------------- |
| API development          | backend-specialist    |
| UI development           | frontend-specialist   |
| Security audit           | security-auditor      |
| Performance optimization | performance-optimizer |
| Testing                  | test-engineer         |
| Deployment               | devops-engineer       |
| Planning                 | project-planner       |
| Debugging                | debugger              |
| Documentation            | documentation-writer  |
| Mobile development       | mobile-developer      |

### Task → Workflow Mapping

| Task              | Workflow       |
| ----------------- | -------------- |
| Explore options   | /brainstorm    |
| Create feature    | /create        |
| Fix bug           | /debug         |
| Deploy app        | /deploy        |
| Improve code      | /enhance       |
| Coordinate agents | /orchestrate   |
| Plan tasks        | /plan          |
| Test locally      | /preview       |
| Check health      | /status        |
| Generate tests    | /test          |
| Design UI         | /ui-ux-pro-max |

---

## 📖 Daha Fazla Bilgi

- **Full Docs:** `README.md`
- **Quick Start:** `QUICK-START.md`
- **Migration:** `MIGRATION-PLAN.md`
- **Kiro Changelog:** https://kiro.dev/changelog/

---

**Last Updated:** January 29, 2026
**Version:** 1.0.0
