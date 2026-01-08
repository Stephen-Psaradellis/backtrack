# E2E Multi-User Test Runner - FULLY AUTOMATED
# Each task runs in a fresh Claude instance that updates progress when done

$ErrorActionPreference = "Continue"

$PLAN_FILE = "E2E-MULTI-USER-TEST-PLAN.md"
$PROGRESS_FILE = "E2E-MULTI-USER-PROGRESS.md"
$ISSUES_FILE = "E2E-MULTI-USER-ISSUES.md"
$IMPROVEMENTS_FILE = "E2E-MULTI-USER-IMPROVEMENTS.md"

# All tasks in order
$TASKS = @(
    "0.1", "0.2", "0.3",
    "1.1", "1.2", "1.3",
    "2.1", "2.2",
    "3.1", "3.2", "3.3", "3.4",
    "4.1", "4.2",
    "5.1", "5.2", "5.3", "5.4", "5.5",
    "6.1", "6.2", "6.3",
    "7.1", "7.2", "7.3",
    "8.1", "8.2",
    "9.1",
    "10.1", "10.2", "10.3", "10.4",
    "11.1", "11.2",
    "12.1", "12.2"
)

function Get-TaskStatus {
    param ([string]$TaskNum)
    $content = Get-Content $PROGRESS_FILE -Raw
    if ($content -match "\[x\] Task $TaskNum") { return "completed" }
    if ($content -match "\[!\] Task $TaskNum") { return "blocked" }
    if ($content -match "\[-\] Task $TaskNum") { return "skipped" }
    return "pending"
}

function Get-NextPendingTask {
    foreach ($task in $TASKS) {
        if ((Get-TaskStatus $task) -eq "pending") {
            return $task
        }
    }
    return $null
}

function Get-Stats {
    $content = Get-Content $PROGRESS_FILE -Raw
    return @{
        Completed = ([regex]::Matches($content, "\[x\]")).Count
        Blocked = ([regex]::Matches($content, "\[!\]")).Count
        Skipped = ([regex]::Matches($content, "\[-\]")).Count
        Pending = ([regex]::Matches($content, "\[ \]")).Count
    }
}

# Header
Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║     Backtrack E2E Multi-User Test Runner (AUTOMATED)         ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

$consecutiveFailures = 0
$maxFailures = 5

while ($true) {
    $nextTask = Get-NextPendingTask

    if (-not $nextTask) {
        Write-Host "All tasks processed!" -ForegroundColor Green
        break
    }

    $stats = Get-Stats
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "Running Task $nextTask" -ForegroundColor Yellow
    Write-Host "Progress: $($stats.Completed) completed, $($stats.Blocked) blocked, $($stats.Pending) pending" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""

    $dateStr = Get-Date -Format "yyyy-MM-dd HH:mm"

    # Build the prompt - much more explicit about progress updates
    $prompt = @"
You are executing E2E test Task $nextTask for the Backtrack app.

=== CRITICAL: YOU MUST UPDATE PROGRESS ===
At the END of this task, you MUST use the Edit tool to update E2E-MULTI-USER-PROGRESS.md.
If you complete the task: change "- [ ] Task $nextTask" to "- [x] Task $nextTask (completed $dateStr)"
If you cannot complete it: change "- [ ] Task $nextTask" to "- [!] Task $nextTask (blocked $dateStr - REASON)"
FAILURE TO UPDATE PROGRESS WILL CAUSE THE AUTOMATION TO FAIL.

=== EXECUTION STEPS ===
1. FIRST: Read Task $nextTask details from E2E-MULTI-USER-TEST-PLAN.md to understand what to do
2. THEN: Verify device with mobile_list_available_devices (if no device, mark blocked and update progress)
3. Execute ALL steps specified in the task
4. Take screenshots as specified, save to e2e_screenshots/
5. If issues found: append to E2E-MULTI-USER-ISSUES.md (don't overwrite existing content)
6. If improvements identified: append to E2E-MULTI-USER-IMPROVEMENTS.md (don't overwrite)
7. FINALLY: Update E2E-MULTI-USER-PROGRESS.md with completion status (MANDATORY - DO THIS LAST)

=== RULES ===
- Work autonomously - make reasonable decisions, don't ask questions
- If MCP device unavailable, immediately mark task as blocked and update progress
- Use TodoWrite to track your sub-steps if needed

=== REMINDER ===
YOUR FINAL ACTION MUST BE: Edit E2E-MULTI-USER-PROGRESS.md to mark Task $nextTask as completed or blocked.
Do not finish without updating progress!

Begin execution now.
"@

    # Run Claude with streaming JSON output for real-time visibility
    try {
        # Use stream-json format and parse to show assistant messages and tool usage
        & claude --dangerously-skip-permissions -p $prompt --output-format stream-json 2>&1 | ForEach-Object {
            $line = $_
            if ([string]::IsNullOrWhiteSpace($line)) { return }
            try {
                $data = $line | ConvertFrom-Json -ErrorAction Stop
                if ($data.type -eq "assistant" -and $data.message.content) {
                    foreach ($block in $data.message.content) {
                        if ($block.type -eq "text" -and $block.text) {
                            Write-Host $block.text -ForegroundColor Cyan
                        }
                        if ($block.type -eq "tool_use" -and $block.name) {
                            Write-Host "[Tool: $($block.name)]" -ForegroundColor Yellow
                        }
                    }
                } elseif ($data.type -eq "result") {
                    Write-Host "[Task completed]" -ForegroundColor Green
                }
            } catch {
                # Not JSON or parse error, skip
            }
        }

        # Check if task was updated
        Start-Sleep -Seconds 2  # Brief pause for file writes
        $newStatus = Get-TaskStatus $nextTask

        if ($newStatus -eq "completed") {
            Write-Host "✓ Task $nextTask completed successfully" -ForegroundColor Green
            $consecutiveFailures = 0
        }
        elseif ($newStatus -eq "blocked") {
            Write-Host "! Task $nextTask was blocked" -ForegroundColor Yellow
            $consecutiveFailures++
        }
        else {
            # Task didn't update progress - mark as blocked
            Write-Host "? Task $nextTask did not update progress - marking as blocked" -ForegroundColor Red
            $content = Get-Content $PROGRESS_FILE -Raw
            $content = $content -replace "- \[ \] Task $nextTask", "- [!] Task $nextTask (blocked $dateStr - no progress update)"
            Set-Content $PROGRESS_FILE -Value $content -NoNewline
            $consecutiveFailures++
        }
    }
    catch {
        Write-Host "Error running task $nextTask`: $_" -ForegroundColor Red
        $content = Get-Content $PROGRESS_FILE -Raw
        $content = $content -replace "- \[ \] Task $nextTask", "- [!] Task $nextTask (blocked $dateStr - execution error)"
        Set-Content $PROGRESS_FILE -Value $content -NoNewline
        $consecutiveFailures++
    }

    # Safety stop after too many failures
    if ($consecutiveFailures -ge $maxFailures) {
        Write-Host ""
        Write-Host "Stopping: $maxFailures consecutive failures/blocks" -ForegroundColor Red
        break
    }
}

# Final summary
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "TEST RUN COMPLETE" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
$stats = Get-Stats
Write-Host "  Completed: $($stats.Completed)" -ForegroundColor Green
Write-Host "  Blocked:   $($stats.Blocked)" -ForegroundColor Yellow
Write-Host "  Skipped:   $($stats.Skipped)" -ForegroundColor Cyan
Write-Host "  Pending:   $($stats.Pending)" -ForegroundColor Gray
Write-Host ""
Write-Host "Review:"
Write-Host "  - $PROGRESS_FILE"
Write-Host "  - $ISSUES_FILE"
Write-Host "  - $IMPROVEMENTS_FILE"
