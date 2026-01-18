---
name: Auto-Flow
description: "Unified orchestration for all tasks. Automatically routes to optimal model, searches memory for patterns, spawns swarms for complex work, and stores learnings. Use for ANY task to get intelligent automation without manual MCP calls."
---

# Auto-Flow: Unified Task Orchestration

## What This Skill Does

Auto-Flow is a single orchestration wrapper that handles the full claude-flow v3 lifecycle automatically:

1. **ROUTE** - Determines optimal model (haiku/sonnet/opus) based on task complexity
2. **RECALL** - Searches memory for relevant past patterns and solutions
3. **ORCHESTRATE** - Spawns swarms for complex tasks (3+ files, new features)
4. **EXECUTE** - Runs the work with appropriate agents
5. **LEARN** - Stores successful patterns for future use

## When to Use This Skill

**ALWAYS invoke `/auto-flow` at the start of any non-trivial task:**
- Bug fixes
- New features
- Refactoring
- Performance work
- API changes
- Any multi-file operation

**Skip for:**
- Quick questions
- Single-line fixes
- Configuration tweaks

## Quick Start

```
User: /auto-flow Implement user authentication with JWT

Claude: [Automatically executes the 5-phase pipeline]
```

## The Pipeline

### Phase 1: ROUTE (Get Model Recommendation)

```typescript
// Claude automatically calls:
mcp__claude-flow__hooks_pre-task({
  taskId: "auto-generated",
  description: "[your task]"
})

// Returns recommendation like:
// [TASK_MODEL_RECOMMENDATION] Use model="haiku" for simple tasks
// [TASK_MODEL_RECOMMENDATION] Use model="sonnet" for medium complexity
// [TASK_MODEL_RECOMMENDATION] Use model="opus" for complex architecture
```

### Phase 2: RECALL (Search Memory)

```typescript
// Claude automatically calls:
mcp__claude-flow__memory_search({
  query: "[keywords from task]",
  limit: 5
})

// Returns past patterns like:
// - "auth/jwt-implementation" - JWT with refresh tokens pattern
// - "auth/middleware" - Express auth middleware pattern
```

### Phase 3: ORCHESTRATE (Spawn Swarm if Complex)

**Complexity triggers (any of):**
- 3+ files affected
- New feature implementation
- Refactoring across modules
- API changes with tests
- Security-related changes

```typescript
// For complex tasks, Claude spawns:
mcp__claude-flow__swarm_init({
  topology: "hierarchical",  // Anti-drift
  maxAgents: 8
})

// Then spawns agents via Task tool with run_in_background: true
Task({ subagent_type: "researcher", run_in_background: true })
Task({ subagent_type: "coder", run_in_background: true })
Task({ subagent_type: "tester", run_in_background: true })
Task({ subagent_type: "reviewer", run_in_background: true })
```

### Phase 4: EXECUTE (Do the Work)

For simple tasks: Claude executes directly with recommended model.

For complex tasks: Background agents work in parallel, Claude synthesizes results.

### Phase 5: LEARN (Store Patterns)

```typescript
// After successful completion:
mcp__claude-flow__hooks_post-task({
  taskId: "auto-generated",
  success: true
})

mcp__claude-flow__memory_store({
  key: "[pattern-name]",
  value: "[what worked]",
  metadata: { type: "solution", confidence: 0.9 }
})
```

## Decision Matrix

| Task Type | Model | Swarm? | Agents |
|-----------|-------|--------|--------|
| Typo fix | haiku | No | - |
| Bug fix (1-2 files) | haiku | No | - |
| Bug fix (3+ files) | sonnet | Yes | researcher, coder, tester |
| New feature | sonnet | Yes | researcher, architect, coder, tester, reviewer |
| Refactoring | sonnet | Yes | architect, coder, reviewer |
| Performance | opus | Yes | researcher, perf-engineer, coder |
| Security | opus | Yes | security-architect, auditor, coder |
| Architecture design | opus | Yes | system-architect, researcher |

## Examples

### Example 1: Simple Bug Fix

```
User: /auto-flow Fix the null pointer in auth.js line 42

Claude:
[Phase 1: ROUTE] Task complexity: LOW -> Using direct execution
[Phase 2: RECALL] Searching memory for "null pointer auth"...
  Found: "null-check-pattern" - Always check for undefined before accessing
[Phase 3: ORCHESTRATE] Simple task - no swarm needed
[Phase 4: EXECUTE] Fixing the issue...
[Phase 5: LEARN] Stored pattern "auth/null-fix-line42"
```

### Example 2: New Feature

```
User: /auto-flow Add real-time notifications with WebSockets

Claude:
[Phase 1: ROUTE] Task complexity: HIGH -> Using sonnet with swarm
[Phase 2: RECALL] Searching memory for "websocket notifications"...
  Found: "ws-connection-pattern" - Socket.io with Redis adapter
[Phase 3: ORCHESTRATE] Spawning swarm...
  - researcher: Analyzing existing notification patterns
  - architect: Designing WebSocket integration
  - coder: Implementing socket handlers
  - tester: Writing connection tests
  - reviewer: Security review for WS connections
[Phase 4: EXECUTE] Agents working in parallel...
[Phase 5: LEARN] Stored patterns:
  - "notifications/websocket-setup"
  - "notifications/redis-adapter"
  - "notifications/reconnection-logic"
```

### Example 3: Performance Issue

```
User: /auto-flow The API is slow, optimize database queries

Claude:
[Phase 1: ROUTE] Task complexity: HIGH -> Using opus for analysis
[Phase 2: RECALL] Searching memory for "database optimization slow"...
  Found: "query-optimization-pattern" - Use indexes and connection pooling
[Phase 3: ORCHESTRATE] Spawning performance swarm...
  - researcher: Profiling current queries
  - perf-engineer: Analyzing execution plans
  - coder: Implementing optimizations
[Phase 4: EXECUTE] Running performance analysis...
[Phase 5: LEARN] Stored patterns:
  - "perf/query-indexing"
  - "perf/connection-pooling"
```

## Configuration

Auto-Flow uses these defaults (from CLAUDE.md):

```yaml
Topology: hierarchical     # Prevents agent drift
Max Agents: 8              # Smaller teams = less drift
Strategy: specialized      # Clear roles, no overlap
Consensus: raft            # Leader maintains state
Memory: hybrid             # Best performance
HNSW: enabled              # 150x faster search
```

## MCP Tools Used

Auto-Flow automatically orchestrates these tools:

| Phase | MCP Tool | Purpose |
|-------|----------|---------|
| Route | `hooks_pre-task` | Get model recommendation |
| Route | `hooks_model-route` | Complexity analysis |
| Recall | `memory_search` | Find past patterns |
| Recall | `hooks_intelligence_pattern-search` | Vector similarity |
| Orchestrate | `swarm_init` | Initialize coordination |
| Orchestrate | `agent_spawn` | Register agents |
| Learn | `hooks_post-task` | Record outcome |
| Learn | `memory_store` | Save patterns |

## Override Options

You can customize Auto-Flow behavior:

```
/auto-flow --no-swarm    # Force single-agent execution
/auto-flow --model opus  # Force specific model
/auto-flow --no-memory   # Skip memory search
/auto-flow --dry-run     # Show plan without executing
```

## Integration

Auto-Flow integrates with all other skills:

- **swarm-orchestration**: Delegates complex coordination
- **hooks-automation**: Uses pre/post hooks
- **verification-quality**: Validates outputs
- **reasoningbank-intelligence**: Learns from outcomes

## Best Practices

1. **Always use /auto-flow** for non-trivial tasks
2. **Let it decide** - Don't override unless necessary
3. **Trust the swarm** - Wait for background agents
4. **Check memory** - Review what patterns were found
5. **Verify learning** - Confirm patterns were stored

## Troubleshooting

### Swarm not spawning for complex task
- Check complexity detection in Phase 1
- Use `--force-swarm` to override

### Memory not finding patterns
- Patterns may not exist yet (first time)
- Check memory namespace with `memory_list`

### Wrong model selected
- Use `--model X` to override
- Report the task type for learning improvement

## Why Auto-Flow?

Before Auto-Flow, you had to manually:
1. Call `hooks_pre-task`
2. Call `memory_search`
3. Decide if swarm needed
4. Call `swarm_init`
5. Spawn agents with Task tool
6. Wait for results
7. Call `hooks_post-task`
8. Call `memory_store`

**With Auto-Flow: Just say `/auto-flow [task]` and it handles everything.**
