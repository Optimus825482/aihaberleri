---
inclusion: always
priority: 3
---

# 🤖 AUTOMATIC AGENT SPAWNER

## Purpose

Automatically spawn subagents using `invokeSubAgent` tool based on request complexity.

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

## 🔍 REQUEST → AGENT MAPPING

| Request Contains           | Agents to Spawn (invokeSubAgent)                                                                                                       | Roles                               |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| "debug", "hata", "fix"     | context-gatherer, general-task-execution (debugger), general-task-execution (tester)                                                   | Find code, analyze bug, create test |
| "plan", "tasarım"          | general-task-execution (planner)                                                                                                       | Create PLAN.md                      |
| "yeni proje", "create app" | general-task-execution (planner), general-task-execution (frontend), general-task-execution (backend), general-task-execution (tester) | Full stack creation                 |
| "API", "backend"           | general-task-execution (backend), general-task-execution (database), general-task-execution (security)                                 | Backend implementation              |
| "UI", "frontend"           | general-task-execution (frontend), general-task-execution (performance), general-task-execution (seo)                                  | Frontend implementation             |
| "optimize", "performance"  | general-task-execution (performance), general-task-execution (frontend), general-task-execution (backend)                              | Performance analysis                |
| "security", "güvenlik"     | general-task-execution (security), general-task-execution (penetration), general-task-execution (backend)                              | Security audit                      |
| "deploy", "production"     | general-task-execution (devops), general-task-execution (security), general-task-execution (tester)                                    | Deployment                          |

---

## 🤖 AUTO-SPAWN PROTOCOL

```typescript
async function autoSpawnAgents(userRequest: string, loadedSkills: string[]) {
  const request = userRequest.toLowerCase();
  const agents: AgentConfig[] = [];

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
      prompt: `You are a debugger specialist. 
      
Task: ${userRequest}
Skills loaded: ${loadedSkills.join(", ")}
Use systematic-debugging skill to find root cause.`,
      explanation: "Analyzing bug with debugging expertise",
    });

    agents.push({
      name: "general-task-execution",
      prompt: `You are a test engineer.
      
Task: Create regression test for the fix
Skills loaded: ${loadedSkills.join(", ")}
Use testing-patterns skill.`,
      explanation: "Creating test coverage",
    });
  }

  // Backend task
  if (/api|backend|server/.test(request)) {
    agents.push({
      name: "general-task-execution",
      prompt: `You are a backend specialist.
      
Task: ${userRequest}
Skills loaded: ${loadedSkills.join(", ")}
Use api-patterns and nodejs-best-practices skills.`,
      explanation: "Implementing backend logic",
    });

    agents.push({
      name: "general-task-execution",
      prompt: `You are a database architect.
      
Task: Design schema for ${userRequest}
Skills loaded: ${loadedSkills.join(", ")}
Use database-design skill.`,
      explanation: "Designing database schema",
    });

    agents.push({
      name: "general-task-execution",
      prompt: `You are a security auditor.
      
Task: Review security for ${userRequest}
Skills loaded: ${loadedSkills.join(", ")}
Use vulnerability-scanner skill.`,
      explanation: "Auditing security",
    });
  }

  // Frontend task
  if (/ui|frontend|arayüz|component/.test(request)) {
    agents.push({
      name: "general-task-execution",
      prompt: `You are a frontend specialist.
      
Task: ${userRequest}
Skills loaded: ${loadedSkills.join(", ")}
Use nextjs-react-expert and tailwind-patterns skills.`,
      explanation: "Implementing UI components",
    });

    agents.push({
      name: "general-task-execution",
      prompt: `You are a performance optimizer.
      
Task: Optimize performance for ${userRequest}
Skills loaded: ${loadedSkills.join(", ")}
Use performance-profiling skill.`,
      explanation: "Optimizing performance",
    });

    agents.push({
      name: "general-task-execution",
      prompt: `You are an SEO specialist.
      
Task: Add SEO for ${userRequest}
Skills loaded: ${loadedSkills.join(", ")}
Use seo-fundamentals skill.`,
      explanation: "Implementing SEO",
    });
  }

  // Spawn all agents in parallel
  if (agents.length >= 3) {
    return await Promise.all(agents.map((agent) => invokeSubAgent(agent)));
  } else if (agents.length > 0) {
    // Sequential for < 3 agents
    return await Promise.all(agents.map((agent) => invokeSubAgent(agent)));
  }

  return [];
}
```

---

## 📋 EXECUTION FLOW

1. **Analyze request** → Determine complexity
2. **Select agents** → Based on keywords (minimum 3 for HIGH complexity)
3. **Build prompts** → Include user request + loaded skills + context
4. **Spawn parallel** → Use `invokeSubAgent` tool
5. **Synthesize results** → Combine agent outputs

---

## 🔴 MANDATORY RULES

- ✅ HIGH complexity = MINIMUM 3 agents
- ✅ Use `invokeSubAgent` tool (not simulation)
- ✅ Pass full context to each agent (user request + skills + previous work)
- ✅ Spawn in parallel when possible
- ✅ Use context-gatherer for codebase tasks

---

## 💡 EXAMPLE: Real Execution

User: "Login API endpoint debug et"

```typescript
// Step 1: Load skills (from SKILL-LOADER.md)
const skills = await loadSkills(request); // ['api-patterns', 'systematic-debugging', ...]

// Step 2: Spawn agents (REAL tool calls)
const [context, debugResult, testResult] = await Promise.all([
  invokeSubAgent({
    name: "context-gatherer",
    prompt: "Find all files related to login API endpoint",
    explanation: "Gathering login API code context",
  }),

  invokeSubAgent({
    name: "general-task-execution",
    prompt: `You are a debugger specialist.

Task: Debug login API endpoint
Skills loaded: ${skills.join(", ")}
Context: ${context}

Use systematic-debugging skill to find root cause.`,
    explanation: "Analyzing login API bug",
  }),

  invokeSubAgent({
    name: "general-task-execution",
    prompt: `You are a test engineer.

Task: Create test for login API fix
Skills loaded: ${skills.join(", ")}
Context: ${context}

Use testing-patterns skill.`,
    explanation: "Creating API test coverage",
  }),
]);

// Step 3: Synthesize
return {
  codeFiles: context.files,
  rootCause: debugResult.analysis,
  fix: debugResult.solution,
  tests: testResult.tests,
};
```

---

**This file is ALWAYS active. Agents spawn automatically based on request complexity.**
