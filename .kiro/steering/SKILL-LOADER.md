---
inclusion: always
priority: 2
---

# 🎯 AUTOMATIC SKILL LOADER

## Purpose

Automatically load relevant skills from `.agent/skills/` based on request keywords.

---

## 🔍 KEYWORD → SKILL MAPPING

| Keywords in Request                            | Skills to Load (readMultipleFiles)                        |
| ---------------------------------------------- | --------------------------------------------------------- |
| "debug", "hata", "fix", "error"                | systematic-debugging, testing-patterns, lint-and-validate |
| "plan", "tasarım", "mimari", "architecture"    | architecture, plan-writing, brainstorming                 |
| "API", "backend", "server", "endpoint"         | api-patterns, nodejs-best-practices, database-design      |
| "UI", "frontend", "arayüz", "component"        | nextjs-react-expert, tailwind-patterns, frontend-design   |
| "database", "SQL", "schema", "query"           | database-design                                           |
| "test", "testing", "TDD"                       | testing-patterns, tdd-workflow, webapp-testing            |
| "security", "güvenlik", "vulnerability"        | vulnerability-scanner, red-team-tactics                   |
| "performance", "optimize", "slow", "hızlandır" | performance-profiling, clean-code                         |
| "deploy", "production", "CI/CD"                | deployment-procedures, server-management                  |
| "mobile", "iOS", "Android"                     | mobile-design                                             |
| "game", "oyun", "Unity"                        | game-development                                          |
| "SEO", "ranking", "meta"                       | seo-fundamentals, geo-fundamentals                        |
| "Python"                                       | python-patterns                                           |
| "PowerShell", "Windows"                        | powershell-windows                                        |
| "Bash", "Linux", "shell"                       | bash-linux                                                |

---

## 🤖 AUTO-LOAD PROTOCOL

```typescript
function autoLoadSkills(userRequest: string): string[] {
  const request = userRequest.toLowerCase();
  const skills: string[] = [];

  // Always load clean-code
  skills.push("clean-code");

  // Keyword matching
  if (/debug|hata|fix|error/.test(request)) {
    skills.push(
      "systematic-debugging",
      "testing-patterns",
      "lint-and-validate",
    );
  }

  if (/plan|tasarım|mimari|architecture/.test(request)) {
    skills.push("architecture", "plan-writing", "brainstorming");
  }

  if (/api|backend|server|endpoint/.test(request)) {
    skills.push("api-patterns", "nodejs-best-practices", "database-design");
  }

  if (/ui|frontend|arayüz|component/.test(request)) {
    skills.push("nextjs-react-expert", "tailwind-patterns", "frontend-design");
  }

  if (/database|sql|schema|query/.test(request)) {
    skills.push("database-design");
  }

  if (/test|testing|tdd/.test(request)) {
    skills.push("testing-patterns", "tdd-workflow", "webapp-testing");
  }

  if (/security|güvenlik|vulnerability/.test(request)) {
    skills.push("vulnerability-scanner", "red-team-tactics");
  }

  if (/performance|optimize|slow|hızlandır/.test(request)) {
    skills.push("performance-profiling");
  }

  if (/deploy|production|ci\/cd/.test(request)) {
    skills.push("deployment-procedures", "server-management");
  }

  if (/mobile|ios|android/.test(request)) {
    skills.push("mobile-design");
  }

  if (/game|oyun|unity/.test(request)) {
    skills.push("game-development");
  }

  if (/seo|ranking|meta/.test(request)) {
    skills.push("seo-fundamentals", "geo-fundamentals");
  }

  if (/python/.test(request)) {
    skills.push("python-patterns");
  }

  if (/powershell|windows/.test(request)) {
    skills.push("powershell-windows");
  }

  if (/bash|linux|shell/.test(request)) {
    skills.push("bash-linux");
  }

  return [...new Set(skills)]; // Remove duplicates
}
```

---

## 📋 EXECUTION

Every request MUST:

1. **Detect keywords** in user request
2. **Map to skills** using table above
3. **Call readMultipleFiles** with skill paths
4. **Use loaded knowledge** in response

**Example:**

User: "API endpoint debug et"

```typescript
// Auto-detect: "API" + "debug"
const skills = [
  "api-patterns",
  "nodejs-best-practices",
  "systematic-debugging",
  "testing-patterns",
  "clean-code",
];

// REAL tool call
await readMultipleFiles({
  paths: skills.map((s) => `.agent/skills/${s}/SKILL.md`),
  explanation: "Loading API and debugging skills for endpoint troubleshooting",
});

// Now use the loaded knowledge
```

---

## 🔴 MANDATORY

- ✅ EVERY request triggers skill loading
- ✅ Use `readMultipleFiles` tool (not simulation)
- ✅ Load BEFORE responding to user
- ✅ Minimum 2 skills per request (clean-code + domain)

---

**This file is ALWAYS active. Skills load automatically on every request.**
