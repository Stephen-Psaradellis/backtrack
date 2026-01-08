#!/bin/bash
# E2E Multi-User Test Runner - FULLY AUTOMATED WITH RETRIES
# Each task runs in a fresh Claude instance that updates progress when done

# Don't exit on error - we handle errors ourselves
set +e

PLAN_FILE="E2E-MULTI-USER-TEST-PLAN.md"
PROGRESS_FILE="E2E-MULTI-USER-PROGRESS.md"
ISSUES_FILE="E2E-MULTI-USER-ISSUES.md"
IMPROVEMENTS_FILE="E2E-MULTI-USER-IMPROVEMENTS.md"

# Configuration
MAX_RETRIES_PER_TASK=3
MAX_CONSECUTIVE_FAILURES=5
RETRY_DELAY_SECONDS=5

# All tasks in order
TASKS=(
    "0.1" "0.2" "0.3"
    "1.1" "1.2" "1.3"
    "2.1" "2.2"
    "3.1" "3.2" "3.3" "3.4"
    "4.1" "4.2"
    "5.1" "5.2" "5.3" "5.4" "5.5"
    "6.1" "6.2" "6.3"
    "7.1" "7.2" "7.3"
    "8.1" "8.2"
    "9.1"
    "10.1" "10.2" "10.3" "10.4"
    "11.1" "11.2"
    "12.1" "12.2"
)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m'

# Track retry counts per task
declare -A task_retries

log_info() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

get_task_status() {
    local task_num="$1"
    if grep -q "\[x\] Task $task_num" "$PROGRESS_FILE" 2>/dev/null; then
        echo "completed"
    elif grep -q "\[!\] Task $task_num" "$PROGRESS_FILE" 2>/dev/null; then
        echo "blocked"
    elif grep -q "\[-\] Task $task_num" "$PROGRESS_FILE" 2>/dev/null; then
        echo "skipped"
    else
        echo "pending"
    fi
}

reset_task_to_pending() {
    local task_num="$1"
    # Reset blocked task back to pending for retry
    # Match various blocked formats and reset to clean pending state
    sed -i "s/- \[!\] Task $task_num.*/- [ ] Task $task_num/" "$PROGRESS_FILE"
    # Also need to restore the task description - read from original or use generic
    # For simplicity, we'll preserve the description by being more careful with sed
}

reset_blocked_task() {
    local task_num="$1"
    local task_desc=$(grep "Task $task_num" "$PROGRESS_FILE" | head -1 | sed 's/.*Task [0-9.]*[^-]*- //' | sed 's/ (blocked.*//')

    # If we couldn't extract description, check the plan file
    if [ -z "$task_desc" ] || [ "$task_desc" = "" ]; then
        task_desc=$(grep "Task $task_num:" "$PLAN_FILE" | head -1 | sed 's/.*Task [0-9.]*: //')
    fi

    # Reset the task line
    sed -i "s/- \[!\] Task $task_num.*/- [ ] Task $task_num - $task_desc/" "$PROGRESS_FILE"
}

get_next_task() {
    # First, look for pending tasks
    for task in "${TASKS[@]}"; do
        if [ "$(get_task_status "$task")" = "pending" ]; then
            echo "$task"
            return
        fi
    done

    # If no pending, look for blocked tasks that can be retried
    for task in "${TASKS[@]}"; do
        if [ "$(get_task_status "$task")" = "blocked" ]; then
            local retries=${task_retries[$task]:-0}
            if [ $retries -lt $MAX_RETRIES_PER_TASK ]; then
                echo "$task"
                return
            fi
        fi
    done

    echo ""
}

get_stats() {
    local completed=$(grep -c "^- \[x\]" "$PROGRESS_FILE" 2>/dev/null || echo "0")
    local blocked=$(grep -c "^- \[!\]" "$PROGRESS_FILE" 2>/dev/null || echo "0")
    local skipped=$(grep -c "^- \[-\]" "$PROGRESS_FILE" 2>/dev/null || echo "0")
    local pending=$(grep -c "^- \[ \]" "$PROGRESS_FILE" 2>/dev/null || echo "0")
    echo "$completed $blocked $skipped $pending"
}

print_header() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║       ${BOLD}Backtrack E2E Multi-User Test Runner (AUTOMATED)${NC}${GREEN}            ║${NC}"
    echo -e "${GREEN}╠════════════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${GREEN}║${NC}  Max retries per task: ${CYAN}$MAX_RETRIES_PER_TASK${NC}                                   ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}  Max consecutive failures: ${CYAN}$MAX_CONSECUTIVE_FAILURES${NC}                             ${GREEN}║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_task_header() {
    local task="$1"
    local attempt="$2"
    local max="$3"

    read completed blocked skipped pending <<< $(get_stats)
    local total=${#TASKS[@]}

    echo ""
    echo -e "${CYAN}══════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}${YELLOW}  TASK $task${NC} ${MAGENTA}(Attempt $attempt/$max)${NC}"
    echo -e "${CYAN}──────────────────────────────────────────────────────────────────────${NC}"
    echo -e "  Progress: ${GREEN}$completed completed${NC} | ${YELLOW}$blocked blocked${NC} | ${NC}$pending pending${NC}"
    echo -e "  Total: $((completed + blocked + skipped))/$total tasks processed"
    echo -e "${CYAN}══════════════════════════════════════════════════════════════════════${NC}"
    echo ""
}

print_summary() {
    echo ""
    echo -e "${GREEN}══════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}${GREEN}                        TEST RUN COMPLETE${NC}"
    echo -e "${GREEN}══════════════════════════════════════════════════════════════════════${NC}"

    read completed blocked skipped pending <<< $(get_stats)

    echo ""
    echo -e "  ${GREEN}✓ Completed:${NC}  $completed"
    echo -e "  ${YELLOW}! Blocked:${NC}    $blocked"
    echo -e "  ${CYAN}- Skipped:${NC}    $skipped"
    echo -e "  ${NC}○ Pending:${NC}    $pending"
    echo ""
    echo -e "  ${BOLD}Review files:${NC}"
    echo -e "    - $PROGRESS_FILE"
    echo -e "    - $ISSUES_FILE"
    echo -e "    - $IMPROVEMENTS_FILE"
    echo ""
}

run_task() {
    local task="$1"
    local attempt="$2"
    local date_str=$(date +"%Y-%m-%d %H:%M")

    # Build the prompt - much more explicit about progress updates
    local prompt="You are executing E2E test Task $task for the Backtrack app.

=== CRITICAL: YOU MUST UPDATE PROGRESS ===
At the END of this task, you MUST use the Edit tool to update $PROGRESS_FILE.
If you complete the task: change \"- [ ] Task $task\" to \"- [x] Task $task (completed $date_str)\"
If you cannot complete it: change \"- [ ] Task $task\" to \"- [!] Task $task (blocked $date_str - REASON)\"
FAILURE TO UPDATE PROGRESS WILL CAUSE THE AUTOMATION TO FAIL.

=== EXECUTION STEPS ===
1. FIRST: Read Task $task details from $PLAN_FILE to understand what to do
2. THEN: Verify device with mobile_list_available_devices (if no device, mark blocked and update progress)
3. Execute ALL steps specified in the task
4. Take screenshots as specified, save to e2e_screenshots/
5. If issues found: append to $ISSUES_FILE (don't overwrite existing content)
6. If improvements identified: append to $IMPROVEMENTS_FILE (don't overwrite)
7. FINALLY: Update $PROGRESS_FILE with completion status (MANDATORY - DO THIS LAST)

=== RULES ===
- Work autonomously - make reasonable decisions, don't ask questions
- This is attempt $attempt of $MAX_RETRIES_PER_TASK
- If MCP device unavailable, immediately mark task as blocked and update progress
- Use TodoWrite to track your sub-steps if needed

=== REMINDER ===
YOUR FINAL ACTION MUST BE: Edit $PROGRESS_FILE to mark Task $task as completed or blocked.
Do not finish without updating progress!

Begin execution now."

    # Run Claude with streaming JSON output, parse with Node.js and display in real-time
    echo -e "${MAGENTA}>>> Starting Claude for Task $task...${NC}"
    echo ""

    # Use stream-json format and parse with node to show assistant messages and tool usage
    claude --dangerously-skip-permissions -p "$prompt" --output-format stream-json 2>&1 | node -e "
const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin });

rl.on('line', (line) => {
    if (!line.trim()) return;
    try {
        const data = JSON.parse(line);
        if (data.type === 'assistant' && data.message?.content) {
            for (const block of data.message.content) {
                if (block.type === 'text' && block.text) {
                    console.log('\x1b[36m' + block.text + '\x1b[0m');
                }
                if (block.type === 'tool_use' && block.name) {
                    console.log('\x1b[33m[Tool: ' + block.name + ']\x1b[0m');
                }
            }
        } else if (data.type === 'result') {
            console.log('\x1b[32m[Task completed]\x1b[0m');
        }
    } catch (e) {
        // Not JSON or parse error, skip
    }
});
"
    local exit_code=${PIPESTATUS[0]}

    echo ""
    echo -e "${MAGENTA}<<< Claude finished (exit code: $exit_code)${NC}"

    return $exit_code
}

# Main execution
print_header

consecutive_failures=0

while true; do
    next_task=$(get_next_task)

    if [ -z "$next_task" ]; then
        log_success "All tasks processed!"
        break
    fi

    # Get current status and retry count
    current_status=$(get_task_status "$next_task")
    retries=${task_retries[$next_task]:-0}
    attempt=$((retries + 1))

    # If task is blocked, reset it for retry
    if [ "$current_status" = "blocked" ]; then
        log_warning "Task $next_task was blocked - retrying (attempt $attempt/$MAX_RETRIES_PER_TASK)"
        reset_blocked_task "$next_task"
        sleep $RETRY_DELAY_SECONDS
    fi

    print_task_header "$next_task" "$attempt" "$MAX_RETRIES_PER_TASK"

    # Run the task
    if run_task "$next_task" "$attempt"; then
        sleep 2  # Brief pause for file writes

        new_status=$(get_task_status "$next_task")

        if [ "$new_status" = "completed" ]; then
            log_success "Task $next_task completed successfully!"
            consecutive_failures=0
            unset task_retries[$next_task]
        elif [ "$new_status" = "blocked" ]; then
            log_warning "Task $next_task was marked as blocked"
            task_retries[$next_task]=$attempt
            ((consecutive_failures++))
        else
            log_error "Task $next_task did not update progress - marking as blocked"
            date_str=$(date +"%Y-%m-%d %H:%M")
            sed -i "s/- \[ \] Task $next_task.*/- [!] Task $next_task (blocked $date_str - no progress update)/" "$PROGRESS_FILE"
            task_retries[$next_task]=$attempt
            ((consecutive_failures++))
        fi
    else
        log_error "Claude exited with error for task $next_task"
        date_str=$(date +"%Y-%m-%d %H:%M")

        # Check if task is still pending (Claude crashed before updating)
        if [ "$(get_task_status "$next_task")" = "pending" ]; then
            sed -i "s/- \[ \] Task $next_task.*/- [!] Task $next_task (blocked $date_str - execution error)/" "$PROGRESS_FILE"
        fi

        task_retries[$next_task]=$attempt
        ((consecutive_failures++))
    fi

    # Check for too many consecutive failures
    if [ $consecutive_failures -ge $MAX_CONSECUTIVE_FAILURES ]; then
        echo ""
        log_error "Stopping: $MAX_CONSECUTIVE_FAILURES consecutive failures/blocks"
        log_info "You can restart the script to continue from where it left off"
        break
    fi

    # Brief pause between tasks
    sleep 2
done

print_summary
