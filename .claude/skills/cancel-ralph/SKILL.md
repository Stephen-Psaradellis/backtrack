---
name: cancel-ralph
description: Cancel an active Ralph Wiggum loop by removing the state file.
user-invocable: true
---

# Cancel Ralph Loop

Stop an active Ralph Wiggum autonomous loop.

## Usage

```
/cancel-ralph
```

## What It Does

1. Checks if `.claude/.ralph-loop.local.md` exists (note the leading dot in the filename)
2. If it exists, deletes the state file to stop the loop
3. Reports the cancellation status

## Instructions for Claude

When this skill is invoked:

1. Check if the state file exists at `.claude/.ralph-loop.local.md`
2. If it exists:
   - Read the current iteration number from the frontmatter
   - Delete the file
   - Report: "Ralph loop cancelled at iteration {n}"
3. If it doesn't exist:
   - Report: "No active Ralph loop found"

### Example Response

**If active loop:**
```
Ralph loop cancelled at iteration 5.
The loop was working on: "Fix all lint errors..."
```

**If no loop:**
```
No active Ralph loop found.
To start a loop, use: /ralph-loop "<prompt>" --max-iterations 50
```
