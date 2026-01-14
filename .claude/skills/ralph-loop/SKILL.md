---
name: ralph-loop
description: Start a Ralph Wiggum autonomous loop. Windows-compatible implementation using Node.js. Use with a detailed prompt, max iterations, and completion promise.
user-invocable: true
arguments: ["prompt", "--max-iterations", "--completion-promise"]
---

# Ralph Loop (Windows-Compatible)

Start an autonomous iterative loop that runs until completion criteria are met.

## Usage

```
/ralph-loop "<prompt>" --max-iterations <n> --completion-promise "<promise>"
```

## Arguments

- `prompt` - The task prompt (required)
- `--max-iterations` or `-m` - Maximum iterations before stopping (default: 50)
- `--completion-promise` or `-p` - Text to output in `<promise>` tags when done (default: "COMPLETE")

## Examples

```bash
# Simple usage
/ralph-loop "Fix all lint errors. When done: <promise>COMPLETE</promise>"

# With explicit options
/ralph-loop "Increase test coverage to 90%. When done: <promise>COMPLETE</promise>" --max-iterations 30

# Complex task
/ralph-loop "Build user authentication with tests. When done: <promise>DONE</promise>" -m 60 -p "DONE"
```

## How It Works

1. Creates a state file at `.claude/.ralph-loop.local.md` (note the leading dot in the filename to keep it hidden)
2. When Claude finishes, the stop hook checks if the completion promise was output
3. If not complete, the same prompt is fed back to continue iterating
4. Loop stops when:
   - Completion promise is detected in output
   - Max iterations reached
   - State file is deleted (manual cancel)

## To Cancel

Run `/cancel-ralph` or delete `.claude/.ralph-loop.local.md`

## Instructions for Claude

When this skill is invoked, parse the arguments and create the ralph loop state file.

### Parse Arguments

Extract from the skill arguments:
- `prompt`: The main prompt text (everything before `--` flags, or the quoted string)
- `max_iterations`: Value after `--max-iterations` or `-m` (default: 50)
- `completion_promise`: Value after `--completion-promise` or `-p` (default: "COMPLETE")

### Create State File

Write to `.claude/.ralph-loop.local.md`:

```markdown
---
active: true
iteration: 0
max_iterations: {max_iterations}
completion_promise: "{completion_promise}"
started_at: "{ISO_TIMESTAMP}"
---

{prompt}
```

### Start the Loop

After creating the state file, immediately begin working on the prompt. The stop hook will handle continuation.

### Important Rules

1. **Track Progress**: Update the state file with iteration progress notes
2. **Be Thorough**: Each iteration should make meaningful progress
3. **Verify Work**: Always test/verify before claiming completion
4. **Exit Properly**: When done, output `<promise>{completion_promise}</promise>`
5. **Don't Lie**: Only output the promise when criteria are TRULY met

### Example State File

```markdown
---
active: true
iteration: 0
max_iterations: 50
completion_promise: "COMPLETE"
started_at: "2025-01-09T12:00:00Z"
---

Fix all TypeScript errors in the codebase.

## Process
1. Run `npm run typecheck` to see all errors
2. Fix errors one file at a time
3. Re-run typecheck after each fix
4. Continue until zero errors

## Completion Criteria
- `npm run typecheck` exits with code 0
- No type errors in output

When ALL criteria are met, output: <promise>COMPLETE</promise>
```
