#!/bin/bash
#
# Claude Code pre-commit hook
# ============================
# Intercepts git commit commands and blocks if secrets are found.
# This prevents Claude from accidentally committing API keys.
#

# Read the tool input from stdin (JSON)
tool_input=$(cat)

# Extract the command being run
command=$(echo "$tool_input" | grep -o '"command"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/"command"[[:space:]]*:[[:space:]]*"//' | sed 's/"$//' | head -1)

# Exit early if this isn't a git commit/add command
if [[ ! "$command" =~ git[[:space:]]+(commit|add) ]]; then
    exit 0
fi

# API key patterns to scan for
patterns=(
    'AIza[0-9A-Za-z_-]{35}'           # Google Maps/Cloud API keys
    'sk-[a-zA-Z0-9]{20,}'             # OpenAI/Stripe secret keys
    'pk_live_[a-zA-Z0-9]+'            # Stripe live publishable keys
    'sk_live_[a-zA-Z0-9]+'            # Stripe live secret keys
    'eyJ[a-zA-Z0-9_-]+\.eyJ'          # JWT tokens
    'ghp_[a-zA-Z0-9]{36}'             # GitHub personal access tokens
    'AKIA[0-9A-Z]{16}'                # AWS access keys
)

# Build combined pattern
combined_pattern=$(IFS='|'; echo "${patterns[*]}")

# Check staged files for secrets
staged_files=$(git diff --cached --name-only 2>/dev/null)

# Skip if no staged files
if [ -z "$staged_files" ]; then
    exit 0
fi

has_secrets=0
problem_files=""

for file in $staged_files; do
    # Skip if file doesn't exist (deleted)
    if [ ! -f "$file" ]; then
        continue
    fi

    # Skip certain files
    if [[ "$file" =~ \.(md|example|sample)$ ]] || [[ "$file" =~ ^\.git/ ]]; then
        continue
    fi

    # Check the staged content for secrets
    if git show ":$file" 2>/dev/null | grep -qE "$combined_pattern"; then
        has_secrets=1
        problem_files="$problem_files  - $file\n"
    fi
done

if [ $has_secrets -eq 1 ]; then
    echo "" >&2
    echo "=======================================" >&2
    echo "BLOCKED: Potential secrets in staged files" >&2
    echo "=======================================" >&2
    echo "" >&2
    echo "The following files contain patterns that look like API keys:" >&2
    echo -e "$problem_files" >&2
    echo "" >&2
    echo "Actions required:" >&2
    echo "  1. Run: git diff --cached | grep -E 'AIza|sk-|pk_|eyJ|ghp_|AKIA'" >&2
    echo "  2. Remove secrets from files" >&2
    echo "  3. Re-stage the fixed files" >&2
    echo "" >&2
    echo "If android/ or ios/ files are staged, they should NOT be." >&2
    echo "These directories are in .gitignore and should never be committed." >&2
    echo "" >&2
    # Exit code 2 blocks the tool call
    exit 2
fi

exit 0
