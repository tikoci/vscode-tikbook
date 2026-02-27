---
name: 'Phase 2 Implementation Notes'
description: 'Learnings and decisions from Phase 2: CHR VM Explorer UI'
---

# Phase 2 Implementation Notes: CHR VM Explorer

**Date:** February 26, 2026  
**Scope:** Tree view + commands for managing RouterOS CHR VMs  
**Status:** Complete - Ready for production testing

---

## Key Learnings

### 1. Activation Event Timing is Critical

**Issue Encountered:**

- Tree view was registered BEFORE VM providers
- Tree view tried to list providers on first render
- Providers were not yet registered, showed "No providers available"
- When user opened menu (Ctrl+Shift+M), providers finally registered
- Error then appeared in tree view from late provider initialization

**Solution:**

- Register all VM providers **before** creating tree view
- Guarantees providers exist when tree view attempts to query them
- Order in extension.ts:

  ```typescript
  // 1. Register providers first
  vmProviderRegistry.register(new UTMProvider())
  
  // 2. Then initialize tree view
  const chrVMExplorer = CHRVMExplorerProvider.register(context)
  ```

**Learning for Future:**

- Views that query backend state (providers, services) must wait for setup
- Activation events matter - provider setup vs UI initialization order
- Consider lazy initialization if activation gets complex

---

### 2. AppleScript Syntax Considerations

**Issue Encountered:**

- AppleScript property `is running` is not exposed by UTM's dictionary
- Attempts to access `running` property also failed
- Properties with spaces in names are tricky in AppleScript

**Solution (Hybrid Approach):**

- Use AppleScript ONLY to list VM names (what it can do reliably)
- Determine running status by checking if VM name appears in `ps aux` output
- UTM runs QEMU processes with `-name <vmname>` parameter in arguments
- Parse process list with regex: `/-name\s+(\S+)/` to extract running VM names

**Working Pattern:**

```typescript
// Get VM names via AppleScript (works ✓)
const vmNames = await runAppleScript(`
  tell application "UTM"
    set vmList to {}
    repeat with vm in virtual machines
      set vmName to name of vm
      set end of vmList to vmName
    end repeat
    return vmList
  end tell
`)

// Get running status via process list (works ✓)
const { stdout } = await execFileAsync('ps', ['aux'])
const runningVMs = new Set(
  Array.from(stdout.matchAll(/-name\s+(\S+)/g)).map(m => m[1])
)

// Combine results
for (const vmName of vmNames) {
  const status = runningVMs.has(vmName) ? 'running' : 'stopped'
}
```

**Why This Works:**

- AppleScript dictionary limitations bypassed with external data source
- Process list is always accurate (kernel-provided)
- Avoids fragile property parsing
- Each tool does what it's good at

**Testing Pattern:**

- Created `scripts/test-utm-applescript*.sh` files for standalone testing
- Tests AppleScript syntax BEFORE integration into code
- Can quickly identify syntax errors with `osascript -e` command
- Lesson: Always test AppleScript/scripting changes in isolation first

---

### 3. UI Loading States and Error Presentation

**What Works:**

- Error items with red ⊘ icon clearly indicate problems
- Context menu on tree items is intuitive
- Version picker UI is clear

**What Could Be Better:**

- "No providers available" message during initial load
- No distinction between "no providers found" vs "providers loading"
- Consider adding:
  - Loading indicator while extension.activate() runs
  - "Initializing..." state for tree view
  - Better error messaging (link to docs/troubleshooting)

**Future Improvement:**

```typescript
// Current
if (providers.length === 0) {
  return [this.createWelcomeItem()]
}

// Could distinguish:
- No providers on system (user needs to install UTM/VirtualBox)
- Providers available but checking (loading state)
- Providers available but not responding (error state)
```

---

### 4. Test Coverage vs Activation Integration

**Status:**

- Unit tests all pass ✓
- Phase 1 backend tests ✓
- Phase 2 integration tests: Can't run without full extension context
- AppleScript-based tests: Requires macOS + UTM installed

**Decision:**

- Unit tests for pure functions (chrMetadata parsing, version sorting) ✓
- Integration tests for provider discovery ✓
- End-to-end testing: User manual testing in Extension Development Host ✓
- (Could add mock provider in future for isolated testing)

---

## Phase 2 Architecture Decisions

### Provider Registration Pattern

**Choice:** Explicit registration in `extension.ts` rather than auto-discovery

**Why:**

- Extension controls exact list of providers loaded
- Easy to disable/feature-flag providers
- Performance: Only register needed providers
- Clear dependency: extension knows what providers exist

**Alternative Considered:** Auto-discovery via require.context()

- Pro: New providers auto-included
- Con: Hard to debug, unclear lifecycle, feature-flag issues

---

### Tree View Data Refresh

**Choice:** `EventEmitter` + `refresh()` method for explicit UI updates

**Why:**

- User controls when to refresh (button press)
- No unnecessary polling or subscriptions
- Clear signal: "something changed, refresh tree"

**How It Works:**

1. User presses refresh button
2. `refresh()` fires event emitter
3. Tree view re-queries providers
4. Updated state shown in UI

---

### Error Handling in VM Operations

**Pattern Used:**

```typescript
try {
  await provider.startVM(vm.id)
  explorer.refresh()
  void window.showInformationMessage(`VM started successfully`)
} catch (error) {
  log.error('[chrvm.start] Failed to start VM', error)
  void window.showErrorMessage(
    `Failed to start VM: ${error instanceof Error ? error.message : String(error)}`
  )
}
```

**Why:**

- Errors are logged for debugging
- User gets clear message about what failed
- Tree view is only refreshed on success
- Promise result is explicitly awaited (no floating promises)

---

## Known Limitations

1. **AppleScript Dependency**
   - UTM support requires AppleScript scripting enabled
   - Fails silently if UTM not installed
   - Consider adding more helpful error message

2. **Version Detection**
   - CHR metadata parsing needs exact VM name patterns
   - Future: Could infer from VM disk image or config plist

3. **No SSH Key Support**
   - VM creation only supports password-based auth
   - SSH keys in future phase

4. **Single Provider at a Time**
   - UI shows all providers, but typically only one installed per system
   - Multi-provider workflows: Future consideration

---

## What Phase 3 Should Consider

### 1. Initial Setup / Onboarding

- Guide user to install UTM if not present
- First-time VM creation wizard
- "Getting started" documentation

### 2. Advanced Features

- SSH key support for VM authentication
- VM networking configuration UI
- Performance metrics / VM resource monitoring
- Connection to running VMs (VNC/console)

### 3. Cross-Platform Support

- VirtualBox implementation (Linux/Windows)
- Hyper-V support (Windows)
- libvirt support (Linux)

### 4. Persistence & Settings

- User preference: Auto-refresh on tab focus?
- Favorite VMs / pinning
- VM groups / organization
- Settings: CHR download mirror selection

### 5. Testing Infrastructure

- Mock provider for isolated testing
- Integration test harness
- CI/CD: Test CLI commands without UI

---

## Code Quality & Maintenance

### Strengths of Phase 2 Implementation

✅ Consistent with existing codebase patterns  
✅ Type-safe throughout (no `any` types)  
✅ Proper error handling with `{ cause }`  
✅ Logging at appropriate levels  
✅ JSDoc on public APIs  
✅ Provider abstraction is extensible  

### Areas for Future Hardening

⚠️ No retry logic for transient failures  
⚠️ AppleScript output parsing is fragile  
⚠️ No timeout on long-running operations  
⚠️ Error messages could be more specific  

---

## Recommended Follow-Up Actions

1. **Test on Real User System**
   - [ ] Verify with actual UTM + CHR VMs
   - [ ] Check performance with many VMs (10+)
   - [ ] Test on different macOS versions

2. **Documentation**
   - [ ] User guide for CHR VM management
   - [ ] Troubleshooting AppleScript errors
   - [ ] VM naming conventions for CHR detection

3. **Next Phase Planning**
   - [ ] Prioritize: Onboarding vs Advanced Features
   - [ ] Estimate effort for each provider (VirtualBox, Hyper-V, etc.)
   - [ ] Storage/SSH key feature scope
