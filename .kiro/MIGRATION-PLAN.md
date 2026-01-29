# 🚀 Antigravity Kit → Kiro Skills Migration Plan

## 📋 Migration Overview

Converting `.agent/` structure to Kiro's new **Skills System** (January 2026).

---

## 🎯 What's Changing?

### Old Structure (`.agent/`)

```
.agent/
├── agents/          # 20 specialist agents
├── skills/          # 36 domain skills
├── workflows/       # 11 slash commands
├── rules/           # Global rules
└── scripts/         # Validation scripts
```

### New Structure (`.kiro/`)

```
.kiro/
├── skills/          # Progressive loading with YAML frontmatter
├── agents/          # Agent definitions with YAML frontmatter
├── workflows/       # Workflow definitions
└── scripts/         # Validation scripts (unchanged)
```

---

## 🔧 Key Changes

### 1. **Skills System (Progressive Loading)**

**Before:**

```markdown
# API Patterns

> API design principles...
```

**After:**

```yaml
---
name: "api-patterns"
description: "API design principles and decision-making. REST vs GraphQL vs tRPC selection, response formats, versioning, pagination."
keywords: ["api", "rest", "graphql", "trpc", "design"]
category: "backend"
---

# API Patterns

> API design principles...
```

**Benefits:**

- ✅ Only metadata loads at startup
- ✅ Full content loads on-demand
- ✅ Faster agent initialization
- ✅ Better context management

---

### 2. **Agent Definitions**

**Before:**

```markdown
---
name: frontend-specialist
description: Senior Frontend Architect...
tools: Read, Grep, Glob, Bash, Edit, Write
model: inherit
skills: clean-code, nextjs-react-expert, web-design-guidelines
---
```

**After:**

```yaml
---
name: "frontend-specialist"
description: "Senior Frontend Architect who builds maintainable React/Next.js systems with performance-first mindset."
keywords: ["frontend", "react", "nextjs", "ui", "ux", "css", "tailwind"]
skills:
  [
    "clean-code",
    "nextjs-react-expert",
    "web-design-guidelines",
    "tailwind-patterns",
    "frontend-design",
  ]
tools: ["Read", "Grep", "Glob", "Bash", "Edit", "Write"]
model: "inherit"
---
```

---

### 3. **Workflows**

**Before:**

```markdown
---
description: Structured brainstorming for projects and features.
---

# /brainstorm - Structured Idea Exploration
```

**After:**

```yaml
---
name: "brainstorm"
description: "Structured brainstorming for projects and features. Explores multiple options before implementation."
keywords: ["brainstorm", "ideas", "options", "exploration"]
trigger: "/brainstorm"
---
# Brainstorm Workflow
```

---

## 📊 Migration Statistics

| Category      | Count | Status              |
| ------------- | ----- | ------------------- |
| **Skills**    | 36    | ⏳ To migrate       |
| **Agents**    | 20    | ⏳ To migrate       |
| **Workflows** | 11    | ⏳ To migrate       |
| **Scripts**   | 20    | ✅ No change needed |

---

## 🎯 Migration Steps

### Phase 1: Skills Migration (36 files)

- [ ] Add YAML frontmatter to all SKILL.md files
- [ ] Move to `.kiro/skills/`
- [ ] Preserve subdirectories and references

### Phase 2: Agents Migration (20 files)

- [ ] Convert agent definitions to new format
- [ ] Move to `.kiro/agents/`
- [ ] Update skill references

### Phase 3: Workflows Migration (11 files)

- [ ] Add YAML frontmatter
- [ ] Move to `.kiro/workflows/`
- [ ] Add trigger commands

### Phase 4: Validation

- [ ] Test skill loading
- [ ] Test agent invocation
- [ ] Test workflow execution
- [ ] Run validation scripts

---

## 🚀 Next Steps

1. **Backup current `.agent/` directory**
2. **Create `.kiro/` structure**
3. **Migrate skills with YAML frontmatter**
4. **Migrate agents**
5. **Migrate workflows**
6. **Test and validate**

---

## 📝 Notes

- **Backward Compatibility:** Keep `.agent/` for reference during migration
- **Progressive Migration:** Can migrate incrementally (skills first, then agents, then workflows)
- **Testing:** Test each phase before moving to next

---

**Migration Start Date:** January 29, 2026
**Estimated Completion:** 2-3 hours
**Status:** 🟡 Planning Phase
