---
name: ralph-prompt-builder
description: Transform simple task descriptions into well-structured Ralph Wiggum loop prompts. Use when user asks to "build a ralph prompt", "create a ralph loop", "structure this for ralph", "make this into a ralph command", or mentions wanting to run something autonomously overnight.
user-invocable: true
---

# Ralph Prompt Builder

Transform simple task descriptions into well-structured `/ralph-loop` commands optimized for autonomous iteration.

## What is Ralph Wiggum?

Ralph Wiggum is an iterative, self-referential AI development loop. It repeatedly feeds the same prompt to Claude, allowing autonomous improvement through iteration until completion criteria are met.

## How to Use This Skill

When a user provides a simple task description, transform it into a complete `/ralph-loop` command with:

1. **Structured prompt** with clear phases and completion criteria
2. **Appropriate `--max-iterations`** based on task complexity
3. **Clear `--completion-promise`** for exit detection

## Transformation Rules

### 1. Analyze Task Complexity

| Complexity | Max Iterations | Examples |
|------------|----------------|----------|
| Simple | 10-15 | Fix lint errors, add tests to one file |
| Medium | 20-30 | Implement single feature, refactor module |
| Complex | 40-60 | Multi-phase feature, full test coverage |
| Large | 80-100 | Architecture changes, migrations |

### 2. Add Completion Criteria

Every prompt MUST have explicit, verifiable completion criteria:

```
Completion criteria:
- [ ] All tests pass (`npm test` exits 0)
- [ ] Coverage > 80% (`npm test -- --coverage`)
- [ ] No lint errors (`npm run lint` exits 0)
- [ ] Feature works as specified
```

### 3. Include the Promise Tag

Always include this instruction in the prompt:
```
When ALL completion criteria are met, output: <promise>COMPLETE</promise>
```

### 4. Add Self-Correction Instructions

Include iterative improvement guidance:
```
After each iteration:
1. Run tests/linting to verify current state
2. Read any error output carefully
3. Fix issues one at a time
4. Re-run verification before claiming completion
```

### 5. Add Fallback Behavior

For complex tasks, include escape hatches:
```
If after {max_iterations - 5} iterations progress stalls:
- Document what's blocking in BLOCKERS.md
- List attempted approaches
- Suggest alternative strategies
- Output: <promise>BLOCKED</promise>
```

## Output Format

Generate the command in this exact format:

```bash
/ralph-loop "<structured_prompt>" --max-iterations <n> --completion-promise "COMPLETE"
```

## Transformation Examples

### Example 1: Simple Task

**Input:** "Fix all the lint errors"

**Output:**
```bash
/ralph-loop "Fix all lint errors in this codebase.

Process:
1. Run \`npm run lint\` to see all errors
2. Fix errors one file at a time, starting with the most errors
3. After each file, re-run lint to verify fixes
4. Continue until zero errors remain

Completion criteria:
- \`npm run lint\` exits with code 0
- No warnings or errors in output

When ALL criteria are met, output: <promise>COMPLETE</promise>" --max-iterations 20 --completion-promise "COMPLETE"
```

### Example 2: Medium Task

**Input:** "Add unit tests to get coverage above 90%"

**Output:**
```bash
/ralph-loop "Increase test coverage to above 90% statement coverage.

Process:
1. Run \`npm test -- --coverage\` to identify uncovered files
2. Prioritize files with lowest coverage in core directories (lib/, hooks/)
3. For each file:
   - Read the source code
   - Identify all exported functions/components
   - Write tests covering: happy paths, edge cases, error handling
   - Run tests to verify they pass
4. After each batch of tests, check coverage progress

Completion criteria:
- All tests pass (\`npm test\` exits 0)
- Statement coverage >= 90% (shown in coverage report)
- No skipped or pending tests

Self-correction:
- If a test fails, read the error, fix the test or source code
- If coverage doesn't increase, ensure tests actually exercise the code
- Check for mocking issues if testing external dependencies

When ALL criteria are met, output: <promise>COMPLETE</promise>" --max-iterations 40 --completion-promise "COMPLETE"
```

### Example 3: Complex Task

**Input:** "Build a REST API for user management"

**Output:**
```bash
/ralph-loop "Build a complete REST API for user management with tests.

## Phase 1: Setup & Types
- Define User type/interface
- Set up route structure
- Create database schema/migration

## Phase 2: CRUD Endpoints
- POST /users (create)
- GET /users (list with pagination)
- GET /users/:id (read single)
- PUT /users/:id (update)
- DELETE /users/:id (delete)

## Phase 3: Validation & Error Handling
- Input validation for all endpoints
- Proper error responses (400, 401, 404, 500)
- Request/response logging

## Phase 4: Tests
- Unit tests for each endpoint
- Integration tests for full flows
- Edge case coverage

## Phase 5: Documentation
- README with API usage examples
- OpenAPI/Swagger spec if applicable

Completion criteria:
- All CRUD endpoints implemented and working
- Input validation on all write endpoints
- Tests passing with >80% coverage
- README documents all endpoints

Self-correction after each phase:
1. Run tests to verify nothing broke
2. Test endpoints manually if needed
3. Fix any regressions before proceeding

Fallback (if stuck after 50 iterations):
- Document progress in API-PROGRESS.md
- List blocking issues
- Output: <promise>BLOCKED</promise>

When ALL criteria are met, output: <promise>COMPLETE</promise>" --max-iterations 60 --completion-promise "COMPLETE"
```

### Example 4: TDD Task

**Input:** "Implement a caching layer using TDD"

**Output:**
```bash
/ralph-loop "Implement a caching layer using strict TDD methodology.

TDD Cycle (repeat for each feature):
1. RED: Write a failing test for the next piece of functionality
2. GREEN: Write minimal code to make the test pass
3. REFACTOR: Clean up while keeping tests green
4. Commit after each green state

Features to implement (in order):
1. Basic get/set operations
2. TTL (time-to-live) expiration
3. Cache invalidation by key
4. Cache invalidation by pattern
5. Size limits with LRU eviction

For each feature:
- Write test FIRST (must fail initially)
- Implement ONLY enough to pass
- Refactor if needed
- Run full test suite before next feature

Completion criteria:
- All 5 features implemented
- Each feature has corresponding tests
- All tests pass
- No \`any\` types (TypeScript strict)
- Coverage > 90%

When ALL criteria are met, output: <promise>COMPLETE</promise>" --max-iterations 50 --completion-promise "COMPLETE"
```

## Anti-Patterns to Avoid

### Bad Prompts

1. **No completion criteria:**
   ```
   "Build a todo API and make it good"
   ```

2. **Vague success definition:**
   ```
   "Fix bugs until it works"
   ```

3. **No iteration guidance:**
   ```
   "Write all the tests"
   ```

### Good Prompt Characteristics

- Explicit, verifiable completion criteria
- Phased approach for complex tasks
- Self-correction instructions
- Fallback behavior for edge cases
- Clear promise tag for exit

## Quick Reference

```
Prompt Structure:
├── Task description (what to build/fix)
├── Process/Phases (how to approach it)
├── Completion criteria (verifiable checklist)
├── Self-correction (how to handle failures)
├── Fallback (what to do if stuck)
└── Promise tag (exit signal)

Command:
/ralph-loop "<prompt>" --max-iterations <n> --completion-promise "COMPLETE"
```
