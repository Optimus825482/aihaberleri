---
inclusion: always
---

# Real Orchestration System

## Core Principle: Execute, Don't Simulate

Use actual tool calls for every operation. Never describe what you would do—do it.

## File Operation Rules

### Reading Files

Only read documentation files when explicitly requested:

- ❌ Auto-read on "deployment yapıyorum", "test ediyorum", "hata var"
- ✅ Read when user says "şu dosyayı oku" or "dokümantasyona bak"

### Writing Files

Only create documentation files when explicitly requested:

- ❌ Auto-create SUMMARY.md, REPORT.md, GUIDE.md after tasks
- ✅ Create when user says "özet yaz", "dokümantasyon oluştur", "rapor hazırla"

Default: Provide brief verbal summaries in chat instead of creating files.

## Communication Language

**Turkish (Türkçe)** for all user-facing content:

- User conversations
- Documentation files (.md, .txt)
- Reports and summaries
- Commit messages
- Log messages

**English** for code-related content:

- Code comments
- Variable/function names
- API endpoint names
- Technical terms (AI, API, database)

## Orchestration Workflow

### 1. Request Analysis

Use `mcp_kk_sequentialthinking` to analyze request type, domains, and complexity.

### 2. Skill Loading

Use `readMultipleFiles` to load relevant skills from `.agent/skills/`:

- Determine required skills based on request keywords
- Load skill documentation before execution
- Never simulate—always use real file reads

### 3. Agent Invocation

Use `invokeSubAgent` for complex tasks requiring multiple perspectives:

- Minimum 3 agents for high-complexity tasks
- Execute agents in parallel when possible
- Pass full context (user request, loaded skills, previous work)

### 4. Workflow Execution

Use `readFile` to load workflow templates from `.agent/workflows/` when structured execution is needed.

## Request Type Detection

| Keywords             | Mode           | Skills                                                  | Agents                             | Workflow         |
| -------------------- | -------------- | ------------------------------------------------------- | ---------------------------------- | ---------------- |
| debug, hata, fix     | Analysis       | systematic-debugging, testing-patterns                  | context-gatherer, debugger, tester | debug.md         |
| plan, tasarım        | Analysis       | architecture, plan-writing                              | planner                            | plan.md          |
| yap, oluştur, create | Implementation | app-builder, clean-code                                 | frontend, backend, tester          | create.md        |
| API, backend         | Implementation | api-patterns, nodejs-best-practices, database-design    | backend, database, security        | create.md        |
| UI, frontend         | Implementation | nextjs-react-expert, tailwind-patterns, frontend-design | frontend, performance, seo         | ui-ux-pro-max.md |

## Execution Pattern

```typescript
async function orchestrate(userRequest: string) {
  // 1. Analyze request
  const analysis = await mcp_kk_sequentialthinking({
    thought: `Analyzing: "${userRequest}"`,
    thoughtNumber: 1,
    totalThoughts: 3,
    nextThoughtNeeded: true,
  });

  // 2. Load skills
  const skillContent = await readMultipleFiles({
    paths: determineSkills(analysis).map((s) => `.agent/skills/${s}/SKILL.md`),
    explanation: `Loading skills for ${analysis.type} task`,
  });

  // 3. Load workflow (if needed)
  const workflow = await readFile({
    path: `.agent/workflows/${analysis.workflow}.md`,
    explanation: `Loading ${analysis.workflow} workflow`,
  });

  // 4. Spawn agents (parallel execution)
  const results = await Promise.all(
    selectAgents(analysis).map((agent) =>
      invokeSubAgent({
        name: "general-task-execution",
        prompt: buildAgentPrompt(agent, userRequest, skillContent, workflow),
        explanation: `Delegating ${agent.domain} work`,
      }),
    ),
  );

  // 5. Synthesize and return
  return synthesizeResults(results);
}
```

## Verification Checklist

Before responding to user, ensure:

- ✅ Used `mcp_kk_sequentialthinking` for analysis
- ✅ Used `readMultipleFiles` to load skills from `.agent/skills/`
- ✅ Used `readFile` to load workflow (if applicable)
- ✅ Used `invokeSubAgent` for complex tasks (minimum 3 agents)
- ✅ Executed tools in parallel when possible
- ✅ No simulation—all tool calls were real

## Anti-Patterns to Avoid

**Never do these:**

- Writing "Activating skills..." without calling `readMultipleFiles`
- Writing "Spawning agents..." without calling `invokeSubAgent`
- Writing "Analyzing..." without calling `mcp_kk_sequentialthinking`
- Showing code examples of what you "would" do
- Responding before tool calls complete

**Always do these:**

- Call tools first, respond with results
- Use actual tool invocations, not descriptions
- Execute in parallel when dependencies allow

## Example: Debug Request

**User:** "Login sayfası çalışmıyor"

**Execution:**

1. **Analyze** with `mcp_kk_sequentialthinking`
2. **Load skills** with `readMultipleFiles`: systematic-debugging, testing-patterns, api-patterns
3. **Load workflow** with `readFile`: debug.md
4. **Spawn agents** with `invokeSubAgent` (parallel):
   - context-gatherer: Find login-related files
   - debugger: Analyze root cause
   - tester: Create regression test
5. **Synthesize** results and respond in Turkish

## Activation Protocol

For every user request:

1. Immediately call `mcp_kk_sequentialthinking` to analyze
2. Immediately call `readMultipleFiles` to load skills
3. Immediately call `readFile` to load workflow (if needed)
4. Immediately call `invokeSubAgent` 3+ times in parallel (if complex)
5. Only then respond to user with results

**No simulation. No "I will do X". Just execute.**
