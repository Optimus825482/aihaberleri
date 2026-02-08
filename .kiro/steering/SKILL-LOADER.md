---
inclusion: always
---

# Automatic Skill Loading System

## Overview

This document defines the automatic skill loading protocol. When processing user requests, the AI assistant MUST detect relevant keywords and load corresponding skill files using real tool calls before responding.

## Communication Language

- User-facing content (responses, documentation, reports): **Turkish**
- Code and technical identifiers: **English**

## Skill Loading Protocol

### Step 1: Keyword Detection

Extract keywords from the user request (case-insensitive matching).

### Step 2: Skill Mapping

Map detected keywords to skill files using the tables below.

### Step 3: Load Skills

- **Kiro skills** (.agent/skills/): Use `readMultipleFiles` tool
- **Vercel skills** (C:\Users\erkan\.agents\skills\): Use `executePwsh` with `Get-Content`

### Step 4: Apply Knowledge

Use loaded skill content to inform the response.

## Keyword to Skill Mapping

### Kiro Skills (.agent/skills/)

Load using `readMultipleFiles` tool. Always include `clean-code` as baseline.

| Keywords                               | Skills                                                    |
| -------------------------------------- | --------------------------------------------------------- |
| debug, hata, fix, error                | systematic-debugging, testing-patterns, lint-and-validate |
| plan, tasarım, mimari, architecture    | architecture, plan-writing, brainstorming                 |
| API, backend, server, endpoint         | api-patterns, nodejs-best-practices, database-design      |
| UI, frontend, arayüz, component        | nextjs-react-expert, tailwind-patterns, frontend-design   |
| database, SQL, schema, query           | database-design                                           |
| test, testing, TDD                     | testing-patterns, tdd-workflow, webapp-testing            |
| security, güvenlik, vulnerability      | vulnerability-scanner, red-team-tactics                   |
| performance, optimize, slow, hızlandır | performance-profiling, clean-code                         |
| deploy, production, CI/CD              | deployment-procedures, server-management                  |
| mobile, iOS, Android                   | mobile-design                                             |
| game, oyun, Unity                      | game-development                                          |
| SEO, ranking, meta                     | seo-fundamentals, geo-fundamentals                        |
| Python                                 | python-patterns                                           |
| PowerShell, Windows                    | powershell-windows                                        |
| Bash, Linux, shell                     | bash-linux                                                |

### Vercel Skills (C:\Users\erkan\.agents\skills\)

Load using `executePwsh` with `Get-Content` command.

| Keywords                                                                                                         | Skills                      |
| ---------------------------------------------------------------------------------------------------------------- | --------------------------- |
| React, component, re-render, memo, bundle, import, dynamic, lazy, async, await, Promise, cache, SWR, React Query | vercel-react-best-practices |
| composition, compound component, context, provider, boolean props, render props, children                        | vercel-composition-patterns |
| React Native, Expo, FlashList, animation, gesture                                                                | vercel-react-native-skills  |
| accessibility, ARIA, WCAG, a11y, UI review                                                                       | web-design-guidelines       |
| find skill, search skill, install skill                                                                          | find-skills                 |

## Skill Priority Rules

When multiple skill sources apply to a request:

1. **React/Next.js tasks**: Vercel skills → Kiro skills → clean-code
2. **General debugging**: Kiro skills → Vercel skills (if React-related)
3. **API/Backend**: Kiro skills only
4. **UI/Accessibility**: Vercel web-design-guidelines → Kiro skills
5. **Mobile**: Vercel react-native-skills (if React Native) or Kiro mobile-design

## Implementation Requirements

### Mandatory Actions

- Detect keywords before responding to ANY user request
- Load minimum 2 skills per request (clean-code + domain-specific)
- Use actual tool calls (`readMultipleFiles`, `executePwsh`) - never simulate
- Apply loaded skill knowledge in the response

### Loading Examples

**Kiro Skills:**

```typescript
await readMultipleFiles({
  paths: [
    ".agent/skills/systematic-debugging/SKILL.md",
    ".agent/skills/testing-patterns/SKILL.md",
    ".agent/skills/clean-code/SKILL.md",
  ],
  explanation: "Loading debugging skills for error analysis",
});
```

**Vercel Skills:**

```typescript
await executePwsh({
  command:
    'Get-Content "C:\\Users\\erkan\\.agents\\skills\\vercel-react-best-practices\\SKILL.md"',
  explanation: "Loading React best practices skill",
});
```

## Execution Flow

```
User Request
    ↓
Keyword Detection (regex matching)
    ↓
Skill Mapping (use tables above)
    ↓
Load Skills (real tool calls)
    ↓
Apply Knowledge (use in response)
    ↓
Respond to User
```

## Notes

- This protocol runs automatically for every request
- Skills are loaded silently without notifying the user
- Loaded content informs response quality and accuracy
- Multiple keywords may trigger multiple skill loads (deduplicated)
