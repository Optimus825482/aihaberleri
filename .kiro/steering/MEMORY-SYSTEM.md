---
inclusion: always
---

# Memory System and Self-Learning Framework

## Purpose

Use Qdrant Memory MCP system to enable continuous learning through:

1. Automatic storage of significant operations
2. Pattern detection and analysis
3. Context-aware memory retrieval
4. Silent background operation (never visible to user)

## Core Principles

### Silent Background Operation (CRITICAL)

Memory operations MUST be:

- **Invisible**: Never show memory operations to users
- **Non-blocking**: Never slow down task execution
- **Fault-tolerant**: Silently continue on errors using `.catch(() => null)`
- **Minimal**: Store only significant events (limit queries to 3-5 results)
- **Fast**: Use low limits for quick retrieval

### Implementation Pattern

```typescript
// CORRECT: Silent background operation
async function backgroundMemoryOps(task: Task) {
  // Search before task (silent)
  const memories = await mcp_qdrant_memory_mem_search({
    query: task.description,
    limit: 3,
  }).catch(() => null);

  // Store after task (silent)
  await mcp_qdrant_memory_mem_store({
    content: `${task.type} - ${task.summary}`,
    tags: [task.category, task.date],
    metadata: { confidence: 0.9, impact: "high" },
  }).catch(() => null);
}

// INCORRECT: Never log or show to user
// console.log("Searching memory..."); // DON'T DO THIS
```

## Memory Triggers

Store memories automatically when these events occur:

### 1. Task Completion

Store when any significant task completes successfully.

```typescript
await mcp_qdrant_memory_mem_store({
  content: `${taskType} - ${summary} - ${solution}`,
  tags: [category, project, date],
  metadata: {
    category: taskType,
    confidence: 0.9,
    impact: "high",
    outcome: "success",
  },
});
```

**Examples**: Bug fixes, feature additions, optimizations, deployments

### 2. Error Resolution

Store error patterns and their solutions.

```typescript
await mcp_qdrant_memory_mem_store({
  content: `ERROR - ${errorType} - ${errorMessage} - ${solution}`,
  tags: ["error", errorType, project, date],
  metadata: {
    category: "error-pattern",
    confidence: 0.8,
    impact: "high",
    outcome: errorResolved ? "success" : "partial",
  },
});
```

### 3. Success Patterns

Store successful problem-solving approaches.

```typescript
await mcp_qdrant_memory_mem_store({
  content: `SUCCESS_PATTERN - ${problem} - ${solution} - ${result}`,
  tags: ["success-pattern", domain, date],
  metadata: {
    category: "debug-solutions",
    confidence: 0.95,
    impact: "high",
    outcome: "success",
  },
});
```

### 4. Performance Improvements

Store performance optimization results with metrics.

```typescript
await mcp_qdrant_memory_mem_store({
  content: `PERFORMANCE - ${metric} - Before: ${before} - After: ${after} - Technique: ${technique}`,
  tags: ["performance", metric, date],
  metadata: {
    category: "performance-optimizations",
    confidence: 0.9,
    impact: "high",
    improvement: calculateImprovement(before, after),
  },
});
```

### 5. Architecture Decisions

Store significant architectural choices with rationale.

```typescript
await mcp_qdrant_memory_mem_store({
  content: `ARCHITECTURE - ${decision} - Reason: ${reason} - Trade-offs: ${tradeoffs}`,
  tags: ["architecture", project, date],
  metadata: {
    category: "architecture-decisions",
    confidence: 0.85,
    impact: "high",
    alternatives: alternativeApproaches,
  },
});
```

### 6. Skill Learning

Store newly learned techniques and patterns.

```typescript
await mcp_qdrant_memory_mem_store({
  content: `SKILL_LEARNED - ${skillName} - Use Case: ${useCase} - Benefits: ${benefits}`,
  tags: ["skill-learning", domain, date],
  metadata: {
    category: "skill-learnings",
    confidence: 0.8,
    impact: "medium",
    applicability: applicableScenarios,
  },
});
```

### 7. User Feedback

Store user feedback for continuous improvement.

```typescript
await mcp_qdrant_memory_mem_store({
  content: `USER_FEEDBACK - ${feedback} - Context: ${context} - Action: ${action}`,
  tags: ["user-feedback", sentiment, date],
  metadata: {
    category: "user-feedback",
    confidence: 0.9,
    impact: feedbackImpact,
    sentiment: analyzeSentiment(feedback),
  },
});
```

### 8. Workflow Improvements

Store process optimizations and efficiency gains.

```typescript
await mcp_qdrant_memory_mem_store({
  content: `WORKFLOW_IMPROVEMENT - ${workflow} - Old: ${oldWay} - New: ${newWay} - Benefit: ${benefit}`,
  tags: ["workflow", improvement, date],
  metadata: {
    category: "workflow-improvements",
    confidence: 0.85,
    impact: "medium",
    efficiency_gain: calculateEfficiency(oldWay, newWay),
  },
});
```

## Memory Organization

### Categories (7 Primary Types)

1. **debug-solutions**: Error resolutions and debugging patterns
2. **architecture-decisions**: Architectural choices and trade-offs
3. **performance-optimizations**: Performance improvements and metrics
4. **skill-learnings**: Learned techniques and best practices
5. **workflow-improvements**: Process optimizations and efficiency
6. **user-feedback**: User feedback and satisfaction
7. **pattern-insights**: Detected patterns and insights

### Tag Structure

```typescript
const tags = [
  category, // "debug-solutions"
  project, // "eventflow"
  date, // "2026-02-08"
  ...keywords, // ["api", "performance", "nestjs"]
];
```

### Metadata Schema

```typescript
interface MemoryMetadata {
  category: string; // Primary category
  confidence: number; // 0-1 confidence score
  impact: "low" | "medium" | "high"; // Impact level
  outcome: "success" | "partial" | "failed";
  timestamp?: string; // ISO8601 format
  context?: string; // Additional context
  related_skills?: string[]; // Related skills
  related_tasks?: string[]; // Related tasks
  improvement?: number; // Improvement percentage
  alternatives?: string[]; // Alternative approaches
}
```

## Self-Learning Algorithm

### 4-Phase Learning Cycle

**Phase 1: COLLECT** (Automatic - After Each Task)

```typescript
async function collectMemory(task: Task) {
  await mcp_qdrant_memory_mem_store({
    content: extractKeyInfo(task),
    tags: generateTags(task),
    metadata: generateMetadata(task),
  });
}
```

**Phase 2: ANALYZE** (Every 5 Tasks)

```typescript
async function analyzePatterns() {
  const recentMemories = await mcp_qdrant_memory_mem_list({ limit: 50 });

  return {
    errorPatterns: detectErrorPatterns(recentMemories),
    successPatterns: detectSuccessPatterns(recentMemories),
    performancePatterns: detectPerformancePatterns(recentMemories),
    workflowPatterns: detectWorkflowPatterns(recentMemories),
  };
}
```

**Phase 3: SYNTHESIZE** (Daily Reflection)

```typescript
async function dailyReflection() {
  const today = new Date().toISOString().split("T")[0];
  const todayMemories = await mcp_qdrant_memory_mem_search({
    query: today,
    limit: 20,
  }).catch(() => ({ memories: [] }));

  const insights = {
    mostCommonIssues: analyzeFrequency(todayMemories, "error"),
    mostEffectiveSolutions: analyzeEffectiveness(todayMemories, "success"),
    performanceGains: analyzePerformance(todayMemories),
    learningOpportunities: identifyGaps(todayMemories),
  };

  await mcp_qdrant_memory_mem_store({
    content: `DAILY_REFLECTION - ${JSON.stringify(insights)}`,
    tags: ["reflection", "daily", today],
    metadata: {
      category: "pattern-insights",
      confidence: 0.9,
      impact: "high",
      type: "daily_synthesis",
    },
  }).catch(() => null);

  return insights;
}
```

**Phase 4: EVOLVE** (Weekly/Monthly)

```typescript
async function weeklyEvolution() {
  const weekMemories = await getLastWeekMemories();
  const patterns = await analyzePatterns();
  const insights = await synthesizeInsights(weekMemories);

  const newRules = generateRules(patterns, insights);
  await updateSteeringRules(newRules);

  await mcp_qdrant_memory_mem_store({
    content: `WEEKLY_EVOLUTION - New Rules: ${newRules.length} - Patterns: ${patterns.length}`,
    tags: ["evolution", "weekly", getWeekNumber()],
    metadata: {
      category: "pattern-insights",
      confidence: 0.95,
      impact: "high",
      type: "weekly_evolution",
      rules_added: newRules.length,
    },
  }).catch(() => null);
}
```

## Pattern Recognition

### Pattern Types

1. **Error Patterns**: Recurring errors and their solutions
2. **Success Patterns**: Effective problem-solving approaches
3. **Performance Patterns**: Performance optimization techniques
4. **Workflow Patterns**: Efficient working methods
5. **Architecture Patterns**: Architectural design patterns
6. **User Patterns**: User behavior patterns

### Detection Algorithm

```typescript
async function detectPatterns(memories: Memory[]): Promise<Pattern[]> {
  const patterns: Pattern[] = [];

  // 1. Frequency analysis
  const frequencyMap = analyzeFrequency(memories);

  // 2. Similarity analysis (semantic clustering)
  const clusters = clusterSimilarMemories(memories);

  // 3. Temporal analysis (trends over time)
  const trends = analyzeTrends(memories);

  // 4. Outcome analysis (success/failure patterns)
  const outcomePatterns = analyzeOutcomes(memories);

  // 5. Combine and score patterns
  for (const cluster of clusters) {
    if (cluster.size >= 3) {
      // Minimum 3 similar memories
      const pattern = {
        type: identifyPatternType(cluster),
        frequency: cluster.size,
        confidence: calculateConfidence(cluster),
        impact: calculateImpact(cluster),
        description: generateDescription(cluster),
        recommendations: generateRecommendations(cluster),
      };
      patterns.push(pattern);
    }
  }

  // 6. Store detected patterns
  for (const pattern of patterns) {
    await mcp_qdrant_memory_mem_store({
      content: `PATTERN_DETECTED - ${pattern.type} - ${pattern.description}`,
      tags: ["pattern", pattern.type, new Date().toISOString().split("T")[0]],
      metadata: {
        category: "pattern-insights",
        confidence: pattern.confidence,
        impact: pattern.impact,
        frequency: pattern.frequency,
      },
    });
  }

  return patterns;
}
```

## Continuous Improvement

### Feedback Loop

```typescript
async function feedbackLoop(task: Task, outcome: Outcome) {
  // 1. Store outcome
  await mcp_qdrant_memory_mem_store({
    content: `TASK_OUTCOME - ${task.type} - ${outcome.result}`,
    tags: [task.category, outcome.status, task.date],
    metadata: {
      category: task.category,
      confidence: outcome.confidence,
      impact: outcome.impact,
      outcome: outcome.status,
    },
  });

  // 2. Search similar past tasks
  const similarTasks = await mcp_qdrant_memory_mem_search({
    query: task.description,
    limit: 5,
  });

  // 3. Compare and learn
  const learnings = compareAndLearn(task, similarTasks);

  // 4. Store learnings
  if (learnings.length > 0) {
    await mcp_qdrant_memory_mem_store({
      content: `LEARNING - ${JSON.stringify(learnings)}`,
      tags: ["learning", task.category, task.date],
      metadata: {
        category: "skill-learnings",
        confidence: 0.85,
        impact: "medium",
        source: "feedback_loop",
      },
    });
  }
}
```

### Evolution Metrics

```typescript
interface EvolutionMetrics {
  successRate: number; // Success rate (%)
  averageConfidence: number; // Average confidence score
  patternCount: number; // Number of detected patterns
  learningRate: number; // Learning velocity
  improvementRate: number; // Improvement rate
  skillGrowth: number; // Skill growth
}

async function calculateEvolutionMetrics(): Promise<EvolutionMetrics> {
  const allMemories = await mcp_qdrant_memory_mem_list({ limit: 100 });

  return {
    successRate: calculateSuccessRate(allMemories),
    averageConfidence: calculateAverageConfidence(allMemories),
    patternCount: countPatterns(allMemories),
    learningRate: calculateLearningRate(allMemories),
    improvementRate: calculateImprovementRate(allMemories),
    skillGrowth: calculateSkillGrowth(allMemories),
  };
}
```

## Usage Examples

### Example 1: Debug Task (Silent Operation)

```typescript
async function handleDebugTask() {
  // Silent search (don't show to user)
  const relatedMemories = await mcp_qdrant_memory_mem_search({
    query: "Login API 401 error",
    limit: 3,
  }).catch(() => null);

  const previousSolutions = relatedMemories?.memories || [];

  // ... perform task ...

  // Silent store (don't show to user)
  await mcp_qdrant_memory_mem_store({
    content:
      "DEBUG_SUCCESS - Login API 401 - Root Cause: Bcrypt hash mismatch - Solution: Reset admin password with correct hash",
    tags: ["debug-solutions", "eventflow", "auth", "2026-02-08"],
    metadata: {
      category: "debug-solutions",
      confidence: 0.95,
      impact: "high",
      outcome: "success",
      related_skills: ["bcrypt", "nestjs", "postgresql"],
    },
  }).catch(() => null);
}
```

### Example 2: Performance Optimization

```typescript
const before = { loadTime: 3500, queryCount: 15 };
const after = { loadTime: 850, queryCount: 3 };

await mcp_qdrant_memory_mem_store({
  content: `PERFORMANCE_OPTIMIZATION - EventFlow Dashboard - Before: ${before.loadTime}ms, ${before.queryCount} queries - After: ${after.loadTime}ms, ${after.queryCount} queries - Technique: N+1 query fix with loadRelationCountAndMap`,
  tags: ["performance-optimizations", "eventflow", "nestjs", "2026-02-08"],
  metadata: {
    category: "performance-optimizations",
    confidence: 0.9,
    impact: "high",
    improvement: (
      ((before.loadTime - after.loadTime) / before.loadTime) *
      100
    ).toFixed(1),
    technique: "N+1 query optimization",
  },
});
```

### Example 3: Architecture Decision

```typescript
await mcp_qdrant_memory_mem_store({
  content:
    "ARCHITECTURE_DECISION - EventFlow Extra Staff - Decision: Separate entity instead of extending Staff - Reason: Different lifecycle and validation rules - Trade-offs: More tables but cleaner separation of concerns",
  tags: ["architecture-decisions", "eventflow", "database", "2026-02-08"],
  metadata: {
    category: "architecture-decisions",
    confidence: 0.85,
    impact: "high",
    alternatives: ["Extend Staff entity", "Use JSON column", "Separate table"],
    chosen: "Separate table",
  },
});
```

## Task Checklist

### Before Each Task

- Search relevant memories silently (`mem_search`)
- Review past solutions (internal use only)

### After Each Task

- Store task outcome silently (`mem_store`)
- Use appropriate category and tags
- Include metadata (confidence, impact, outcome)
- Reference related skills

### Daily (Background)

- Run daily reflection silently
- Detect patterns
- Extract learnings

### Weekly (Background)

- Run weekly reflection silently
- Analyze trends
- Detect new patterns
- Update rules if needed

## Critical Rules

### DO (Always)

- ✅ Operate in background (silent)
- ✅ Store after each significant task
- ✅ Search before similar tasks
- ✅ Use fast queries (limit: 3-5)
- ✅ Handle errors silently (`.catch(() => null)`)
- ✅ Maintain task execution speed
- ✅ Add metadata (confidence, impact, outcome)
- ✅ Use appropriate tags (category, project, date)

### DON'T (Never)

- ❌ Show memory operations to user
- ❌ Log memory operations (`console.log`)
- ❌ Wait for memory operations
- ❌ Show memory errors to user
- ❌ Slow down task execution
- ❌ Make memory operations visible in any way

## Summary

This memory system operates completely in the background, learning from every task to improve future performance. It stores significant events, detects patterns, and enables continuous improvement without ever being visible to the user or slowing down task execution.
