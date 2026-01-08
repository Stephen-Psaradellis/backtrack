# E2E Multi-User Test Runner for Backtrack (PowerShell)
# Run with: .\run-e2e-tests.ps1

$ErrorActionPreference = "Stop"

$PLAN_FILE = "E2E-MULTI-USER-TEST-PLAN.md"
$PROGRESS_FILE = "E2E-MULTI-USER-PROGRESS.md"
$ISSUES_FILE = "E2E-MULTI-USER-ISSUES.md"
$IMPROVEMENTS_FILE = "E2E-MULTI-USER-IMPROVEMENTS.md"

# Define all tasks as objects
$TASKS = @(
    @{ Num = "0.1"; Name = "Environment Verification"; Phase = "Phase 0: Pre-Test Setup" }
    @{ Num = "0.2"; Name = "User 1 Login and Profile Verification"; Phase = "Phase 0: Pre-Test Setup" }
    @{ Num = "0.3"; Name = "User 2 State Verification"; Phase = "Phase 0: Pre-Test Setup" }
    @{ Num = "1.1"; Name = "Create Post as User 1 (Producer Flow)"; Phase = "Phase 1: Post Creation and Discovery" }
    @{ Num = "1.2"; Name = "Discover Post as User 2 (Consumer Flow)"; Phase = "Phase 1: Post Creation and Discovery" }
    @{ Num = "1.3"; Name = "Verify Match Algorithm Accuracy"; Phase = "Phase 1: Post Creation and Discovery" }
    @{ Num = "2.1"; Name = "Start Conversation from Post"; Phase = "Phase 2: Conversation Creation" }
    @{ Num = "2.2"; Name = "Verify Conversation in Chat List"; Phase = "Phase 2: Conversation Creation" }
    @{ Num = "3.1"; Name = "Send Message as Producer (User 1)"; Phase = "Phase 3: Real-time Messaging" }
    @{ Num = "3.2"; Name = "Receive Message as Consumer (User 2)"; Phase = "Phase 3: Real-time Messaging" }
    @{ Num = "3.3"; Name = "Bidirectional Messaging Flow"; Phase = "Phase 3: Real-time Messaging" }
    @{ Num = "3.4"; Name = "Real-time Message Delivery Test"; Phase = "Phase 3: Real-time Messaging" }
    @{ Num = "4.1"; Name = "Verify Read Receipt Updates"; Phase = "Phase 4: Message Read Receipts" }
    @{ Num = "4.2"; Name = "Unread Count in Chat List"; Phase = "Phase 4: Message Read Receipts" }
    @{ Num = "5.1"; Name = "Verify Profile Photo Prerequisites"; Phase = "Phase 5: Photo Sharing" }
    @{ Num = "5.2"; Name = "Share Photo in Conversation"; Phase = "Phase 5: Photo Sharing" }
    @{ Num = "5.3"; Name = "Receive Shared Photo"; Phase = "Phase 5: Photo Sharing" }
    @{ Num = "5.4"; Name = "Unshare Photo"; Phase = "Phase 5: Photo Sharing" }
    @{ Num = "5.5"; Name = "Photo Sharing Edge Cases"; Phase = "Phase 5: Photo Sharing" }
    @{ Num = "6.1"; Name = "Block User from Chat"; Phase = "Phase 6: User Blocking" }
    @{ Num = "6.2"; Name = "Verify Block Effects"; Phase = "Phase 6: User Blocking" }
    @{ Num = "6.3"; Name = "Block from Post Detail"; Phase = "Phase 6: User Blocking" }
    @{ Num = "7.1"; Name = "Chat List Sorting"; Phase = "Phase 7: Chat List Behavior" }
    @{ Num = "7.2"; Name = "Chat List Real-time Updates"; Phase = "Phase 7: Chat List Behavior" }
    @{ Num = "7.3"; Name = "Empty and Error States"; Phase = "Phase 7: Chat List Behavior" }
    @{ Num = "8.1"; Name = "Report a Message"; Phase = "Phase 8: Reporting System" }
    @{ Num = "8.2"; Name = "Report a User"; Phase = "Phase 8: Reporting System" }
    @{ Num = "9.1"; Name = "New Message Notification"; Phase = "Phase 9: Notification System" }
    @{ Num = "10.1"; Name = "Conversation with Deleted Post"; Phase = "Phase 10: Edge Cases and Error Handling" }
    @{ Num = "10.2"; Name = "Message Length Limits"; Phase = "Phase 10: Edge Cases and Error Handling" }
    @{ Num = "10.3"; Name = "Rapid Message Sending"; Phase = "Phase 10: Edge Cases and Error Handling" }
    @{ Num = "10.4"; Name = "Network Error Recovery"; Phase = "Phase 10: Edge Cases and Error Handling" }
    @{ Num = "11.1"; Name = "Full User Journey - Producer"; Phase = "Phase 11: Cross-Feature Integration" }
    @{ Num = "11.2"; Name = "Full User Journey - Consumer"; Phase = "Phase 11: Cross-Feature Integration" }
    @{ Num = "12.1"; Name = "Test Cleanup"; Phase = "Phase 12: Cleanup and Final Report" }
    @{ Num = "12.2"; Name = "Compile Final Report"; Phase = "Phase 12: Cleanup and Final Report" }
)

function Write-ColorText {
    param (
        [string]$Text,
        [string]$Color = "White"
    )
    Write-Host $Text -ForegroundColor $Color
}

function Update-Progress {
    param (
        [string]$TaskNum,
        [string]$Status
    )

    $dateStr = Get-Date -Format "yyyy-MM-dd"
    $content = Get-Content $PROGRESS_FILE -Raw

    switch ($Status) {
        "completed" {
            $content = $content -replace "- \[ \] Task $TaskNum", "- [x] Task $TaskNum (completed $dateStr)"
        }
        "skipped" {
            $content = $content -replace "- \[ \] Task $TaskNum", "- [-] Task $TaskNum (skipped $dateStr)"
        }
        "blocked" {
            $content = $content -replace "- \[ \] Task $TaskNum", "- [!] Task $TaskNum (blocked $dateStr)"
        }
    }

    Set-Content $PROGRESS_FILE -Value $content -NoNewline
}

function Test-TaskDone {
    param ([string]$TaskNum)

    $content = Get-Content $PROGRESS_FILE -Raw
    return $content -match "\[x\] Task $TaskNum"
}

function Invoke-Task {
    param (
        [string]$TaskNum,
        [string]$TaskName,
        [string]$Phase
    )

    Write-Host ""
    Write-ColorText "=================================================================" "Cyan"
    Write-ColorText "Task $TaskNum`: $TaskName" "Yellow"
    Write-ColorText $Phase "Cyan"
    Write-ColorText "=================================================================" "Cyan"
    Write-Host ""

    # Check if already completed
    if (Test-TaskDone $TaskNum) {
        Write-ColorText "✓ Task already completed. Skipping." "Green"
        return "continue"
    }

    Write-Host "Options:"
    Write-Host "  [Enter] Run this task"
    Write-Host "  [s]     Skip this task"
    Write-Host "  [b]     Mark as blocked (has dependencies/issues)"
    Write-Host "  [q]     Quit test runner"
    Write-Host "  [j]     Jump to specific task number"
    Write-Host ""

    $choice = Read-Host "Choice"

    switch ($choice.ToLower()) {
        "s" {
            Write-ColorText "Skipping task $TaskNum" "Yellow"
            Update-Progress $TaskNum "skipped"
            return "continue"
        }
        "b" {
            Write-ColorText "Marking task $TaskNum as blocked" "Red"
            Update-Progress $TaskNum "blocked"
            return "continue"
        }
        "q" {
            Write-ColorText "Exiting test runner." "Yellow"
            return "quit"
        }
        "j" {
            $jumpTo = Read-Host "Enter task number to jump to (e.g., 3.1)"
            return "jump:$jumpTo"
        }
        default {
            # Run the task with Claude
            Write-Host ""
            Write-ColorText "Starting Claude for Task $TaskNum..." "Green"
            Write-Host ""

            $prompt = @"
Execute Task $TaskNum from $PLAN_FILE.

INSTRUCTIONS:
1. Read the task details from the plan file
2. Follow all steps exactly as specified
3. Take screenshots as specified and save to e2e_screenshots/
4. Document any issues found in $ISSUES_FILE
5. Document any improvement suggestions in $IMPROVEMENTS_FILE
6. Report success/failure and key findings when done

IMPORTANT:
- Use the MCP mobile tools for device interaction
- Device ID is likely 'emulator-5554' - verify with mobile_list_available_devices first
- Be thorough but focused on this specific task only
- If prerequisites from previous tasks are missing, note this and do your best
"@

            # Run Claude with the prompt
            & claude $prompt

            Write-Host ""
            Write-ColorText "Task $TaskNum session ended." "Cyan"
            Write-Host ""

            $result = Read-Host "Mark task as [c]ompleted, [b]locked, or [r]etry?"

            switch ($result.ToLower()) {
                "c" {
                    Update-Progress $TaskNum "completed"
                    Write-ColorText "✓ Task $TaskNum marked as completed" "Green"
                }
                "b" {
                    Update-Progress $TaskNum "blocked"
                    Write-ColorText "Task $TaskNum marked as blocked" "Red"
                }
                default {
                    Write-ColorText "Task $TaskNum will be retried next run" "Yellow"
                }
            }
            return "continue"
        }
    }
}

# Main execution
Write-Host ""
Write-ColorText "╔═══════════════════════════════════════════════════════════════╗" "Green"
Write-ColorText "║        Backtrack E2E Multi-User Test Runner                   ║" "Green"
Write-ColorText "╚═══════════════════════════════════════════════════════════════╝" "Green"
Write-Host ""
Write-Host "Plan file: $PLAN_FILE"
Write-Host "Progress tracking: $PROGRESS_FILE"
Write-Host "Total tasks: $($TASKS.Count)"
Write-Host ""

# Check if progress file exists
if (-not (Test-Path $PROGRESS_FILE)) {
    Write-ColorText "Error: Progress file not found at $PROGRESS_FILE" "Red"
    Write-Host "Please ensure E2E-MULTI-USER-PROGRESS.md exists."
    exit 1
}

# Count completed tasks
$content = Get-Content $PROGRESS_FILE -Raw
$completed = ([regex]::Matches($content, "\[x\]")).Count
Write-Host "Completed: " -NoNewline
Write-ColorText "$completed" "Green" -NoNewline
Write-Host " / $($TASKS.Count)"
Write-Host ""

# Option to start from specific task
$startFrom = Read-Host "Start from beginning? [Enter=yes, or enter task number like 3.1]"

$startIndex = 0
if ($startFrom) {
    for ($i = 0; $i -lt $TASKS.Count; $i++) {
        if ($TASKS[$i].Num -eq $startFrom) {
            $startIndex = $i
            break
        }
    }
}

# Iterate through tasks
$jumpTarget = $null
$i = $startIndex

while ($i -lt $TASKS.Count) {
    $task = $TASKS[$i]

    # Handle jump request
    if ($jumpTarget) {
        if ($task.Num -eq $jumpTarget) {
            $jumpTarget = $null
        } else {
            $i++
            continue
        }
    }

    $result = Invoke-Task -TaskNum $task.Num -TaskName $task.Name -Phase $task.Phase

    if ($result -eq "quit") {
        break
    }
    elseif ($result -match "^jump:(.+)$") {
        $jumpTarget = $Matches[1]
        $i = 0
        continue
    }

    $i++
}

Write-Host ""
Write-ColorText "=================================================================" "Green"
Write-ColorText "All tasks processed!" "Green"
Write-Host ""

# Final statistics
$content = Get-Content $PROGRESS_FILE -Raw
$completed = ([regex]::Matches($content, "\[x\]")).Count
$skipped = ([regex]::Matches($content, "\[-\]")).Count
$blocked = ([regex]::Matches($content, "\[!\]")).Count

Write-Host "Final statistics:"
Write-Host "  Completed: " -NoNewline; Write-ColorText "$completed" "Green"
Write-Host "  Skipped:   " -NoNewline; Write-ColorText "$skipped" "Yellow"
Write-Host "  Blocked:   " -NoNewline; Write-ColorText "$blocked" "Red"
Write-Host ""
Write-Host "Review results in:"
Write-Host "  - $ISSUES_FILE"
Write-Host "  - $IMPROVEMENTS_FILE"
Write-Host "  - $PROGRESS_FILE"
