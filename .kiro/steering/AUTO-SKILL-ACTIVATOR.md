# 🎯 OTOMATIK SKILL AKTİVATÖR

## 🚨 KRİTİK KURAL

**HER TALEP GELDİĞİNDE MUTLAKA:**

1. ✅ Request'i analiz et
2. ✅ İlgili keyword'leri tespit et
3. ✅ GLOBAL-SKILL-LOADER.md mapping tablosunu kullan
4. ✅ İlgili skill'leri REAL tool call ile yükle
5. ✅ Skill içeriklerini task'te kullan

**ASLA ATLAMA! BU ZORUNLU BİR ADIMDIR!**

---

## 🔄 EXECUTION FLOW

```typescript
// HER REQUEST İÇİN OTOMATİK ÇALIŞIR

async function handleUserRequest(userRequest: string) {
  // STEP 1: Keyword Detection
  const keywords = detectKeywords(userRequest);

  // STEP 2: Skill Mapping (GLOBAL-SKILL-LOADER.md'den)
  const requiredSkills = mapKeywordsToSkills(keywords);

  // STEP 3: Load Skills (REAL execution - NOT simulation!)
  const loadedSkills = await loadSkillsFromAgent2(requiredSkills);

  // STEP 4: Execute Task with Skills
  return await executeTaskWithSkills(userRequest, loadedSkills);
}
```

---

## 📋 KEYWORD DETECTION ALGORITHM

```typescript
function detectKeywords(request: string): string[] {
  const req = request.toLowerCase();
  const keywords: string[] = [];

  // AI & Agent
  if (/agent|multi-agent|orchestr|subagent|spawn/.test(req)) {
    keywords.push("agent", "orchestration");
  }

  if (/ai|llm|prompt|model/.test(req)) {
    keywords.push("AI", "LLM", "prompt");
  }

  if (/rag|embedding|vector|search/.test(req)) {
    keywords.push("RAG", "vector", "search");
  }

  // Debug & Test
  if (/debug|hata|fix|error|bug/.test(req)) {
    keywords.push("debug", "error", "fix");
  }

  if (/test|tdd|testing|unit/.test(req)) {
    keywords.push("test", "TDD");
  }

  // Architecture
  if (/architect|mimari|design|system/.test(req)) {
    keywords.push("architecture", "design");
  }

  // Backend
  if (/api|backend|server|endpoint/.test(req)) {
    keywords.push("API", "backend");
  }

  if (/database|sql|postgres|prisma/.test(req)) {
    keywords.push("database", "SQL");
  }

  // Frontend
  if (/react|component|hook|state/.test(req)) {
    keywords.push("React", "component");
  }

  if (/next\.?js|app router|ssr/.test(req)) {
    keywords.push("Next.js", "SSR");
  }

  if (/ui|frontend|arayüz|design system/.test(req)) {
    keywords.push("UI", "frontend");
  }

  if (/tailwind|css|styling/.test(req)) {
    keywords.push("Tailwind", "CSS");
  }

  // Security
  if (/security|güvenlik|vulnerability|pentest/.test(req)) {
    keywords.push("security", "vulnerability");
  }

  if (/xss|injection|idor/.test(req)) {
    keywords.push("XSS", "injection");
  }

  // Cloud & DevOps
  if (/aws|cloud|serverless/.test(req)) {
    keywords.push("AWS", "cloud");
  }

  if (/docker|container|kubernetes|k8s/.test(req)) {
    keywords.push("Docker", "Kubernetes");
  }

  if (/ci\/cd|pipeline|deploy/.test(req)) {
    keywords.push("CI/CD", "deployment");
  }

  // Performance
  if (/performance|optimize|slow|hızlandır/.test(req)) {
    keywords.push("performance", "optimize");
  }

  // Mobile
  if (/mobile|react native|expo|ios|android/.test(req)) {
    keywords.push("mobile", "React Native");
  }

  // SEO
  if (/seo|search optimization|ranking/.test(req)) {
    keywords.push("SEO", "optimization");
  }

  // Documentation
  if (/doc|documentation|readme/.test(req)) {
    keywords.push("documentation", "docs");
  }

  // Code Quality
  if (/refactor|clean code|tech debt/.test(req)) {
    keywords.push("refactor", "clean code");
  }

  if (/code review|pr|review/.test(req)) {
    keywords.push("code review", "PR");
  }

  return [...new Set(keywords)];
}
```

---

## 🗺️ SKILL MAPPING FUNCTION

```typescript
function mapKeywordsToSkills(keywords: string[]): string[] {
  const skills: string[] = [];

  // GLOBAL-SKILL-LOADER.md mapping tablosunu kullan
  const mappingTable = {
    // AI & Agent
    agent: [
      "agent-orchestration-multi-agent-optimize",
      "autonomous-agent-patterns",
      "dispatching-parallel-agents",
    ],
    orchestration: [
      "agent-orchestration-improve-agent",
      "subagent-driven-development",
      "multi-agent-patterns",
    ],
    AI: ["ai-engineer", "ai-product", "llm-app-patterns"],
    LLM: [
      "prompt-engineering",
      "prompt-engineering-patterns",
      "llm-evaluation",
    ],
    RAG: ["rag-engineer", "rag-implementation", "embedding-strategies"],
    vector: [
      "vector-database-engineer",
      "vector-index-tuning",
      "similarity-search-patterns",
    ],

    // Debug & Test
    debug: ["systematic-debugging", "debugger", "error-detective"],
    error: [
      "error-debugging-error-analysis",
      "error-diagnostics-error-analysis",
      "debugging-toolkit-smart-debug",
    ],
    test: ["test-driven-development", "tdd-workflow", "testing-patterns"],
    TDD: ["tdd-orchestrator", "tdd-workflows-tdd-cycle", "test-automator"],

    // Architecture
    architecture: [
      "architecture",
      "architecture-patterns",
      "software-architecture",
    ],
    design: [
      "senior-architect",
      "architect-review",
      "c4-architecture-c4-architecture",
    ],

    // Backend
    API: [
      "api-patterns",
      "api-design-principles",
      "api-security-best-practices",
    ],
    backend: [
      "backend-architect",
      "backend-dev-guidelines",
      "nodejs-backend-patterns",
    ],
    database: ["database-design", "database-architect", "database-optimizer"],
    SQL: ["postgres-best-practices", "postgresql", "sql-optimization-patterns"],

    // Frontend
    React: [
      "react-best-practices",
      "react-patterns",
      "vercel-react-best-practices",
    ],
    component: ["react-ui-patterns", "react-state-management"],
    "Next.js": [
      "nextjs-react-expert",
      "nextjs-best-practices",
      "nextjs-app-router-patterns",
    ],
    UI: ["frontend-design", "ui-ux-designer", "ui-ux-pro-max"],
    frontend: ["frontend-developer", "frontend-dev-guidelines"],
    Tailwind: ["tailwind-patterns", "tailwind-design-system"],

    // Security
    security: ["security-auditor", "vulnerability-scanner", "red-team-tactics"],
    vulnerability: ["pentest-checklist", "ethical-hacking-methodology"],
    XSS: ["xss-html-injection", "api-security-best-practices"],

    // Cloud & DevOps
    AWS: ["aws-skills", "aws-serverless", "cloud-architect"],
    cloud: ["multi-cloud-architecture", "hybrid-cloud-architect"],
    Docker: ["docker-expert", "kubernetes-architect"],
    Kubernetes: ["k8s-manifest-generator", "k8s-security-policies"],
    "CI/CD": ["cicd-automation-workflow-automate", "deployment-procedures"],
    deployment: ["deployment-engineer", "deployment-pipeline-design"],

    // Performance
    performance: [
      "performance-profiling",
      "performance-engineer",
      "application-performance-performance-optimization",
    ],
    optimize: [
      "web-performance-optimization",
      "python-performance-optimization",
    ],

    // Mobile
    mobile: ["mobile-design", "mobile-developer", "react-native-architecture"],
    "React Native": ["vercel-react-native-skills", "expo-deployment"],

    // SEO
    SEO: ["seo-fundamentals", "seo-audit", "seo-content-writer"],

    // Documentation
    documentation: [
      "documentation-templates",
      "docs-architect",
      "api-documentation-generator",
    ],
    docs: ["readme", "api-documenter"],

    // Code Quality
    refactor: [
      "refactor",
      "code-refactoring-refactor-clean",
      "legacy-modernizer",
    ],
    "clean code": ["clean-code", "codebase-cleanup-tech-debt"],
    "code review": [
      "code-review-excellence",
      "code-reviewer",
      "comprehensive-review-full-review",
    ],
    PR: [
      "git-pr-workflows-pr-enhance",
      "requesting-code-review",
      "receiving-code-review",
    ],
  };

  // Her keyword için ilgili skill'leri ekle
  for (const keyword of keywords) {
    if (mappingTable[keyword]) {
      skills.push(...mappingTable[keyword]);
    }
  }

  // Duplicate'leri kaldır
  return [...new Set(skills)];
}
```

---

## 🔧 SKILL LOADING FUNCTION (REAL EXECUTION)

```typescript
async function loadSkillsFromAgent2(
  skillNames: string[],
): Promise<Record<string, string>> {
  const loadedSkills: Record<string, string> = {};

  console.log(`🎯 Loading ${skillNames.length} skills from .agent2/skills...`);

  for (const skillName of skillNames) {
    try {
      // REAL tool call - NOT simulation!
      const skillContent = await executePwsh({
        command: `Get-Content "C:\\Users\\erkan\\.agent2\\skills\\${skillName}\\SKILL.md"`,
        explanation: `Loading ${skillName} skill for current task`,
      });

      loadedSkills[skillName] = skillContent;
      console.log(`✅ Loaded: ${skillName}`);
    } catch (error) {
      console.log(`⚠️ Skill not found or error: ${skillName}`);
      // Continue with other skills
    }
  }

  console.log(
    `✅ Successfully loaded ${Object.keys(loadedSkills).length} skills`,
  );

  return loadedSkills;
}
```

---

## 🎯 COMPLETE EXECUTION EXAMPLE

```typescript
// User request geldiğinde otomatik çalışır

const userRequest = "React component'te performance sorunu var, debug et";

// STEP 1: Detect keywords
const keywords = detectKeywords(userRequest);
// Result: ["React", "component", "performance", "debug"]

// STEP 2: Map to skills
const requiredSkills = mapKeywordsToSkills(keywords);
// Result: [
//   "react-best-practices",
//   "react-patterns",
//   "vercel-react-best-practices",
//   "react-ui-patterns",
//   "performance-profiling",
//   "performance-engineer",
//   "systematic-debugging",
//   "debugger"
// ]

// STEP 3: Load skills (REAL execution)
const loadedSkills = await loadSkillsFromAgent2(requiredSkills);
// Result: {
//   "react-best-practices": "..skill content..",
//   "performance-profiling": "..skill content..",
//   ...
// }

// STEP 4: Use skills in task
const result = await executeTaskWithSkills(userRequest, loadedSkills);
```

---

## 📊 REPORTING FORMAT

Her task sonunda şunu rapor et:

```markdown
## 🎯 Kullanılan Global Skill'ler

✅ **Yüklenen Skill'ler (${loadedSkills.length}):**
${loadedSkills.map(s => `- ${s}`).join('\n')}

📋 **Tespit Edilen Keyword'ler:**
${keywords.map(k => `- ${k}`).join('\n')}

🔍 **Skill Aktivasyon Süreci:**

1. Request analizi tamamlandı
2. ${keywords.length} keyword tespit edildi
3. ${requiredSkills.length} skill mapping yapıldı
4. ${Object.keys(loadedSkills).length} skill başarıyla yüklendi
5. Skill'ler task'te kullanıldı
```

---

## 🔴 ZORUNLU KONTROL LİSTESİ

Her request için şunu kontrol et:

```markdown
- [ ] Request analiz edildi
- [ ] Keyword'ler tespit edildi (minimum 2-3)
- [ ] GLOBAL-SKILL-LOADER.md mapping kullanıldı
- [ ] Skill'ler REAL tool call ile yüklendi (simulation değil!)
- [ ] Minimum 3-5 skill yüklendi
- [ ] Skill içerikleri task'te kullanıldı
- [ ] Kullanılan skill'ler raporlandı
```

**EĞER BU ADIMLARDAN BİRİ ATLANDIYSA → HATA! Tekrar yap!**

---

## 💡 HIZLI REFERANS

### Minimum Skill Sayıları

| Task Complexity | Minimum Skills |
| --------------- | -------------- |
| Simple query    | 2-3 skills     |
| Medium task     | 3-5 skills     |
| Complex task    | 5-8 skills     |
| Full project    | 8-12 skills    |

### Skill Kombinasyonları

| Task Type       | Core Skills                               | Supporting Skills                              |
| --------------- | ----------------------------------------- | ---------------------------------------------- |
| Debug           | systematic-debugging, debugger            | error-detective, test-driven-development       |
| API Development | api-patterns, backend-architect           | database-design, api-security-best-practices   |
| Frontend        | react-best-practices, nextjs-react-expert | tailwind-patterns, performance-profiling       |
| Security Audit  | security-auditor, vulnerability-scanner   | pentest-checklist, api-security-best-practices |

---

**Bu dosya HER ZAMAN aktiftir ve HER REQUEST'te otomatik çalışır!**
