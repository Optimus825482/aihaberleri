---
inclusion: always
priority: 2
---

# 🎯 AUTOMATIC SKILL LOADER

## Purpose

Automatically load relevant skills from `.agent/skills/` based on request keywords.

---

## 🇹🇷 TÜRKÇE İLETİŞİM KURALI

**ZORUNLU:** Kullanıcı ile iletişim ve oluşturulan tüm dokümantasyon **TÜRKÇE** olmalıdır.

- ✅ Sohbet yanıtları → Türkçe
- ✅ Dokümantasyon dosyaları → Türkçe
- ✅ Raporlar → Türkçe
- ✅ Kod → İngilizce (standart)

---

## 🔍 KEYWORD → SKILL MAPPING

### 📦 Kiro Skills (.agent/skills/)

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

### ⭐ Vercel Skills (C:\Users\erkan\.agents\skills\) - GLOBAL

| Keywords in Request                                        | Vercel Skills to Load (executePwsh + readFile) |
| ---------------------------------------------------------- | ---------------------------------------------- |
| "React", "component", "re-render", "memo", "performance"   | vercel-react-best-practices                    |
| "bundle", "import", "dynamic", "lazy", "code splitting"    | vercel-react-best-practices                    |
| "async", "await", "Promise", "waterfall", "parallel"       | vercel-react-best-practices                    |
| "cache", "SWR", "React Query", "data fetching"             | vercel-react-best-practices                    |
| "composition", "compound component", "context", "provider" | vercel-composition-patterns                    |
| "boolean props", "render props", "children"                | vercel-composition-patterns                    |
| "React Native", "Expo", "mobile", "FlashList", "animation" | vercel-react-native-skills                     |
| "accessibility", "ARIA", "WCAG", "a11y", "UI review"       | web-design-guidelines                          |
| "find skill", "search skill", "install skill"              | find-skills                                    |

---

## 🤖 AUTO-LOAD PROTOCOL

```typescript
function autoLoadSkills(userRequest: string): {
  kiroSkills: string[];
  vercelSkills: string[];
} {
  const request = userRequest.toLowerCase();
  const kiroSkills: string[] = [];
  const vercelSkills: string[] = [];

  // Always load clean-code
  kiroSkills.push("clean-code");

  // Kiro Skills - Keyword matching
  if (/debug|hata|fix|error/.test(request)) {
    kiroSkills.push(
      "systematic-debugging",
      "testing-patterns",
      "lint-and-validate",
    );
  }

  if (/plan|tasarım|mimari|architecture/.test(request)) {
    kiroSkills.push("architecture", "plan-writing", "brainstorming");
  }

  if (/api|backend|server|endpoint/.test(request)) {
    kiroSkills.push("api-patterns", "nodejs-best-practices", "database-design");
  }

  if (/ui|frontend|arayüz|component/.test(request)) {
    kiroSkills.push(
      "nextjs-react-expert",
      "tailwind-patterns",
      "frontend-design",
    );
  }

  if (/database|sql|schema|query/.test(request)) {
    kiroSkills.push("database-design");
  }

  if (/test|testing|tdd/.test(request)) {
    kiroSkills.push("testing-patterns", "tdd-workflow", "webapp-testing");
  }

  if (/security|güvenlik|vulnerability/.test(request)) {
    kiroSkills.push("vulnerability-scanner", "red-team-tactics");
  }

  if (/performance|optimize|slow|hızlandır/.test(request)) {
    kiroSkills.push("performance-profiling");
  }

  if (/deploy|production|ci\/cd/.test(request)) {
    kiroSkills.push("deployment-procedures", "server-management");
  }

  if (/mobile|ios|android/.test(request)) {
    kiroSkills.push("mobile-design");
  }

  if (/game|oyun|unity/.test(request)) {
    kiroSkills.push("game-development");
  }

  if (/seo|ranking|meta/.test(request)) {
    kiroSkills.push("seo-fundamentals", "geo-fundamentals");
  }

  if (/python/.test(request)) {
    kiroSkills.push("python-patterns");
  }

  if (/powershell|windows/.test(request)) {
    kiroSkills.push("powershell-windows");
  }

  if (/bash|linux|shell/.test(request)) {
    kiroSkills.push("bash-linux");
  }

  // Vercel Skills - Keyword matching
  if (
    /react|component|re-render|memo|performance|bundle|import|dynamic|lazy|async|await|promise|waterfall|parallel|cache|swr|react query|data fetching/.test(
      request,
    )
  ) {
    vercelSkills.push("vercel-react-best-practices");
  }

  if (
    /composition|compound component|context|provider|boolean props|render props|children/.test(
      request,
    )
  ) {
    vercelSkills.push("vercel-composition-patterns");
  }

  if (/react native|expo|mobile|flashlist|animation|gesture/.test(request)) {
    vercelSkills.push("vercel-react-native-skills");
  }

  if (
    /accessibility|aria|wcag|a11y|ui review|design guidelines/.test(request)
  ) {
    vercelSkills.push("web-design-guidelines");
  }

  if (/find skill|search skill|install skill/.test(request)) {
    vercelSkills.push("find-skills");
  }

  return {
    kiroSkills: [...new Set(kiroSkills)],
    vercelSkills: [...new Set(vercelSkills)],
  };
}
```

---

## 📋 EXECUTION WITH VERCEL SKILLS

Every request MUST:

1. **Detect keywords** in user request
2. **Map to Kiro skills** using table above
3. **Map to Vercel skills** using table above
4. **Load Kiro skills** with `readMultipleFiles`
5. **Load Vercel skills** with `executePwsh` (read SKILL.md files)
6. **Use loaded knowledge** in response

**Example:**

User: "React component'te memory leak var, optimize et"

```typescript
// Auto-detect: "React" + "component" + "memory leak" + "optimize"
const { kiroSkills, vercelSkills } = autoLoadSkills(request);

// kiroSkills = ["clean-code", "performance-profiling", "systematic-debugging"]
// vercelSkills = ["vercel-react-best-practices"]

// Step 1: Load Kiro skills
await readMultipleFiles({
  paths: kiroSkills.map((s) => `.agent/skills/${s}/SKILL.md`),
  explanation: "Loading Kiro skills for React optimization",
});

// Step 2: Load Vercel skills
for (const skill of vercelSkills) {
  const skillContent = await executePwsh({
    command: `Get-Content "C:\\Users\\erkan\\.agents\\skills\\${skill}\\SKILL.md"`,
    explanation: `Loading ${skill} for React best practices`,
  });
  // Use skillContent in analysis
}

// Step 3: Apply both skill sets
// - Kiro skills: General debugging and performance patterns
// - Vercel skills: React-specific best practices (rerender-memo, etc.)
```

---

## 🔴 MANDATORY

- ✅ EVERY request triggers skill loading
- ✅ Use `readMultipleFiles` for Kiro skills (not simulation)
- ✅ Use `executePwsh` + `Get-Content` for Vercel skills
- ✅ Load BEFORE responding to user
- ✅ Minimum 2 skills per request (clean-code + domain)
- ✅ Vercel skills have PRIORITY over Kiro skills for React/Next.js tasks

---

## 🎯 SKILL PRIORITY RULES

When both Kiro and Vercel skills apply:

1. **React/Next.js Performance** → Vercel skills FIRST, then Kiro
2. **General Debugging** → Kiro skills FIRST, then Vercel
3. **API/Backend** → Kiro skills ONLY
4. **UI/Accessibility** → Vercel web-design-guidelines FIRST, then Kiro
5. **Mobile** → Vercel react-native-skills ONLY

**Example Priority:**

```
Request: "React component performance optimize et"

Priority:
1. vercel-react-best-practices (React-specific rules)
2. performance-profiling (General patterns)
3. clean-code (Always included)

Apply in order: Vercel → Kiro → General
```

---

**This file is ALWAYS active. Skills load automatically on every request.**
