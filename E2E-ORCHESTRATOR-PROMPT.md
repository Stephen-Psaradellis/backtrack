# E2E Test Orchestrator

## Automated Scripts (Recommended)

Run the fully automated test suite - each task gets a fresh Claude instance:

**PowerShell (Windows):**
```powershell
.\run-e2e-tests-auto.ps1
```

**Bash (Git Bash/WSL/Linux):**
```bash
chmod +x run-e2e-tests-auto.sh
./run-e2e-tests-auto.sh
```

### How It Works

1. Script finds next pending task from `E2E-MULTI-USER-PROGRESS.md`
2. Spawns a **new Claude instance** with `claude --yes --dangerously-skip-permissions -p "..."`
3. Claude executes the task autonomously
4. Claude updates progress file when done (marks `[x]` completed or `[!]` blocked)
5. Script detects the update and moves to next task
6. Repeats until all tasks done or 5 consecutive failures

### Features

- **Fresh context per task** - no context overflow
- **Auto-recovery** - continues after blocked tasks
- **Progress tracking** - updates `E2E-MULTI-USER-PROGRESS.md` in real-time
- **Safety stop** - halts after 5 consecutive failures
- **Resumable** - restart script to continue from where you left off

---

## Manual Alternatives

### Run Single Task

```
Execute Task {X.Y} from E2E-MULTI-USER-TEST-PLAN.md.
Follow all steps, take screenshots, update E2E-MULTI-USER-PROGRESS.md when done.
```

### Run Single Phase

```
Run all tasks in Phase {N} from E2E-MULTI-USER-TEST-PLAN.md sequentially.
For each task: execute steps, update progress, then continue to next.
```

### Interactive Mode

Use `run-e2e-tests.ps1` or `run-e2e-tests.sh` for manual control between tasks.
