# E2E Multi-User Testing Issues

This document tracks issues discovered during multi-user E2E testing of Backtrack.

## Issue Template

```markdown
## [ISSUE-XXX] Brief Title
- **Severity**: Critical/High/Medium/Low
- **Feature**: Which feature is affected
- **Task Reference**: Which test task discovered this (e.g., Task 3.2)
- **Steps to Reproduce**:
  1. Step one
  2. Step two
  3. ...
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happened
- **Screenshots**:
  - `e2e_screenshots/issue_xxx_*.png`
- **Relevant Code**:
  - `path/to/file.ts:line_number`
- **Notes**: Additional context or observations
```

---

## Severity Definitions

| Severity | Description | Examples |
|----------|-------------|----------|
| **Critical** | App crashes, data loss, security issues | Crash on message send, messages lost, auth bypass |
| **High** | Feature completely broken, blocks user flow | Can't start conversation, messages don't arrive |
| **Medium** | Feature partially works, workaround exists | Read receipts delayed, sorting occasionally wrong |
| **Low** | Minor UI issue, edge case, polish | Animation glitch, typo, rare edge case |

---

## Issues Log

<!-- Add issues below as they are discovered -->

## [ISSUE-001] MCP Cannot Detect Running Android Emulator
- **Severity**: High
- **Feature**: Test Infrastructure / E2E Testing
- **Task Reference**: Task 0.2
- **Steps to Reproduce**:
  1. Android emulator is running (confirmed via `tasklist | grep emulator`)
  2. ADB daemon is running on port 5037 with 100+ established connections
  3. Call `mobile_list_available_devices` via MCP
- **Expected Behavior**: MCP should return the emulator device (emulator-5554)
- **Actual Behavior**: MCP returns `{"devices":[]}` - empty array
- **Screenshots**:
  - N/A (no device available to take screenshot)
- **Relevant Code**:
  - MCP mobile-mcp server configuration
  - ADB daemon connection handling
- **Notes**:
  - ADB commands from bash also fail with "could not read ok from ADB Server"
  - Emulator process (qemu-system-x86_64.exe) and emulator.exe are both running
  - Port 5037 shows many ESTABLISHED connections (possible connection exhaustion)
  - May require restarting ADB server (`adb kill-server && adb start-server`) or restarting the emulator
  - This blocks all E2E testing that requires device interaction

---

## Summary Statistics

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 1 |
| Medium | 0 |
| Low | 0 |
| **Total** | **1** |

---

## Issues by Feature

| Feature | Issue Count |
|---------|-------------|
| Post Creation | 0 |
| Post Discovery | 0 |
| Avatar Matching | 0 |
| Conversations | 0 |
| Messaging | 0 |
| Read Receipts | 0 |
| Photo Sharing | 0 |
| Blocking | 0 |
| Reporting | 0 |
| Notifications | 0 |
| Chat List | 0 |
| Other | 1 |
