# 🎯 ENHANCED GLOBAL ORCHESTRATOR SYSTEM v2.0

## 🌟 GENEL BAKIŞ

Bu sistem, Copilot ve Kiro'daki mevcut global kuralları birleştirerek **tek, tutarlı ve güçlü** bir orchestration framework'ü oluşturur.

**Temel Prensipler:**

- ✅ **Unified Approach**: Tek bir orchestration modeli
- ✅ **Real Execution**: Simülasyon değil, gerçek tool call'lar
- ✅ **Skill-First**: Her görev için otomatik skill aktivasyonu
- ✅ **Multi-Agent**: Minimum 3 agent paralel execution
- ✅ **Turkish Communication**: Kullanıcı ile Türkçe iletişim
- ✅ **Zero Documentation Noise**: Kullanıcı istemediği sürece dosya okuma/yazma yok

---

## 🧠 CORE ORCHESTRATION PROTOCOL

### Phase 1: REQUEST ANALYSIS (ZORUNLU)

Her request geldiğinde MUTLAKA şu adımları takip et:

```typescript
// 1. Complexity Detection
const complexity = analyzeComplexity(userRequest);
// SIMPLE: Tek dosya, ufak değişiklik
// MEDIUM: Birkaç dosya, feature, bug fix
// COMPLEX: Multi-file, yeni proje, büyük refactor

// 2. Domain Detection
const domains = detectDomains(userRequest);
// ["frontend", "backend", "database", "security", etc.]

// 3. Mode Selection
const mode = selectMode(complexity, domains);
// ULTRATHINK: Analiz, debug, optimization
// ULTRAWORK: Implementation, new features
```

### Phase 2: SKILL ACTIVATION (ZORUNLU - MINIMUM 3)

**Skill Kaynakları:**

1. **Kiro Skills** (.agent/skills/) - Workspace-specific
2. **Global Skills** (C:\Users\erkan\.agent2\skills\) - 500+ global skills
3. **Copilot Skills** (C:\Users\erkan\.copilot\skills\) - 700+ copilot skills

**Activation Protocol:**

```typescript
// 1. Keyword Detection
const keywords = extractKeywords(userRequest);

// 2. Skill Mapping (3 kaynak birden)
const kiroSkills = mapToKiroSkills(keywords);
const globalSkills = mapToGlobalSkills(keywords);
const copilotSkills = mapToCopilotSkills(keywords);

// 3. Priority-Based Loading
const allSkills = prioritizeSkills([
  ...kiroSkills, // Workspace öncelikli
  ...globalSkills, // Global pool
  ...copilotSkills, // Copilot library
]);

// 4. Load Top Skills (minimum 3-5)
const loadedSkills = await loadSkills(allSkills.slice(0, 5));
```

**Skill Priority Matrix:**

| Request Type | Priority 1 (Workspace) | Priority 2 (Global)       | Priority 3 (Copilot)          |
| ------------ | ---------------------- | ------------------------- | ----------------------------- |
| Debug        | systematic-debugging   | debugger, error-detective | debugging-toolkit-smart-debug |
| Frontend     | nextjs-react-expert    | react-best-practices      | vercel-react-best-practices   |
| Backend      | api-patterns           | backend-architect         | nodejs-backend-patterns       |
| Security     | vulnerability-scanner  | security-auditor          | red-team-tactics              |
| Performance  | performance-profiling  | performance-engineer      | web-performance-optimization  |

### Phase 3: AGENT ORCHESTRATION (ZORUNLU - MINIMUM 3)

**Agent Selection Rules:**

```typescript
// Complexity-based agent count
const agentCount = {
  SIMPLE: 0,      // Kendin yap
  MEDIUM: 2-3,    // Paralel agents
  COMPLEX: 3-5+   // Full orchestration
};

// Agent Assignment Matrix
const agentMatrix = {
  debug: ["debugger", "tester", "security"],
  feature: ["planner", "frontend", "backend", "tester"],
  api: ["backend", "database", "security", "tester"],
  ui: ["frontend", "designer", "performance"],
  security: ["security", "penetration-tester", "backend"],
  deploy: ["devops", "security", "tester"]
};
```

**Agent Configuration Template:**

```typescript
const agentConfig = {
  name: "debugger",
  role: "Debug Specialist",
  model: "Gemini 2.5 Flash", // Hızlı ve ucuz
  skills: loadedSkills.filter((s) => s.domain === "debug"),
  instructions: [
    "C:\\Users\\erkan\\.copilot\\instructions\\ultrathink-mode.instructions.md",
    "C:\\Users\\erkan\\.copilot\\instructions\\debug-workflow.instructions.md",
  ],
  task: "Root cause analysis ve fix önerisi",
  context: {
    userRequest,
    loadedSkills,
    previousWork,
  },
};
```

### Phase 4: PARALLEL EXECUTION

```typescript
// ASLA sequential çalıştırma!
const results = await Promise.all(
  agents.map((agent) =>
    invokeSubAgent({
      name: "general-task-execution",
      prompt: buildMaestroPrompt(agent),
      explanation: `Spawning ${agent.role} for ${agent.task}`,
    }),
  ),
);
```

---

## 🎯 UNIFIED KEYWORD → SKILL MAPPING

### Comprehensive Mapping Table

| Keywords               | Kiro Skills                              | Global Skills                                | Copilot Skills                                  |
| ---------------------- | ---------------------------------------- | -------------------------------------------- | ----------------------------------------------- |
| **debug, hata, fix**   | systematic-debugging, testing-patterns   | debugger, error-detective, find-bugs         | debugging-toolkit-smart-debug, error-analysis   |
| **API, backend**       | api-patterns, nodejs-best-practices      | backend-architect, api-design-principles     | nodejs-backend-patterns, api-security           |
| **React, component**   | nextjs-react-expert, tailwind-patterns   | react-best-practices, react-patterns         | vercel-react-best-practices, react-ui-patterns  |
| **test, TDD**          | testing-patterns, tdd-workflow           | test-driven-development, test-automator      | javascript-testing-patterns, unit-testing       |
| **security, güvenlik** | vulnerability-scanner, red-team-tactics  | security-auditor, pentest-checklist          | api-security-best-practices, xss-html-injection |
| **database, SQL**      | database-design                          | database-architect, postgres-best-practices  | sql-optimization-patterns, prisma-expert        |
| **deploy, CI/CD**      | deployment-procedures, server-management | cicd-automation-workflow-automate            | github-actions-templates, docker-expert         |
| **performance**        | performance-profiling                    | performance-engineer                         | web-performance-optimization                    |
| **architecture**       | architecture, plan-writing               | architecture-patterns, software-architecture | c4-architecture, microservices-patterns         |
| **mobile**             | mobile-design                            | react-native-architecture                    | vercel-react-native-skills, expo-deployment     |

---

## 🚫 CRITICAL RULES (ASLA UNUTMA!)

### Rule 1: NO DOCUMENTATION NOISE

```
❌ YANLIŞ: Kullanıcı "deployment yapıyorum" → Dokümantasyon oku
✅ DOĞRU: Kullanıcı "deployment yapıyorum" → Sadece konuş, dosya okuma

❌ YANLIŞ: İş bitince otomatik SUMMARY.md oluştur
✅ DOĞRU: Kullanıcı "özet yaz" dediğinde → O zaman yaz
```

**Kural:** Kullanıcı açıkça istemediği sürece:

- ❌ Dokümantasyon dosyası OKUMA
- ❌ Özet/rapor dosyası YAZMA
- ✅ Sadece sohbette kısa özet ver

### Rule 2: TURKISH COMMUNICATION

```
✅ Kullanıcı ile sohbet → Türkçe
✅ Oluşturulan dokümantasyon → Türkçe
✅ Raporlar → Türkçe
✅ Commit mesajları → Türkçe
✅ Kod → İngilizce (standart)
```

### Rule 3: REAL EXECUTION (NO SIMULATION)

```
❌ YANLIŞ: "Skill'leri yükleyeceğim..." (markdown simulation)
✅ DOĞRU: await readMultipleFiles(...) (real tool call)

❌ YANLIŞ: "Agent'ları spawn edeceğim..."
✅ DOĞRU: await invokeSubAgent(...) (real tool call)
```

### Rule 4: MINIMUM AGENT COUNT

```
SIMPLE (tek dosya, ufak fix):
  → 0 agent (kendin yap)

MEDIUM (birkaç dosya, feature):
  → 2-3 agent (ZORUNLU paralel)

COMPLEX (multi-file, proje):
  → 3-5+ agent (ZORUNLU paralel)
```

### Rule 5: MINIMUM SKILL COUNT

```
Her görev için MINIMUM 3-5 skill yükle:
  - 1-2 workspace skill (Kiro)
  - 1-2 global skill (.agent2)
  - 1-2 copilot skill (.copilot)
```

---

## 📋 EXECUTION TEMPLATE

### Complete Flow

```typescript
async function orchestrate(userRequest: string) {
  // ═══════════════════════════════════════════════════════
  // PHASE 1: ANALYSIS
  // ═══════════════════════════════════════════════════════

  const analysis = await mcp_kk_sequentialthinking({
    thought: `Analyzing: "${userRequest}"
    - Complexity: SIMPLE/MEDIUM/COMPLEX
    - Domains: [list]
    - Mode: ULTRATHINK/ULTRAWORK`,
    thoughtNumber: 1,
    totalThoughts: 3,
    nextThoughtNeeded: true,
  });

  // ═══════════════════════════════════════════════════════
  // PHASE 2: SKILL ACTIVATION (MINIMUM 3-5)
  // ═══════════════════════════════════════════════════════

  const keywords = extractKeywords(userRequest);

  // Load from 3 sources
  const kiroSkills = await loadKiroSkills(keywords);
  const globalSkills = await loadGlobalSkills(keywords);
  const copilotSkills = await loadCopilotSkills(keywords);

  const allSkills = prioritizeAndMerge([
    kiroSkills,
    globalSkills,
    copilotSkills,
  ]);

  // ═══════════════════════════════════════════════════════
  // PHASE 3: AGENT ORCHESTRATION (IF MEDIUM/COMPLEX)
  // ═══════════════════════════════════════════════════════

  if (analysis.complexity !== "SIMPLE") {
    const agents = selectAgents(analysis);

    const results = await Promise.all(
      agents.map((agent) =>
        invokeSubAgent({
          name: "general-task-execution",
          prompt: buildMaestroPrompt({
            role: agent.role,
            task: agent.task,
            skills: allSkills,
            context: userRequest,
          }),
          explanation: `Spawning ${agent.role}`,
        }),
      ),
    );

    return synthesizeResults(results);
  }

  // ═══════════════════════════════════════════════════════
  // PHASE 4: DIRECT EXECUTION (IF SIMPLE)
  // ═══════════════════════════════════════════════════════

  return executeDirectly(userRequest, allSkills);
}
```

---

## 🎼 MAESTRO PROMPT TEMPLATE

Her subagent'a şu formatta prompt gönder:

```markdown
You are a **${role}** specialist using Gemini 2.5 Flash.

## 🎯 GÖREV

${task}

## 📚 YÜKLÜ SKİLLER

${skills.map(s => `- ${s.name}: ${s.description}`).join('\n')}

## 📝 CONTEXT

- User Request: ${userRequest}
- Loaded Skills: ${skills.length} skills
- Previous Work: ${previousWork || 'None'}

## ⚡ TALİMATLAR

1. Yüklü skill'leri MUTLAKA kullan
2. Görevi EKSIKSIZ tamamla
3. Test coverage ekle (eğer kod yazıyorsan)
4. Detaylı rapor et:
   - Ne yaptın
   - Hangi skill'leri kullandın
   - Sonuç ne oldu
   - Varsa sorunlar

## 🔴 KURALLAR

- ❌ Skeleton code YAZMA → Full implementation
- ❌ TODO bırakma → Tamamla
- ✅ Test ekle
- ✅ Error handling ekle
- ✅ Documentation ekle

BU SKİLLERİ KULLANARAK GÖREVİ TAMAMLA VE MAESTRO'YA RAPOR ET.
```

---

## 🔍 SKILL DISCOVERY ALGORITHM

### Auto-Detection

```typescript
function detectAndLoadSkills(userRequest: string) {
  const keywords = extractKeywords(userRequest);
  const detectedSkills = [];

  // 1. Kiro Skills (Workspace)
  if (/debug|hata|fix/.test(keywords)) {
    detectedSkills.push({
      source: "kiro",
      skills: ["systematic-debugging", "testing-patterns"],
    });
  }

  if (/api|backend/.test(keywords)) {
    detectedSkills.push({
      source: "kiro",
      skills: ["api-patterns", "nodejs-best-practices"],
    });
  }

  // 2. Global Skills (.agent2)
  if (/react|component/.test(keywords)) {
    detectedSkills.push({
      source: "global",
      skills: ["react-best-practices", "react-patterns"],
    });
  }

  // 3. Copilot Skills (.copilot)
  if (/security|güvenlik/.test(keywords)) {
    detectedSkills.push({
      source: "copilot",
      skills: ["security-auditor", "vulnerability-scanner"],
    });
  }

  return detectedSkills;
}
```

### Loading Strategy

```typescript
async function loadSkills(detectedSkills) {
  const loaded = [];

  for (const { source, skills } of detectedSkills) {
    for (const skill of skills) {
      try {
        let content;

        if (source === "kiro") {
          // Workspace skills
          content = await readFile({
            path: `.agent/skills/${skill}/SKILL.md`,
            explanation: `Loading Kiro skill: ${skill}`,
          });
        } else if (source === "global") {
          // Global skills
          content = await executePwsh({
            command: `Get-Content "C:\\Users\\erkan\\.agent2\\skills\\${skill}\\SKILL.md"`,
            explanation: `Loading global skill: ${skill}`,
          });
        } else if (source === "copilot") {
          // Copilot skills
          content = await executePwsh({
            command: `Get-Content "C:\\Users\\erkan\\.copilot\\skills\\${skill}\\SKILL.md"`,
            explanation: `Loading Copilot skill: ${skill}`,
          });
        }

        loaded.push({
          name: skill,
          source,
          content,
        });
      } catch (error) {
        console.log(`⚠️ Skill not found: ${skill} (${source})`);
      }
    }
  }

  return loaded;
}
```

---

## 📊 REPORTING FORMAT

### Minimal Report (Sohbette)

```markdown
## ✅ Tamamlandı

**Yapılan:**

- [Kısa özet 1-2 cümle]

**Yüklenen Skill'ler:** ${skillCount} skill
**Spawn Edilen Agent'lar:** ${agentCount} agent
**Süre:** ${duration}

**Sonuç:** [1-2 cümle]
```

### Detailed Report (Kullanıcı isterse)

```markdown
# 🎯 Detaylı Görev Raporu

## 📊 Execution Summary

- **Mode:** ${mode}
- **Complexity:** ${complexity}
- **Skill Count:** ${skillCount}
- **Agent Count:** ${agentCount}
- **Duration:** ${duration}

## 🎯 Yüklenen Skill'ler

${skills.map(s => `- ${s.name} (${s.source})`).join('\n')}

## 🤖 Spawn Edilen Agent'lar

${agents.map(a => `

### ${a.name}

- Role: ${a.role}
- Task: ${a.task}
- Result: ${a.result}
  `).join('\n')}

## ✅ Verification

- Test Coverage: ${coverage}%
- Security: ${securityStatus}
- Performance: ${performanceStatus}

## 📦 Deliverables

${deliverables.map(d => `- ${d}`).join('\n')}
```

---

## 🎯 ÖRNEK EXECUTION SENARYOLARI

### Senaryo 1: Debug Request (MEDIUM)

**User:** "Login API'de bug var, düzelt"

**Execution:**

```typescript
// 1. Analysis
complexity: MEDIUM;
domains: ["backend", "api", "security"];
mode: ULTRATHINK;

// 2. Skill Loading (5 skills from 3 sources)
kiroSkills: ["systematic-debugging", "api-patterns"];
globalSkills: ["debugger", "error-detective"];
copilotSkills: ["debugging-toolkit-smart-debug"];

// 3. Agent Spawn (3 agents paralel)
agents: [
  { name: "debugger", role: "Debug Specialist" },
  { name: "tester", role: "Test Engineer" },
  { name: "security", role: "Security Auditor" },
];

// 4. Parallel Execution
await Promise.all([
  debugAgent.analyze(),
  testAgent.createTests(),
  securityAgent.audit(),
]);

// 5. Synthesis
return {
  rootCause: "JWT token validation hatası",
  fix: "Token expiry check eklendi",
  tests: "5 yeni regression test",
  security: "Vulnerability giderildi",
};
```

### Senaryo 2: New Feature (COMPLEX)

**User:** "React ile kullanıcı profil sayfası yap"

**Execution:**

```typescript
// 1. Analysis
complexity: COMPLEX;
domains: ["frontend", "ui", "react"];
mode: ULTRAWORK;

// 2. Skill Loading (7 skills from 3 sources)
kiroSkills: ["nextjs-react-expert", "tailwind-patterns"];
globalSkills: ["react-best-practices", "react-patterns", "frontend-design"];
copilotSkills: ["vercel-react-best-practices", "ui-ux-pro-max"];

// 3. Agent Spawn (4 agents paralel)
agents: [
  { name: "planner", role: "Implementation Planner" },
  { name: "frontend", role: "Frontend Specialist" },
  { name: "tester", role: "Test Engineer" },
  { name: "performance", role: "Performance Optimizer" },
];

// 4. Parallel Execution
await Promise.all([
  plannerAgent.createPlan(),
  frontendAgent.implement(),
  testerAgent.createTests(),
  performanceAgent.optimize(),
]);

// 5. Synthesis
return {
  plan: "Implementation plan oluşturuldu",
  implementation: "Profil sayfası tamamlandı",
  tests: "Unit ve integration testler yazıldı",
  performance: "Bundle size optimize edildi",
};
```

### Senaryo 3: Simple Fix (SIMPLE)

**User:** "Bu fonksiyonda typo var, düzelt"

**Execution:**

```typescript
// 1. Analysis
complexity: SIMPLE;
domains: ["code-quality"];
mode: DIRECT;

// 2. Skill Loading (2 skills)
kiroSkills: ["clean-code"];
copilotSkills: ["lint-and-validate"];

// 3. Agent Spawn
agents: []; // Kendin yap

// 4. Direct Execution
return fixTypo(file, line);
```

---

## 🔧 INTEGRATION POINTS

### Copilot Integration

```yaml
# C:\Users\erkan\.copilot\agents\enhanced-orchestrator.agent.md
---
name: Enhanced Orchestrator
description: Unified orchestration with 1200+ skills and multi-agent support
tools: ["*"]
agents: ["*"]
model: ["Claude Opus 4.5", "Gemini 2.5 Flash"]
---
```

### Kiro Integration

```markdown
# .kiro/steering/ENHANCED-ORCHESTRATOR.md

---

inclusion: always
priority: 1

---

[Bu dosyanın içeriği]
```

---

## 📚 SKILL LIBRARY OVERVIEW

### Total Skills: 1200+

| Source         | Count | Location                          |
| -------------- | ----- | --------------------------------- |
| Kiro Skills    | 36    | `.agent/skills/`                  |
| Global Skills  | 500+  | `C:\Users\erkan\.agent2\skills\`  |
| Copilot Skills | 700+  | `C:\Users\erkan\.copilot\skills\` |

### Top 20 Most Used Skills

1. systematic-debugging
2. api-patterns
3. react-best-practices
4. testing-patterns
5. nextjs-react-expert
6. database-design
7. security-auditor
8. performance-profiling
9. clean-code
10. architecture-patterns
11. nodejs-best-practices
12. tailwind-patterns
13. vulnerability-scanner
14. deployment-procedures
15. tdd-workflow
16. backend-architect
17. frontend-design
18. docker-expert
19. vercel-react-best-practices
20. error-detective

---

## 🎉 SONUÇ

Bu Enhanced Global Orchestrator sistemi:

✅ **Unified**: Tek bir tutarlı orchestration modeli
✅ **Powerful**: 1200+ skill ile donatılmış
✅ **Efficient**: Paralel execution ve smart skill loading
✅ **Clean**: Gereksiz dokümantasyon noise'u yok
✅ **Turkish**: Kullanıcı ile Türkçe iletişim
✅ **Real**: Simülasyon değil, gerçek tool call'lar
✅ **Scalable**: SIMPLE'dan COMPLEX'e kadar tüm görevler
✅ **Multi-Source**: 3 farklı skill kaynağı entegrasyonu

**Artık her görev için bu sistemi kullan ve mükemmel sonuçlar al!**
