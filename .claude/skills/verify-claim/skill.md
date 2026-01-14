---
name: verify-claim
description: "TRIGGER PHRASES: 'debug', 'fix', 'not working', 'broken', 'issue', 'bug', 'error', 'failing', 'crash', 'wrong'. When user reports ANY problem, invoke this skill AFTER investigating but BEFORE writing fix code. This is MANDATORY - do not skip."
user-invocable: false
---

# Verify Claim

**MANDATORY:** Verify bug diagnoses before investing time fixing them.

## TRIGGER: User Prompts That REQUIRE This Skill

If the user's prompt contains ANY of these patterns, you MUST use this skill:
- "debug this", "fix this", "not working", "broken", "failing"
- "X isn't working", "X is broken", "X doesn't work"
- "why is this [failing/broken/wrong]", "what's causing this"
- "there's a bug", "there's an issue", "there's an error"
- Any request to investigate + fix a problem

**Example prompts that MUST trigger this skill:**
- "Avatar thumbnails aren't working. debug this and fix it." → USE SKILL
- "The login is broken, please fix" → USE SKILL
- "Debug why tests are failing" → USE SKILL

## Workflow (MUST FOLLOW)

1. **Investigate** - Read code, gather context, understand the system
2. **Form diagnosis** - Identify what you believe is the root cause
3. **INVOKE THIS SKILL** - Run verification BEFORE writing any fix code
4. **If flagged** - Re-examine, form new diagnosis, verify again
5. **Only after verified** - Write the fix

## When to Use (PROACTIVELY - don't wait for user to ask)

**ALWAYS use when:**
- User reports something "not working", "broken", "failing", etc.
- **Diagnosing ANY bug or error** - before writing fix code
- Claiming "the problem is X" or "the issue is in Y"
- The root cause isn't 100% obvious from the error message

**Skip ONLY when:**
- Already iterating on a fix (cause previously verified in THIS conversation)
- Error message explicitly states the exact cause with file and line number
- Pure research/exploration with no fix being written

## Instructions

When claiming "the bug is caused by X" or "the issue is in Y":

1. Identify your diagnosis claim

2. Get the relevant source code

3. Verify before investing fix time:

```bash
doppler run -- python << 'PYEOF'
from strawberry_claude import HallucinationDetector

detector = HallucinationDetector()

claim = """THE_DIAGNOSIS"""
context = """THE_SOURCE_CODE"""

is_hall, analysis = detector.quick_check(claim, context)

if is_hall:
    print("DIAGNOSIS MAY BE WRONG")
    print(f"Confidence: {analysis.posterior_confidence:.0%}")
    print("Re-examine the code before proceeding")
else:
    print("Diagnosis verified - proceed with fix")
PYEOF
```

4. If flagged:
   - Stop before writing fix code
   - Re-read the source carefully
   - Form new diagnosis and verify again

5. Only proceed with fix after diagnosis is verified

## Why This Matters

Fixing the wrong thing wastes time. A 30-second verification can save 30 minutes of fixing the wrong bug.

## Example

Before saying: "The crash is caused by the null check on line 45"

1. Read the code around line 45
2. Verify the claim
3. If flagged → look again, maybe it's line 52
4. Once verified → proceed with fix
