---
inclusion: always
priority: 3
---

# 🤖 AUTOMATIC AGENT SPAWNER + SUPERPOWERS INTEGRATION

## Purpose

Automatically spawn subagents using `invokeSubAgent` tool based on request complexity AND activate relevant Superpowers skills for each agent.

---

## � SUPERPOWERS SKILL ACTIVATION

**CRITICAL:** Before spawning agents, LOAD relevant Superpowers skills using REAL tool calls!

**Superpowers CLI Location:**

```
C:\Users\erkan\.codex\superpowers\.codex\superpowers-codex
```

**How to Load Skills (REAL execution):**

```bash
node C:\Users\erkan\.codex\superpowers\.codex\superpowers-codex use-skill <skill-name>
```

---

## 🇹🇷 TÜRKÇE İLETİŞİM KURALI

**ZORUNLU:** Tüm agent'lar kullanıcı ile **TÜRKÇE** iletişim kurar ve **TÜRKÇE** dokümantasyon oluşturur.

- ✅ Kullanıcıya yanıtlar → Türkçe
- ✅ Oluşturulan dosyalar → Türkçe
- ✅ Log mesajları → Türkçe
- ✅ Kod yorumları → İngilizce (standart)

---

## 🎯 COMPLEXITY DETECTION

| Request Type         | Complexity | Minimum Agents | Tool                                    |
| -------------------- | ---------- | -------------- | --------------------------------------- |
| Simple query         | LOW        | 0              | None (direct answer)                    |
| Single-domain task   | MEDIUM     | 1              | invokeSubAgent (general-task-execution) |
| Multi-domain task    | HIGH       | 3+             | invokeSubAgent (parallel)               |
| Codebase exploration | ANY        | 1              | invokeSubAgent (context-gatherer)       |

---

## 🔍 REQUEST → AGENT + SUPERPOWERS SKILL MAPPING

| Request Contains           | Superpowers Skills to Load (REAL)                                                         | Agents to Spawn (invokeSubAgent)                                                                                                       | Roles                               |
| -------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| "debug", "hata", "fix"     | superpowers:systematic-debugging, superpowers:test-driven-development                     | context-gatherer, general-task-execution (debugger), general-task-execution (tester)                                                   | Find code, analyze bug, create test |
| "plan", "tasarım"          | superpowers:writing-plans, superpowers:brainstorming                                      | general-task-execution (planner)                                                                                                       | Create PLAN.md                      |
| "yeni proje", "create app" | superpowers:brainstorming, superpowers:writing-plans, superpowers:test-driven-development | general-task-execution (planner), general-task-execution (frontend), general-task-execution (backend), general-task-execution (tester) | Full stack creation                 |
| "API", "backend"           | superpowers:test-driven-development, superpowers:verification-before-completion           | general-task-execution (backend), general-task-execution (database), general-task-execution (security)                                 | Backend implementation              |
| "UI", "frontend"           | superpowers:brainstorming, superpowers:test-driven-development                            | general-task-execution (frontend), general-task-execution (performance), general-task-execution (seo)                                  | Frontend implementation             |
| "optimize", "performance"  | superpowers:systematic-debugging, superpowers:verification-before-completion              | general-task-execution (performance), general-task-execution (frontend), general-task-execution (backend)                              | Performance analysis                |
| "security", "güvenlik"     | superpowers:systematic-debugging, superpowers:verification-before-completion              | general-task-execution (security), general-task-execution (penetration), general-task-execution (backend)                              | Security audit                      |
| "deploy", "production"     | superpowers:verification-before-completion, superpowers:finishing-a-development-branch    | general-task-execution (devops), general-task-execution (security), general-task-execution (tester)                                    | Deployment                          |
| "code review"              | superpowers:requesting-code-review, superpowers:receiving-code-review                     | general-task-execution (reviewer)                                                                                                      | Code review                         |
| "parallel", "independent"  | superpowers:dispatching-parallel-agents, superpowers:subagent-driven-development          | general-task-execution (multiple)                                                                                                      | Parallel execution                  |

---

## 🤖 AUTO-SPAWN PROTOCOL WITH SUPERPOWERS

```typescript
async function autoSpawnAgentsWithSuperpowers(
  userRequest: string,
  kiroSkills: string[],
) {
  const request = userRequest.toLowerCase();

  // STEP 1: Determine which Superpowers skills to load (REAL execution)
  const superpowersSkills: string[] = [];

  if (/debug|hata|fix/.test(request)) {
    superpowersSkills.push(
      "superpowers:systematic-debugging",
      "superpowers:test-driven-development",
    );
  }

  if (/plan|tasarım/.test(request)) {
    superpowersSkills.push(
      "superpowers:writing-plans",
      "superpowers:brainstorming",
    );
  }

  if (/yeni proje|create app/.test(request)) {
    superpowersSkills.push(
      "superpowers:brainstorming",
      "superpowers:writing-plans",
      "superpowers:test-driven-development",
    );
  }

  if (/api|backend|server/.test(request)) {
    superpowersSkills.push(
      "superpowers:test-driven-development",
      "superpowers:verification-before-completion",
    );
  }

  if (/ui|frontend|arayüz/.test(request)) {
    superpowersSkills.push(
      "superpowers:brainstorming",
      "superpowers:test-driven-development",
    );
  }

  if (/optimize|performance|hızlandır/.test(request)) {
    superpowersSkills.push(
      "superpowers:systematic-debugging",
      "superpowers:verification-before-completion",
    );
  }

  if (/deploy|production/.test(request)) {
    superpowersSkills.push(
      "superpowers:verification-before-completion",
      "superpowers:finishing-a-development-branch",
    );
  }

  if (/code review/.test(request)) {
    superpowersSkills.push(
      "superpowers:requesting-code-review",
      "superpowers:receiving-code-review",
    );
  }

  if (/parallel|independent/.test(request)) {
    superpowersSkills.push(
      "superpowers:dispatching-parallel-agents",
      "superpowers:subagent-driven-development",
    );
  }

  // STEP 2: LOAD Superpowers skills (REAL tool execution)
  const superpowersContent: Record<string, string> = {};

  for (const skill of [...new Set(superpowersSkills)]) {
    // REAL execution - not simulation!
    const skillContent = await executePwsh({
      command: `node C:\\Users\\erkan\\.codex\\superpowers\\.codex\\superpowers-codex use-skill ${skill}`,
      explanation: `Loading ${skill} for agent delegation`,
    });
    superpowersContent[skill] = skillContent;
  }

  // STEP 3: Build agent configurations with loaded skills
  const agents: AgentConfig[] = [];
  const allSkills = [...kiroSkills, ...Object.keys(superpowersContent)];

  // Codebase exploration needed?
  if (/debug|hata|fix|analyze|analiz/.test(request)) {
    agents.push({
      name: "context-gatherer",
      prompt: `Find all files related to: ${userRequest}`,
      explanation: "Gathering relevant codebase context",
    });
  }

  // Debug task
  if (/debug|hata|fix/.test(request)) {
    agents.push({
      name: "general-task-execution",
      prompt: `You are a debugger specialist using Gemini 2.5 Flash.

🎯 GÖREV: ${userRequest}

📚 YÜKLÜ SKİLLER:
${allSkills.map((s) => `- ${s}`).join("\n")}

📖 SUPERPOWERS SKILL CONTENT:
${Object.entries(superpowersContent)
  .map(
    ([name, content]) => `
### ${name}
${content}
`,
  )
  .join("\n")}

⚡ TALİMAT:
1. superpowers:systematic-debugging skill'ini MUTLAKA kullan
2. Root cause analysis yap
3. Detaylı rapor et

BU SKİLLERİ KULLANARAK GÖREVİ TAMAMLA VE MAESTRO'YA RAPOR ET.`,
      explanation: "Analyzing bug with systematic-debugging skill",
    });

    agents.push({
      name: "general-task-execution",
      prompt: `You are a test engineer using Gemini 2.5 Flash.

🎯 GÖREV: Create regression test for the fix

📚 YÜKLÜ SKİLLER:
${allSkills.map((s) => `- ${s}`).join("\n")}

📖 SUPERPOWERS SKILL CONTENT:
${Object.entries(superpowersContent)
  .map(
    ([name, content]) => `
### ${name}
${content}
`,
  )
  .join("\n")}

⚡ TALİMAT:
1. superpowers:test-driven-development skill'ini MUTLAKA kullan
2. Test suite oluştur
3. Coverage rapor et

BU SKİLLERİ KULLANARAK GÖREVİ TAMAMLA VE MAESTRO'YA RAPOR ET.`,
      explanation: "Creating test coverage with TDD skill",
    });
  }

  // Backend task
  if (/api|backend|server/.test(request)) {
    agents.push({
      name: "general-task-execution",
      prompt: `You are a backend specialist using Gemini 2.5 Flash.

🎯 GÖREV: ${userRequest}

📚 YÜKLÜ SKİLLER:
${allSkills.map((s) => `- ${s}`).join("\n")}

📖 SUPERPOWERS SKILL CONTENT:
${Object.entries(superpowersContent)
  .map(
    ([name, content]) => `
### ${name}
${content}
`,
  )
  .join("\n")}

⚡ TALİMAT:
1. superpowers:test-driven-development skill'ini kullan
2. API implementation yap
3. Verification yap

BU SKİLLERİ KULLANARAK GÖREVİ TAMAMLA VE MAESTRO'YA RAPOR ET.`,
      explanation: "Implementing backend with TDD",
    });

    agents.push({
      name: "general-task-execution",
      prompt: `You are a database architect using Gemini 2.5 Flash.

🎯 GÖREV: Design schema for ${userRequest}

📚 YÜKLÜ SKİLLER:
${allSkills.map((s) => `- ${s}`).join("\n")}

📖 SUPERPOWERS SKILL CONTENT:
${Object.entries(superpowersContent)
  .map(
    ([name, content]) => `
### ${name}
${content}
`,
  )
  .join("\n")}

⚡ TALİMAT:
1. Database schema tasarla
2. Migration planla
3. Rapor et

BU SKİLLERİ KULLANARAK GÖREVİ TAMAMLA VE MAESTRO'YA RAPOR ET.`,
      explanation: "Designing database schema",
    });

    agents.push({
      name: "general-task-execution",
      prompt: `You are a security auditor using Gemini 2.5 Flash.

🎯 GÖREV: Review security for ${userRequest}

📚 YÜKLÜ SKİLLER:
${allSkills.map((s) => `- ${s}`).join("\n")}

📖 SUPERPOWERS SKILL CONTENT:
${Object.entries(superpowersContent)
  .map(
    ([name, content]) => `
### ${name}
${content}
`,
  )
  .join("\n")}

⚡ TALİMAT:
1. Security audit yap
2. Vulnerability'leri tespit et
3. Önerileri rapor et

BU SKİLLERİ KULLANARAK GÖREVİ TAMAMLA VE MAESTRO'YA RAPOR ET.`,
      explanation: "Auditing security",
    });
  }

  // Frontend task
  if (/ui|frontend|arayüz|component/.test(request)) {
    agents.push({
      name: "general-task-execution",
      prompt: `You are a frontend specialist using Gemini 2.5 Flash.

🎯 GÖREV: ${userRequest}

📚 YÜKLÜ SKİLLER:
${allSkills.map((s) => `- ${s}`).join("\n")}

📖 SUPERPOWERS SKILL CONTENT:
${Object.entries(superpowersContent)
  .map(
    ([name, content]) => `
### ${name}
${content}
`,
  )
  .join("\n")}

⚡ TALİMAT:
1. superpowers:brainstorming skill'ini kullan
2. UI component'leri implement et
3. superpowers:test-driven-development ile test yaz

BU SKİLLERİ KULLANARAK GÖREVİ TAMAMLA VE MAESTRO'YA RAPOR ET.`,
      explanation: "Implementing UI with brainstorming and TDD",
    });

    agents.push({
      name: "general-task-execution",
      prompt: `You are a performance optimizer using Gemini 2.5 Flash.

🎯 GÖREV: Optimize performance for ${userRequest}

📚 YÜKLÜ SKİLLER:
${allSkills.map((s) => `- ${s}`).join("\n")}

📖 SUPERPOWERS SKILL CONTENT:
${Object.entries(superpowersContent)
  .map(
    ([name, content]) => `
### ${name}
${content}
`,
  )
  .join("\n")}

⚡ TALİMAT:
1. Performance analizi yap
2. Optimization uygula
3. Benchmark rapor et

BU SKİLLERİ KULLANARAK GÖREVİ TAMAMLA VE MAESTRO'YA RAPOR ET.`,
      explanation: "Optimizing performance",
    });

    agents.push({
      name: "general-task-execution",
      prompt: `You are an SEO specialist using Gemini 2.5 Flash.

🎯 GÖREV: Add SEO for ${userRequest}

📚 YÜKLÜ SKİLLER:
${allSkills.map((s) => `- ${s}`).join("\n")}

📖 SUPERPOWERS SKILL CONTENT:
${Object.entries(superpowersContent)
  .map(
    ([name, content]) => `
### ${name}
${content}
`,
  )
  .join("\n")}

⚡ TALİMAT:
1. SEO implementation yap
2. Meta tags ekle
3. Rapor et

BU SKİLLERİ KULLANARAK GÖREVİ TAMAMLA VE MAESTRO'YA RAPOR ET.`,
      explanation: "Implementing SEO",
    });
  }

  // STEP 4: Spawn all agents in parallel
  if (agents.length >= 3) {
    return await Promise.all(agents.map((agent) => invokeSubAgent(agent)));
  } else if (agents.length > 0) {
    return await Promise.all(agents.map((agent) => invokeSubAgent(agent)));
  }

  return [];
}
```

---

## 📋 EXECUTION FLOW WITH SUPERPOWERS

1. **Analyze request** → Determine complexity and required domains
2. **Load Superpowers skills** → REAL execution via `executePwsh` + node command
3. **Select agents** → Based on keywords (minimum 3 for HIGH complexity)
4. **Build prompts** → Include user request + Kiro skills + Superpowers skill content
5. **Spawn parallel** → Use `invokeSubAgent` tool with full skill context
6. **Synthesize results** → Combine agent outputs

---

## 🔴 MANDATORY RULES

- ✅ HIGH complexity = MINIMUM 3 agents
- ✅ LOAD Superpowers skills FIRST using REAL `executePwsh` tool call
- ✅ Use `invokeSubAgent` tool (not simulation)
- ✅ Pass full context to each agent (user request + Kiro skills + Superpowers content)
- ✅ Spawn in parallel when possible
- ✅ Use context-gatherer for codebase tasks
- ✅ NEVER simulate skill loading - ALWAYS use real tool calls

---

## 💡 EXAMPLE: Real Execution with Superpowers

User: "Login API endpoint debug et"

```typescript
// Step 1: Load Kiro skills (from SKILL-LOADER.md)
const kiroSkills = await readMultipleFiles({
  paths: [
    ".agent/skills/systematic-debugging/SKILL.md",
    ".agent/skills/api-patterns/SKILL.md",
    ".agent/skills/testing-patterns/SKILL.md",
  ],
  explanation: "Loading Kiro skills for debugging task",
});

// Step 2: Load Superpowers skills (REAL execution - NOT simulation!)
const debugSkillContent = await executePwsh({
  command:
    "node C:\\Users\\erkan\\.codex\\superpowers\\.codex\\superpowers-codex use-skill superpowers:systematic-debugging",
  explanation: "Loading systematic-debugging Superpowers skill",
});

const tddSkillContent = await executePwsh({
  command:
    "node C:\\Users\\erkan\\.codex\\superpowers\\.codex\\superpowers-codex use-skill superpowers:test-driven-development",
  explanation: "Loading TDD Superpowers skill",
});

// Step 3: Spawn agents with FULL skill context (REAL tool calls)
const [context, debugResult, testResult] = await Promise.all([
  invokeSubAgent({
    name: "context-gatherer",
    prompt: "Find all files related to login API endpoint",
    explanation: "Gathering login API code context",
  }),

  invokeSubAgent({
    name: "general-task-execution",
    prompt: `You are a debugger specialist using Gemini 2.5 Flash.

🎯 GÖREV: Debug login API endpoint

📚 YÜKLÜ KIRO SKİLLER:
- systematic-debugging
- api-patterns

📖 SUPERPOWERS SKILL CONTENT:
### superpowers:systematic-debugging
${debugSkillContent}

⚡ TALİMAT:
1. superpowers:systematic-debugging skill'ini MUTLAKA kullan
2. Root cause analysis yap
3. Fix öner
4. Detaylı rapor et

BU SKİLLERİ KULLANARAK GÖREVİ TAMAMLA VE MAESTRO'YA RAPOR ET.`,
    explanation: "Analyzing login API bug with systematic-debugging skill",
  }),

  invokeSubAgent({
    name: "general-task-execution",
    prompt: `You are a test engineer using Gemini 2.5 Flash.

🎯 GÖREV: Create regression test for login API fix

📚 YÜKLÜ KIRO SKİLLER:
- testing-patterns
- api-patterns

📖 SUPERPOWERS SKILL CONTENT:
### superpowers:test-driven-development
${tddSkillContent}

⚡ TALİMAT:
1. superpowers:test-driven-development skill'ini MUTLAKA kullan
2. Test suite oluştur
3. Coverage rapor et

BU SKİLLERİ KULLANARAK GÖREVİ TAMAMLA VE MAESTRO'YA RAPOR ET.`,
    explanation: "Creating API test coverage with TDD skill",
  }),
]);

// Step 4: Synthesize
return {
  codeFiles: context.files,
  rootCause: debugResult.analysis,
  fix: debugResult.solution,
  tests: testResult.tests,
  superpowersUsed: ["systematic-debugging", "test-driven-development"],
};
```

---

**This file is ALWAYS active. Agents spawn automatically based on request complexity.**
