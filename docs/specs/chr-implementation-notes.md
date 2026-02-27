# CHR Implementation Notes - Q&A Clarifications

**Frozen from Feb 26, 2026 Q&A session. Capture critical decisions before experiments.**

## Critical Clarifications

### 1. Settings Scope: VERIFIED ✅

- **Correct:** `tikbook.baseUrl` is **USER-scoped** (global, not workspace)
- Verified: [src/config.ts](../../src/config.ts) line 20 uses `vsconf.get('baseUrl')` without workspace context
- Update spec: All "workspace settings" references should be "user settings"

### 2. CHR VM Identification Strategy

- **Experiment 1 must include:** Create actual test mikropkl CHR VM
- Document what makes it identifiable:
  - Name pattern
  - config.plist metadata
  - Description field
  - Other markers
- Result: Clear filtering criteria before Phase 1 implementation

### 3. Add CHR by Version: Two-Menu Flow

- **Menu 1:** Pick version ("7.21.3", "7.21.2", "7.22rc2")
- **Menu 2:** Show all available images for that version
  - Example: "aarch64 - Apple Virtualization", "aarch64 - QEMU", "x86_64 - Apple"
  - Show all (don't filter); user chooses
  - Note: Apple VF (`*.apple.*`) may not support IP detection via guest agent

### 4. IP Detection Pragmatism

- Guest-agent IP detection research is complete and does not work for CHR on tested macOS/QEMU setup
- Do not block MVP/Phase 3 on guest-agent IP retrieval
- Use fallback workflow: Create CHR → serial console/manual discovery → manual `tikbook.baseUrl` setting
- Keep guest-agent path as future re-validation item only if MikroTik clarifies/fixes behavior

### 5. Error UI: Use `window.showErrorMessage()`

- Standard for TikBook (existing pattern)
- Allows custom buttons for "Copy Error", "Show Log", etc.
- Stays visible so users can collect details
- Review current error patterns in codebase (noted for future docs update)

### 6. Delete Operation

- No special warning needed
- Just delete; if it was active connection, TikBook status bar shows red
- User clicks status bar → connection settings → add new CHR (existing workflow)
- This aligns with TikBook's design philosophy

### 7. First-Time Setup Notification

- Use info notification (not modal)
- Just feedback that CHR was created
- Guidance on next steps if needed
- No modal blocker

### 8. Test CHR VM Identification

- Part of Experiment 1
- Create mikropkl CHR, examine:
  - VM name pattern (does it follow scheme?)
  - config.plist contents
  - Description field in UTM UI
  - Icon or metadata
- Document findings for filtering logic in Phase 1

## Experiment Priorities (Revised)

### Highest Priority: Experiment 1

- GitHub releases API integration
- **+ CHR VM identification validation** ← NEW
- Parse release assets
- Create test VM, document markers

### Experiment 2

- Architecture & version selection flow
- Two-menu QuickPick UX
- Semantic version sorting

### Experiment 3 (Lower Priority)

- AppleScript VM creation & IP detection
- Completed with direct QEMU and control validation
- Outcome: CHR guest agent non-response on macOS Intel + QEMU 10.2.1 (HVF)
- Focus remains on serial/manual fallback for IP setup

## Deferred Decision Points

1. **IP detection fallback:** Decided - use manual/serial fallback; no guest-agent dependency
2. **Apple VF vs QEMU preference:** Show all for MVP; user chooses
3. **Platform gating specifics:** Verify `when: isMac` vs other conditions in package.json

## Notes for Implementation

- Existing code to reference/extend:
  - [src/remote.ts](../../src/remote.ts) - GitHub API pattern (use this)
  - [src/config.ts](../../src/config.ts) - Settings scoping
  - Error handling patterns - review and document standard approach

- Dev requirement: macOS tests require UTM installed; tests skip on other platforms

- User workflow target: "I want to play with RouterOS scripts in VS Code without hardware"
  - Quick add CHR → test → feedback loop
  - Minimal manual steps

---

**Status:** Experiments completed; guest-agent research closed
**Next Step:** Continue VM feature work without guest-agent IP dependency
