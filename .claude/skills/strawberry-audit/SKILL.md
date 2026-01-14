---
name: strawberry-audit
description: Use this skill after writing documentation, README sections, or comprehensive code explanations that users will reference. NOT during debugging or quick fixes. Use for content that will persist (docs, comments, architectural summaries).
user-invocable: false
---

# Strawberry Audit

Audit responses for hallucinations before presenting persistent documentation or explanations.

## When to Use

**DO use when:**
- Writing or updating documentation
- Adding comprehensive code comments
- Creating README sections
- Explaining architecture for future reference
- Writing technical specs or design docs
- Summarizing a codebase or module

**DO NOT use when:**
- Debugging (speed matters)
- Quick fixes or one-liners
- Iterating on code with user
- Making tentative suggestions
- Error investigation

## Instructions

After drafting documentation or comprehensive explanation:

1. Identify key claims in your draft

2. Gather the source code those claims describe

3. Run audit:

```bash
doppler run -- python << 'PYEOF'
from strawberry_claude import HallucinationDetector

detector = HallucinationDetector()

response = """YOUR_DRAFTED_DOCS"""
context = """THE_SOURCE_CODE"""

result = detector.detect("", response, context)

print(f"Reliability: {result.overall_reliability}")
if result.hallucination_count > 0:
    print(f"\nFix {result.hallucination_count} issues:")
    for c in result.claims:
        if c.is_hallucination:
            print(f"  - {c.claim_text[:50]}...")
PYEOF
```

4. Fix any flagged claims before presenting

## Why This Matters

Documentation persists. A wrong claim in a README or code comment will mislead future developers. Verify before committing.

During debugging, wrong hypotheses get quickly disproven by running the code - no audit needed.
