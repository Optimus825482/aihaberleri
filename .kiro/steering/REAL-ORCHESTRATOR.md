---
inclusion: always
priority: 1
---

# 🎯 REAL ORCHESTRATION SYSTEM

## CRITICAL: This is NOT theater - This is REAL execution

Every request triggers ACTUAL tool calls, not markdown simulation.

---

## 🇹🇷 TÜRKÇE İLETİŞİM KURALI (ZORUNLU)

**KURAL:** Kullanıcı ile iletişim ve oluşturulan tüm dokümantasyon dosyaları **TÜRKÇE** olmalıdır.

### Türkçe Kullanılması Gereken Yerler:

1. ✅ **Kullanıcı ile sohbet** → Tüm yanıtlar Türkçe
2. ✅ **Oluşturulan dokümantasyon** → .md, .txt dosyaları Türkçe
3. ✅ **Raporlar ve özetler** → Türkçe
4. ✅ **Commit mesajları** → Türkçe
5. ✅ **Log mesajları** → Türkçe (kullanıcıya gösterilen)

### İngilizce Kalabilecek Yerler:

1. ✅ **Kod içi yorumlar** → İngilizce (kod standartları)
2. ✅ **Değişken/fonksiyon isimleri** → İngilizce (kod standartları)
3. ✅ **API endpoint isimleri** → İngilizce
4. ✅ **Teknik terimler** → İngilizce (AI, API, database, etc.)

### Örnek Kullanım:

```markdown
# ❌ YANLIŞ

## Implementation Summary

The multi-agent pipeline has been successfully implemented...

# ✅ DOĞRU

## Uygulama Özeti

Multi-agent pipeline başarıyla uygulandı...
```

**NOT:** Bu kural tüm agent'lar ve subagent'lar için geçerlidir.

---

## 🔴 MANDATORY EXECUTION FLOW

### 1. REQUEST ANALYSIS (Use mcp_kk_sequentialthinking)

```typescript
// REAL tool call
await mcp_kk_sequentialthinking({
  thought: "Analyzing request type and required domains",
  thoughtNumber: 1,
  totalThoughts: 5,
  nextThoughtNeeded: true,
});
```

### 2. SKILL LOADING (Use readMultipleFiles)

```typescript
// REAL file reads - NO simulation
const skillPaths = determineRequiredSkills(request);
await readMultipleFiles({
  paths: skillPaths.map((s) => `.agent/skills/${s}/SKILL.md`),
  explanation: "Loading required skill knowledge for orchestration",
});
```

### 3. AGENT INVOCATION (Use invokeSubAgent)

```typescript
// REAL subagent spawns - MINIMUM 3
const agents = selectAgents(request); // Must return >= 3

// Parallel execution
await Promise.all(
  agents.map((agent) =>
    invokeSubAgent({
      name: "general-task-execution",
      prompt: `You are ${agent.name}. ${agent.task}. 
      
CONTEXT:
- User Request: ${originalRequest}
- Loaded Skills: ${loadedSkills.join(", ")}
- Previous Work: ${previousAgentOutputs}`,
      explanation: `Delegating ${agent.domain} work to specialized agent`,
    }),
  ),
);
```

### 4. WORKFLOW EXECUTION (Use readFile)

```typescript
// REAL workflow file read
await readFile({
  path: `.agent/workflows/${workflowName}.md`,
  explanation: "Loading workflow instructions for structured execution",
});
```

---

## 🚨 DETECTION RULES

| Request Contains           | Mode       | Skills to Load                                          | Agents to Spawn                                                                                        | Workflow         |
| -------------------------- | ---------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------- |
| "debug", "hata", "fix"     | ULTRATHINK | systematic-debugging, testing-patterns                  | context-gatherer, general-task-execution (debugger role), general-task-execution (test role)           | debug.md         |
| "plan", "tasarım"          | ULTRATHINK | architecture, plan-writing                              | general-task-execution (planner role)                                                                  | plan.md          |
| "yap", "oluştur", "create" | ULTRAWORK  | app-builder, clean-code                                 | general-task-execution (frontend), general-task-execution (backend), general-task-execution (test)     | create.md        |
| "API", "backend"           | ULTRAWORK  | api-patterns, nodejs-best-practices, database-design    | general-task-execution (backend), general-task-execution (database), general-task-execution (security) | create.md        |
| "UI", "frontend"           | ULTRAWORK  | nextjs-react-expert, tailwind-patterns, frontend-design | general-task-execution (frontend), general-task-execution (performance), general-task-execution (seo)  | ui-ux-pro-max.md |

---

## 📋 EXECUTION TEMPLATE (REAL CALLS)

```typescript
async function orchestrate(userRequest: string) {
  // 1. ANALYZE with sequential thinking
  const analysis = await mcp_kk_sequentialthinking({
    thought: `Request: "${userRequest}". Identifying: type, domains, complexity`,
    thoughtNumber: 1,
    totalThoughts: 3,
    nextThoughtNeeded: true,
  });

  // 2. LOAD SKILLS (real file reads)
  const skills = determineSkills(analysis);
  const skillContent = await readMultipleFiles({
    paths: skills.map((s) => `.agent/skills/${s}/SKILL.md`),
    explanation: `Loading ${skills.length} skills for ${analysis.type} task`,
  });

  // 3. LOAD WORKFLOW (real file read)
  const workflow = await readFile({
    path: `.agent/workflows/${analysis.workflow}.md`,
    explanation: `Loading ${analysis.workflow} workflow structure`,
  });

  // 4. SPAWN AGENTS (real subagent invocations - MINIMUM 3)
  const agents = selectAgents(analysis); // Returns >= 3 agents

  const results = await Promise.all(
    agents.map((agent) =>
      invokeSubAgent({
        name: "general-task-execution",
        prompt: buildAgentPrompt(agent, userRequest, skillContent, workflow),
        explanation: `Spawning ${agent.role} agent for ${agent.domain}`,
      }),
    ),
  );

  // 5. SYNTHESIZE
  return synthesizeResults(results);
}
```

---

## 🔴 VERIFICATION CHECKLIST

Before responding to user, verify:

````typescript
const verification = {
  sequentialThinking: toolCalls.includes("mcp_kk_sequentialthinking"),
  skillsLoaded:
    toolCalls.includes("readMultipleFiles") &&
    readPaths.some((p) => p.includes(".agent/skills")),
  workflowLoaded:
    toolCalls.includes("readFile") &&
    readPaths.some((p) => p.includes(".agent/workflows")),
  agentsSpawned: toolCalls.filter((c) => c === "invokeSubAgent").length >= 3,
  realExecution: !response.includes("```typescript"), // Not showing code, DOING it
};

if (!Object.values(verification).every((v) => v)) {
  throw new Error("ORCHESTRATION FAILED: Not all real tools were called");
}
````

---

## 💡 EXAMPLE: Real Debug Request

**User:** "Login sayfası çalışmıyor"

**REAL Execution:**

```typescript
// Step 1: Think
await mcp_kk_sequentialthinking({
  thought:
    "Debug request detected. Need: systematic-debugging skill, context-gatherer for codebase, debugger agent, test agent",
  thoughtNumber: 1,
  totalThoughts: 4,
  nextThoughtNeeded: true,
});

// Step 2: Load skills
await readMultipleFiles({
  paths: [
    ".agent/skills/systematic-debugging/SKILL.md",
    ".agent/skills/testing-patterns/SKILL.md",
    ".agent/skills/api-patterns/SKILL.md",
  ],
  explanation: "Loading debugging, testing, and API skills for login issue",
});

// Step 3: Load workflow
await readFile({
  path: ".agent/workflows/debug.md",
  explanation: "Loading debug workflow structure",
});

// Step 4: Spawn agents (MINIMUM 3)
const [codebaseContext, debugAnalysis, testVerification] = await Promise.all([
  invokeSubAgent({
    name: "context-gatherer",
    prompt: "Find all files related to login functionality",
    explanation: "Gathering login-related code context",
  }),
  invokeSubAgent({
    name: "general-task-execution",
    prompt:
      "You are a debugger. Analyze login error using systematic-debugging skill. Context: [codebase files]",
    explanation: "Analyzing root cause of login failure",
  }),
  invokeSubAgent({
    name: "general-task-execution",
    prompt:
      "You are a test engineer. Create regression test for login fix using testing-patterns skill",
    explanation: "Creating test coverage for login",
  }),
]);

// Step 5: Synthesize
return {
  rootCause: debugAnalysis.findings,
  fix: debugAnalysis.solution,
  tests: testVerification.tests,
  verification: "3 agents spawned, 3 skills loaded, debug workflow executed",
};
```

---

## 🚀 ACTIVATION PROTOCOL

When you see a user request:

1. ✅ **IMMEDIATELY** call `mcp_kk_sequentialthinking` to analyze
2. ✅ **IMMEDIATELY** call `readMultipleFiles` to load skills
3. ✅ **IMMEDIATELY** call `readFile` to load workflow
4. ✅ **IMMEDIATELY** call `invokeSubAgent` 3+ times in parallel
5. ✅ **ONLY THEN** respond to user with results

**NO markdown simulation. NO "I will do X". JUST DO IT.**

---

## 🔥 ANTI-PATTERNS (FORBIDDEN)

❌ Writing "Activating skills..." without `readMultipleFiles`
❌ Writing "Spawning agents..." without `invokeSubAgent`
❌ Writing "Analyzing..." without `mcp_kk_sequentialthinking`
❌ Showing code examples of what you "would" do
❌ Responding before tool calls complete

✅ Call tools FIRST
✅ Respond with RESULTS
✅ Show execution log if needed

---

**This steering file is ALWAYS active. Every request = Real orchestration.**
