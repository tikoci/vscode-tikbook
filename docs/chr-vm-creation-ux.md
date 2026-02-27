# CHR VM Creation & Management - User Experience

This document describes what end users see when using the CHR VM management features (Phase 1-1b).

---

## End-to-End Workflow

### Step 1: Open CHR VM Explorer

**User sees:**

- Explorer sidebar with "CHR VMs" tree view
- List of existing RouterOS CHR VMs (if any)
- Buttons: "Create CHR VM" (+ icon), "Refresh" (circular arrow)

---

### Step 2: Click "Create CHR VM" Command

**User initiates action:**

- Runs command `tikbook: Add CHR by Version` (Command Palette or Explorer button)

**What happens in extension:**

1. Query GitHub releases for all RouterOS versions (takes ~2-3 seconds)
2. Show QuickPick with 30+ RoutersOS versions

**User sees:**

- Quick response from extension: "Fetching available releases..."
- QuickPick modal with versions like:
  - `✦ v7.21.3 (Latest)`
  - `v7.21.2`
  - `v7.21.1`
  - ... (many older versions)

---

### Step 3: Select RouterOS Version

**User action:** Click a version from QuickPick (e.g., `v7.21.3`)

**User sees:**

- Second QuickPick appears: "Select CHR image"
- Architecture/backend options:
  - `ARM64 + Apple (native acceleration)`
  - `ARM64 + QEMU`
  - `x86-64 + Apple`
  - `x86-64 + QEMU`

---

### Step 4: Select Image Architecture

**User action:** Click image (e.g., `ARM64 + Apple`)

**User sees:**

- UTM window comes to foreground
- Native UTM download dialog appears:

```
┌─────────────────────────────────────────────────┐
│ Download VM                                      │
│                                                  │
│ Do you want to download                         │
│ 'https://github.com/tikoci/mikropkl/releases/  │
│ download/chr-7.21.3/chr.aarch64.apple.7.21.3  │
│ .utm.zip'?                                      │
│                                                  │
│  [ Cancel ]                [ Download ]         │
└─────────────────────────────────────────────────┘
```

**What happened in extension:**

1. Built UTM URL scheme: `utm://downloadVM?url=<encoded-github-url>`
2. Opened native macOS `open` command (more reliable than VS Code's env.openExternal)
3. UTM handles download, extraction, bundle validation, and VM registration

---

### Step 5: User Confirms Download in UTM

**User action:** Click "Download" button in UTM dialog

**Timeline:**

- UTM downloads `.utm.zip` file (~50-200 MB, takes 1-10 minutes depending on connection)
- UTM automatically extracts bundle
- UTM validates and registers VM in its database
- VM appears in UTM's VM list

**In VS Code:**

- Extension continues running in background
- StatusWatchdog polls every ~10 seconds
- When download completes, watchdog detects new VM
- **New VM automatically appears in "CHR VMs" explorer tree view** (no button click needed)

---

### Step 6: New VM Appears in VS Code Explorer

**User sees:**

- "CHR VMs" tree expands automatically
- New VM listed (e.g., `chr-7.21.3-aarch64-apple`)
- Status shows: `stopped`
- Context menu available: Start, Stop, Delete, Details, Refresh

---

### Step 7: Manage the VM

From the tree view, user can:

#### Start VM

- Context menu: "Start CHR VM"
- Status changes: `stopped` → `running` (after 3-5 seconds)

#### Stop VM

- Context menu: "Stop CHR VM"
- Status changes: `running` → `stopped` (after 2-3 seconds)

#### Delete VM

- **Context menu shows only for stopped/unknown VMs** (hidden for running VMs)
- If VM is running: no "Delete" option appears (UI gate)
- If VM is stopped: "Delete" option available
- User selects "Delete" → confirmation dialog: "Are you sure you want to delete VM 'chr-7.21.3'?"
- User confirms → VM deleted from UTM and removed from explorer
- ✅ **Only the selected VM is deleted** (safe AppleScript pattern applied)
- ✅ **Error handling:** If delete fails with "must be stopped", clear error message tells user to stop the VM first

#### View Details

- Context menu: "Show VM Details"
- Shows popup with: ID, name, status, memory, CPU count, CHR metadata (version, architecture, backend)

---

## Architecture Notes

### iOS Coordination Between VS Code Extension & UTM

```
VS Code Extension                      UTM (native macOS app)
───────────────────────────────────────────────────────────
1. User clicks "Create"
2. Fetch versions from GitHub
3. Show QuickPicks
4. Build utm:// URL
5. Execute `open` command ──────────→ 6. Show download dialog
                                       7. Download .utm.zip
                                       8. Extract & register VM
                                       ← 9. Close dialog
10. (No progress shown in extension)
11. StatusWatchdog polls every ~10s ──→ 12. Check UTM's VM list
← 13. VM appears when download completes
14. Automatic refresh updates tree view
```

### Key Design Decisions

**Delegation to UTM (not manual download):**

- ✅ No permission issues (UTM is the authority for VMs)
- ✅ No bundle extraction logic in extension (UTM does it)
- ✅ No temp directory cleanup needed
- ✅ No filesystem access complexity
- ✅ Better UX (native download dialog, progress in UTM)
- ❌ Tradeoff: Can't show download progress in VS Code

**Automatic periodic refresh:**

- Runs every ~10 seconds (part of StatusWatchdog polling loop)
- Detects newly downloaded VMs without user action
- Desktop-only (uses env.uiKind check for web extension compatibility)

**AppleScript-based VM control:**

- ✅ One-time permission prompt (not repeated)
- ✅ Rich object model (query properties)
- ✅ Reliable (used by UTM itself)
- ⚠️ Requires careful patterns to avoid bugs (e.g., don't delete while iterating)

---

## Known Limitations

### VM Creation Constraints

- **Requires UTM 3.0+** installed on macOS
- **Network connectivity required** (GitHub releases download)
- **Download happens in UTM, not VS Code** (no in-editor progress)
- **Import is automatic** (user doesn't manually register)

### VM Deletion Constraints

- **UTM requires VMs to be stopped before deletion** (API limitation)
- **UI gate:** "Delete" context menu only appears for stopped/unknown VMs (enforced in package.json when clause)
- If VM is running, "Delete" is hidden from context menu
- If user somehow gets error "VM must be stopped", error message explains the requirement
- Safe iteration: Only the selected VM is deleted (AppleScript pattern prevents cascade)

### VM Discovery

- Only discovers VMs already in UTM's database
- Requires router health check to trigger refresh (every ~10s)
- Manual "Refresh" button available if immediate update needed

### Platform Support

- **Phase 1-1b: macOS UTM only**
- Linux/libvirt: Phase 2 (not yet started)
- Windows Hyper-V/VirtualBox: Phase 3 (not yet started)

---

## Bug Fixes

### Critical: Delete All VMs Cascade (Fixed 2026-02-27)

**Problem:** When deleting a single VM, all VMs in UTM were deleted

**Root cause:** AppleScript bug pattern - deleting item during iteration caused corruption

**Fix:** Store VM reference first, exit loop, then delete

```applescript
// BEFORE (Wrong - deleted during iteration)
repeat with vm in virtual machines
  if name of vm is "target-vm" then
    delete vm        // ← Can corrupt iteration
    return "Done"
  end if
end repeat

// AFTER (Right - store reference, delete after)
set vmToDelete to missing value
repeat with vm in virtual machines
  if name of vm is "target-vm" then
    set vmToDelete to vm
    exit repeat      // ← Exit loop first
  end if
end repeat
delete vmToDelete     // ← Delete outside loop
```

**Testing:** Verify deleting one VM removes only that VM, not others

---

## Extension Logs

When debugging VM operations, check logs:

- `<UTMProvider.listVMs>` - Shows all VMs discovered
- `<StatusWatchdog>` - Shows polling cycles and refresh calls
- `<chrvm.create>` - Shows version/image selection workflow
- `<chrvm.delete>` - Shows deletion confirmation and AppleScript result
- `<UTMProvider.deleteVM>` - Shows AppleScript execution

Enable debug logs: Settings → "Tikbook: Log Level" → "Debug"
