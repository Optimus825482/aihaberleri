---
inclusion: always
---

# Automatic Agent Spawning Protocol

## Overview

This document defines when and how to automatically spawn subagents using the `invokeSubAgent` tool. Agents are spawned based on request complexity and domain requirements, with appropriate skills loaded for each agent.

## Core Principles

**Real Tool Execution**: Always use actual `invokeSubAgent` and `executePwsh` tool calls - never simulate or describe what you would do.

**Parallel Execution**: Spawn independent agents in parallel using `Promise.all()` for faster execution.

**Skill Loading**: Load relevant Superpowers skills before spawning agents to provide full context.

**Communication Language**: User-facing responses and documentation in Turkish; code and technical identifiers in English.

## Superpowers Skill Integration

Before spawning agents, load relevant Superpowers skills using real tool calls.

**Superpowers CLI Path**: `C:\Users\erkan\.codex\superpowers\.codex\superpowers-codex`

**Loading Command**:

```bash
node C:\Users\erkan\.codex\superpowers\.codex\superpowers-codex use-skill <skill-name>
```

Use `executePwsh` tool to execute this command and capture skill content.

## Complexity Detection Rules

Determine how many agents to spawn based on request complexity:

| Request Type                       | Complexity | Minimum Agents | Primary Tool                              |
| ---------------------------------- | ---------- | -------------- | ----------------------------------------- |
| Simple query or clarification      | LOW        | 0              | None (direct answer)                      |
| Single-domain task                 | MEDIUM     | 1              | `invokeSubAgent` (general-task-execution) |
| Multi-domain or cross-cutting task | HIGH       | 3+             | `invokeSubAgent` (parallel)               |
| Codebase exploration needed        | ANY        | 1              | `invokeSubAgent` (context-gatherer)       |

**Examples**:

- LOW: "What is React?" → Direct answer
- MEDIUM: "Fix this CSS bug" → 1 agent (frontend specialist)
- HIGH: "Debug login API" → 3+ agents (context-gatherer, debugger, tester)

## Request Pattern Matching

Match user request keywords to determine which agents and skills to use:

### Debug & Fix Tasks

**Keywords**: "debug", "hata", "fix", "error", "bug"

**Superpowers Skills**:

- `superpowers:systematic-debugging`
- `superpowers:test-driven-development`

**Agents**:

1. `context-gatherer` - Find relevant code files
2. `general-task-execution` (debugger role) - Analyze root cause
3. `general-task-execution` (tester role) - Create regression tests

### Planning Tasks

**Keywords**: "plan", "tasarım", "design", "architecture"

**Superpowers Skills**:

- `superpowers:writing-plans`
- `superpowers:brainstorming`

**Agents**:

1. `general-task-execution` (planner role) - Create PLAN.md or design document

### New Project Creation

**Keywords**: "yeni proje", "create app", "new project", "scaffold"

**Superpowers Skills**:

- `superpowers:brainstorming`
- `superpowers:writing-plans`
- `superpowers:test-driven-development`

**Agents**:

1. `general-task-execution` (planner role) - Project structure
2. `general-task-execution` (frontend role) - UI implementation
3. `general-task-execution` (backend role) - API implementation
4. `general-task-execution` (tester role) - Test suite

### Backend/API Tasks

**Keywords**: "API", "backend", "server", "endpoint", "database"

**Superpowers Skills**:

- `superpowers:test-driven-development`
- `superpowers:verification-before-completion`

**Agents**:

1. `general-task-execution` (backend role) - API implementation
2. `general-task-execution` (database role) - Schema design
3. `general-task-execution` (security role) - Security audit

### Frontend/UI Tasks

**Keywords**: "UI", "frontend", "arayüz", "component", "interface"

**Superpowers Skills**:

- `superpowers:brainstorming`
- `superpowers:test-driven-development`

**Agents**:

1. `general-task-execution` (frontend role) - UI implementation
2. `general-task-execution` (performance role) - Performance optimization
3. `general-task-execution` (seo role) - SEO implementation

### Performance Optimization

**Keywords**: "optimize", "performance", "hızlandır", "slow", "speed"

**Superpowers Skills**:

- `superpowers:systematic-debugging`
- `superpowers:verification-before-completion`

**Agents**:

1. `general-task-execution` (performance role) - Performance analysis
2. `general-task-execution` (frontend role) - Frontend optimization
3. `general-task-execution` (backend role) - Backend optimization

### Security Tasks

**Keywords**: "security", "güvenlik", "vulnerability", "audit"

**Superpowers Skills**:

- `superpowers:systematic-debugging`
- `superpowers:verification-before-completion`

**Agents**:

1. `general-task-execution` (security role) - Security audit
2. `general-task-execution` (penetration role) - Penetration testing
3. `general-task-execution` (backend role) - Backend security review

### Deployment Tasks

**Keywords**: "deploy", "production", "release", "publish"

**Superpowers Skills**:

- `superpowers:verification-before-completion`
- `superpowers:finishing-a-development-branch`

**Agents**:

1. `general-task-execution` (devops role) - Deployment configuration
2. `general-task-execution` (security role) - Pre-deployment security check
3. `general-task-execution` (tester role) - Pre-deployment testing

### Code Review

**Keywords**: "code review", "review code", "PR review"

**Superpowers Skills**:

- `superpowers:requesting-code-review`
- `superpowers:receiving-code-review`

**Agents**:

1. `general-task-execution` (reviewer role) - Code review analysis

### Parallel Execution

**Keywords**: "parallel", "independent", "concurrent"

**Superpowers Skills**:

- `superpowers:dispatching-parallel-agents`
- `superpowers:subagent-driven-development`

**Agents**: Multiple `general-task-execution` agents based on task breakdown

## Implementation Pattern

Follow this pattern when spawning agents with Superpowers skills:

### Step 1: Analyze Request

Detect keywords in the user request to determine complexity and required domains.

### Step 2: Determine Skills

Based on detected keywords, identify which Superpowers skills are needed.

### Step 3: Load Skills (Real Execution)

Use `executePwsh` to load each Superpowers skill:

```typescript
const skillContent = await executePwsh({
  command: `node C:\\Users\\erkan\\.codex\\superpowers\\.codex\\superpowers-codex use-skill ${skillName}`,
  explanation: `Loading ${skillName} for agent delegation`,
});
```

### Step 4: Build Agent Configurations

Create agent configurations with full context (user request + Kiro skills + Superpowers content).

### Step 5: Spawn Agents in Parallel

Use `Promise.all()` to spawn multiple agents simultaneously:

```typescript
const results = await Promise.all([
  invokeSubAgent({
    name: "context-gatherer",
    prompt: "...",
    explanation: "...",
  }),
  invokeSubAgent({
    name: "general-task-execution",
    prompt: "...",
    explanation: "...",
  }),
  invokeSubAgent({
    name: "general-task-execution",
    prompt: "...",
    explanation: "...",
  }),
]);
```

### Step 6: Synthesize Results

Combine agent outputs and present to user.

## Agent Prompt Template

When spawning agents, use this prompt structure:

```
You are a [ROLE] specialist using Gemini 2.5 Flash.

🎯 GÖREV: [User request in Turkish]

📚 YÜKLÜ KIRO SKİLLER:
- [skill-1]
- [skill-2]

📖 SUPERPOWERS SKILL CONTENT:
### [skill-name]
[skill content loaded via executePwsh]

⚡ TALİMAT:
1. [Specific instruction 1]
2. [Specific instruction 2]
3. [Specific instruction 3]

BU SKİLLERİ KULLANARAK GÖREVİ TAMAMLA VE MAESTRO'YA RAPOR ET.
```

## Mandatory Rules

**HIGH Complexity Tasks**:

- MUST spawn minimum 3 agents
- MUST execute agents in parallel when independent
- MUST use context-gatherer for codebase exploration

**Skill Loading**:

- MUST load Superpowers skills using real `executePwsh` tool calls
- NEVER simulate skill loading
- MUST pass loaded skill content to agent prompts

**Tool Usage**:

- MUST use `invokeSubAgent` tool (not simulation)
- MUST use `executePwsh` for Superpowers skill loading
- MUST use `Promise.all()` for parallel agent execution

**Context Passing**:

- MUST include user request in agent prompts
- MUST include loaded Kiro skills list
- MUST include loaded Superpowers skill content
- MUST specify agent role and responsibilities

## Execution Example

User request: "Login API endpoint debug et"

**Step 1: Detect Keywords**

- "debug" → Debug task
- "API" → Backend domain
- "endpoint" → API-specific

**Step 2: Determine Skills**

- `superpowers:systematic-debugging`
- `superpowers:test-driven-development`

**Step 3: Load Kiro Skills**

```typescript
const kiroSkills = await readMultipleFiles({
  paths: [
    ".agent/skills/systematic-debugging/SKILL.md",
    ".agent/skills/api-patterns/SKILL.md",
    ".agent/skills/testing-patterns/SKILL.md",
  ],
  explanation: "Loading Kiro skills for debugging task",
});
```

**Step 4: Load Superpowers Skills**

```typescript
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
```

**Step 5: Spawn Agents in Parallel**

```typescript
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
```

**Step 6: Synthesize Results**

```typescript
return {
  codeFiles: context.files,
  rootCause: debugResult.analysis,
  fix: debugResult.solution,
  tests: testResult.tests,
  superpowersUsed: ["systematic-debugging", "test-driven-development"],
};
```

## When NOT to Spawn Agents

Do not spawn agents for:

- Simple clarification questions
- Direct factual queries
- Requests for explanation or documentation
- Single-file simple edits that don't require analysis

In these cases, provide a direct answer without agent spawning.

## Summary

This protocol automatically activates when user requests indicate multi-domain or complex tasks. Always use real tool calls for skill loading and agent spawning - never simulate. Spawn agents in parallel when possible for faster execution.
