#!/bin/bash
# E2E Multi-User Test Runner for Backtrack
# This script iterates through all E2E test tasks, prompting before each one.

set -e

PLAN_FILE="E2E-MULTI-USER-TEST-PLAN.md"
PROGRESS_FILE="E2E-MULTI-USER-PROGRESS.md"
ISSUES_FILE="E2E-MULTI-USER-ISSUES.md"
IMPROVEMENTS_FILE="E2E-MULTI-USER-IMPROVEMENTS.md"

# Define all tasks
declare -a TASKS=(
  "0.1|Environment Verification|Phase 0: Pre-Test Setup"
  "0.2|User 1 Login and Profile Verification|Phase 0: Pre-Test Setup"
  "0.3|User 2 State Verification|Phase 0: Pre-Test Setup"
  "1.1|Create Post as User 1 (Producer Flow)|Phase 1: Post Creation and Discovery"
  "1.2|Discover Post as User 2 (Consumer Flow)|Phase 1: Post Creation and Discovery"
  "1.3|Verify Match Algorithm Accuracy|Phase 1: Post Creation and Discovery"
  "2.1|Start Conversation from Post|Phase 2: Conversation Creation"
  "2.2|Verify Conversation in Chat List|Phase 2: Conversation Creation"
  "3.1|Send Message as Producer (User 1)|Phase 3: Real-time Messaging"
  "3.2|Receive Message as Consumer (User 2)|Phase 3: Real-time Messaging"
  "3.3|Bidirectional Messaging Flow|Phase 3: Real-time Messaging"
  "3.4|Real-time Message Delivery Test|Phase 3: Real-time Messaging"
  "4.1|Verify Read Receipt Updates|Phase 4: Message Read Receipts"
  "4.2|Unread Count in Chat List|Phase 4: Message Read Receipts"
  "5.1|Verify Profile Photo Prerequisites|Phase 5: Photo Sharing"
  "5.2|Share Photo in Conversation|Phase 5: Photo Sharing"
  "5.3|Receive Shared Photo|Phase 5: Photo Sharing"
  "5.4|Unshare Photo|Phase 5: Photo Sharing"
  "5.5|Photo Sharing Edge Cases|Phase 5: Photo Sharing"
  "6.1|Block User from Chat|Phase 6: User Blocking"
  "6.2|Verify Block Effects|Phase 6: User Blocking"
  "6.3|Block from Post Detail|Phase 6: User Blocking"
  "7.1|Chat List Sorting|Phase 7: Chat List Behavior"
  "7.2|Chat List Real-time Updates|Phase 7: Chat List Behavior"
  "7.3|Empty and Error States|Phase 7: Chat List Behavior"
  "8.1|Report a Message|Phase 8: Reporting System"
  "8.2|Report a User|Phase 8: Reporting System"
  "9.1|New Message Notification|Phase 9: Notification System"
  "10.1|Conversation with Deleted Post|Phase 10: Edge Cases and Error Handling"
  "10.2|Message Length Limits|Phase 10: Edge Cases and Error Handling"
  "10.3|Rapid Message Sending|Phase 10: Edge Cases and Error Handling"
  "10.4|Network Error Recovery|Phase 10: Edge Cases and Error Handling"
  "11.1|Full User Journey - Producer|Phase 11: Cross-Feature Integration"
  "11.2|Full User Journey - Consumer|Phase 11: Cross-Feature Integration"
  "12.1|Test Cleanup|Phase 12: Cleanup and Final Report"
  "12.2|Compile Final Report|Phase 12: Cleanup and Final Report"
)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to update progress file
update_progress() {
  local task_num="$1"
  local status="$2"
  local date_str=$(date +%Y-%m-%d)

  if [ "$status" = "completed" ]; then
    # Mark task as completed in progress file
    sed -i "s/- \[ \] Task ${task_num}/- [x] Task ${task_num} (completed ${date_str})/" "$PROGRESS_FILE"
  elif [ "$status" = "skipped" ]; then
    sed -i "s/- \[ \] Task ${task_num}/- [-] Task ${task_num} (skipped ${date_str})/" "$PROGRESS_FILE"
  elif [ "$status" = "blocked" ]; then
    sed -i "s/- \[ \] Task ${task_num}/- [!] Task ${task_num} (blocked ${date_str})/" "$PROGRESS_FILE"
  fi
}

# Function to check if task is already done
is_task_done() {
  local task_num="$1"
  grep -q "\[x\] Task ${task_num}" "$PROGRESS_FILE" 2>/dev/null
}

# Function to run a single task
run_task() {
  local task_num="$1"
  local task_name="$2"
  local phase="$3"

  echo ""
  echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
  echo -e "${YELLOW}Task ${task_num}: ${task_name}${NC}"
  echo -e "${BLUE}${phase}${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
  echo ""

  # Check if already completed
  if is_task_done "$task_num"; then
    echo -e "${GREEN}✓ Task already completed. Skipping.${NC}"
    return 0
  fi

  echo "Options:"
  echo "  [Enter] Run this task"
  echo "  [s]     Skip this task"
  echo "  [b]     Mark as blocked (has dependencies/issues)"
  echo "  [q]     Quit test runner"
  echo "  [j]     Jump to specific task number"
  echo ""
  read -p "Choice: " choice

  case "$choice" in
    s|S)
      echo -e "${YELLOW}Skipping task ${task_num}${NC}"
      update_progress "$task_num" "skipped"
      return 0
      ;;
    b|B)
      echo -e "${RED}Marking task ${task_num} as blocked${NC}"
      update_progress "$task_num" "blocked"
      return 0
      ;;
    q|Q)
      echo -e "${YELLOW}Exiting test runner.${NC}"
      exit 0
      ;;
    j|J)
      read -p "Enter task number to jump to (e.g., 3.1): " jump_to
      return 2  # Special return code for jump
      ;;
    *)
      # Run the task with Claude
      echo ""
      echo -e "${GREEN}Starting Claude for Task ${task_num}...${NC}"
      echo ""

      PROMPT="Execute Task ${task_num} from ${PLAN_FILE}.

INSTRUCTIONS:
1. Read the task details from the plan file
2. Follow all steps exactly as specified
3. Take screenshots as specified and save to e2e_screenshots/
4. Document any issues found in ${ISSUES_FILE}
5. Document any improvement suggestions in ${IMPROVEMENTS_FILE}
6. Report success/failure and key findings when done

IMPORTANT:
- Use the MCP mobile tools for device interaction
- Device ID is likely 'emulator-5554' - verify with mobile_list_available_devices first
- Be thorough but focused on this specific task only
- If prerequisites from previous tasks are missing, note this and do your best"

      # Run Claude with the prompt
      claude "$PROMPT"

      echo ""
      echo -e "${BLUE}Task ${task_num} session ended.${NC}"
      echo ""
      read -p "Mark task as [c]ompleted, [b]locked, or [r]etry? " result

      case "$result" in
        c|C)
          update_progress "$task_num" "completed"
          echo -e "${GREEN}✓ Task ${task_num} marked as completed${NC}"
          ;;
        b|B)
          update_progress "$task_num" "blocked"
          echo -e "${RED}Task ${task_num} marked as blocked${NC}"
          ;;
        *)
          echo -e "${YELLOW}Task ${task_num} will be retried next run${NC}"
          ;;
      esac
      return 0
      ;;
  esac
}

# Main execution
echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║        Backtrack E2E Multi-User Test Runner                   ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Plan file: ${PLAN_FILE}"
echo "Progress tracking: ${PROGRESS_FILE}"
echo "Total tasks: ${#TASKS[@]}"
echo ""

# Check if progress file exists
if [ ! -f "$PROGRESS_FILE" ]; then
  echo -e "${RED}Error: Progress file not found at ${PROGRESS_FILE}${NC}"
  echo "Please ensure E2E-MULTI-USER-PROGRESS.md exists."
  exit 1
fi

# Count completed tasks
completed=$(grep -c "\[x\]" "$PROGRESS_FILE" 2>/dev/null || echo "0")
echo -e "Completed: ${GREEN}${completed}${NC} / ${#TASKS[@]}"
echo ""

# Option to start from specific task
read -p "Start from beginning? [Enter=yes, or enter task number like 3.1]: " start_from

start_index=0
if [ -n "$start_from" ]; then
  for i in "${!TASKS[@]}"; do
    IFS='|' read -r num name phase <<< "${TASKS[$i]}"
    if [ "$num" = "$start_from" ]; then
      start_index=$i
      break
    fi
  done
fi

# Iterate through tasks
jump_target=""
i=$start_index
while [ $i -lt ${#TASKS[@]} ]; do
  IFS='|' read -r task_num task_name phase <<< "${TASKS[$i]}"

  # Handle jump request
  if [ -n "$jump_target" ]; then
    if [ "$task_num" = "$jump_target" ]; then
      jump_target=""
    else
      ((i++))
      continue
    fi
  fi

  run_task "$task_num" "$task_name" "$phase"
  result=$?

  if [ $result -eq 2 ]; then
    # Jump requested
    jump_target="$jump_to"
    i=0
    continue
  fi

  ((i++))
done

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}All tasks processed!${NC}"
echo ""
echo "Final statistics:"
completed=$(grep -c "\[x\]" "$PROGRESS_FILE" 2>/dev/null || echo "0")
skipped=$(grep -c "\[-\]" "$PROGRESS_FILE" 2>/dev/null || echo "0")
blocked=$(grep -c "\[!\]" "$PROGRESS_FILE" 2>/dev/null || echo "0")
echo -e "  Completed: ${GREEN}${completed}${NC}"
echo -e "  Skipped:   ${YELLOW}${skipped}${NC}"
echo -e "  Blocked:   ${RED}${blocked}${NC}"
echo ""
echo "Review results in:"
echo "  - ${ISSUES_FILE}"
echo "  - ${IMPROVEMENTS_FILE}"
echo "  - ${PROGRESS_FILE}"
