# CHR Test Environment Integration (UTM/VM)

> **Status:** `draft`  
> **Priority:** `high`  
> **Effort Estimate:** 40-60 hours (Phases 1-1b = macOS UTM MVP)  
> **Phase Structure:** 4 phases instead of 3 (Phases 1 + 1b = macOS/UTM core + UI; Phase 2 = Linux/QEMU; Phase 3 = Windows/Hyper-V)

> **Current repo state:** the CHR/UTM UI is intentionally disabled while Theme 1
> shifts toward quickchr. Treat this spec as parked UTM research/history unless a
> roadmap item explicitly reactivates it.

**Related:**

- Research: [docs/research/findings-on-vscode-container-vm-routeros-chr.md](../research/findings-on-vscode-container-vm-routeros-chr.md)
- Experiments: `src/test/integration/utm-integration.experiment.test.ts` (13 experiments, all passing)
- Issue: Enable RouterOS CHR test environments without Docker
- Roadmap: Theme 1 in [ROADMAP.md](../../ROADMAP.md) now starts by keeping this UI hidden until the quickchr direction lands

---

## Overview

### What This Feature Does

Provides TikBook users integrated RouterOS CHR VM management:

1. Detects if UTM (macOS) is installed and configured
2. Lists available RouterOS CHR VMs in explorer view (filtered to mikropkl images)
3. Allows start/stop/refresh of VMs with user-friendly feedback
4. Context menu to set selected VM's IP in TikBook connection settings
5. Handles CHR VM downloads by version via mikropkl + `utm://` URL scheme
6. Alerts/documentation for first-time CHR setup (username/password guidance)

**MVP Scope:** macOS + UTM only, no auto-connect logic, no network discovery, no status polling

### Why We Need It

- **No Docker dependency**: Users without Docker or in restricted environments can still develop/test
- **Familiar UX**: Integrated within VS Code's explorer and commands
- **Cross-platform ready**: Design supports future Linux (QEMU/libvirt) and Windows (Hyper-V) backends
- **Rapid development**: Quick Router spin-up vs manual VM management

### Success Criteria

- [x] 13 UTM integration experiments pass (utmctl, AppleScript, URL scheme)
- [ ] Explorer view shows RouterOS CHR VMs (filtered to mikropkl images only)
- [ ] Start/stop commands work with structured feedback from AppleScript
- [ ] Refresh button updates VM list and status (no automatic polling)
- [ ] Context menu item sets connection IP in **user settings** (global, verified in src/config.ts)
- [ ] First-time users can add CHR by version (mikropkl integration)
- [ ] Alert/notification explains next steps after creating new CHR
- [ ] macOS security prompt (AppleScript permission) expected once, documented
- [ ] Platform gating: Commands/views hidden on Windows/Linux

---

## Current State

### What Exists Today

- Research completed: All UTM integration methods evaluated
- 13 passing experiments: utmctl CLI, AppleScript control, error handling, performance profiling
- AppleScript-first approach chosen: Better UI feedback, rich object model, structured responses
- Fallback to utmctl CLI: Future enhancement if AppleScript fails (Phase 2+)
- No implementation yet in extension code

### What's Missing or Broken

- [ ] VM provider abstraction layer (cross-platform interface)
- [ ] UTM-specific provider implementation (AppleScript-first, utmctl fallback in Phase 2)
- [ ] VM explorer view (command to open, not always visible)
- [ ] Start/stop/refresh command handlers
- [ ] Context menu: "Set as Connection" (updates user settings, not workspace)
- [ ] mikropkl filtering logic (identify CHR VMs, tag with metadata) - needs research
- [ ] GitHub CHR release integration (fetch valid versions, architecture matching)
- [ ] Add CHR by version (AppleScript create/import, not utm:// URL)
- [x] IP detection via guest agent research complete (not viable on macOS CHR as of 2026-02-27)
- [ ] First-time CHR alert (username/password guidance)
- [ ] Platform gating in package.json (macOS-only commands/views)
- [ ] Delete operation with warnings (especially if active connection in user settings)
- [ ] Documentation on macOS permission prompts
- [ ] Error handling: Alert messages with custom buttons, AppleScript retry logic
- [ ] Proper error handling with fallback to utmctl (Phase 2)

### Files to Create/Modify

**New files:**

- `src/vm-providers/vm-provider.ts` - Common interface for all VM platforms
- `src/vm-providers/utm-provider.ts` - macOS UTM implementation (AppleScript-first)
- `src/views/vm-explorer.ts` - VS Code explorer view and commands
- `src/mikropkl-integration.ts` - Filter/detect CHR VMs, handle versioned downloads
- `docs/CHR-test-environment.md` - User documentation (permission prompt, first-time setup)

**Modify:**

- `package.json` - Add views, commands, menus with platform context (darwin only)
- `src/extension.ts` - Register VM provider, activate explorer view (macOS only)
- `src/config.ts` - Context menu to set connection IP in workspace settings
- `README.md` - Document CHR VM management feature

---

## Design & Architecture

### VM Provider Interface (Cross-Platform)

```typescript
interface VMProvider {
  // Platform capabilities
  isAvailable(): Promise<boolean>        // Is this platform usable? (UTM installed, etc)
  
  // VM enumeration
  listVMs(): Promise<VM[]>
  getVM(name: string): Promise<VM | null>
  
  // VM control
  startVM(name: string): Promise<void>
  stopVM(name: string, force?: boolean): Promise<void>
  
  // VM metadata
  getStatus(name: string): Promise<VMStatus>
  
  // Download/import
  downloadVM(url: string): Promise<void>
}

interface VM {
  id: string                             // UUID or unique identifier
  name: string                           // Display name
  status: 'running' | 'stopped' | 'paused' | 'unknown'
  platform: 'utm' | 'libvirt' | 'hyperv'
}
```

### UTM Provider Implementation (macOS MVP)

**Strategy:** AppleScript-first for all operations (including VM creation):

1. **AppleScript** for all operations (list, start, stop, status, create/import)
   - One-time macOS permission prompt ("VS Code wants to control UTM")
   - Rich object model: structured responses like "Started: VM name"
   - Better UI feedback: can return custom messages, query VM properties
   - Full API surface: virtual machines, configurations, control methods, guest agent
   - Retry/recovery logic: Can be implemented in AppleScript itself (powerful)
   - **Reference:** <https://docs.getutm.app/scripting/reference>
2. **utmctl** CLI as fallback (Phase 2 / future enhancement)
   - No prompts, daemon-based, but limited feedback (stdout/stderr only)
   - Use if AppleScript fails or for specific operations where simpler is better
3. **Guest agent integration research complete** (not currently usable for macOS CHR IP detection)
   - MikroTik docs and community reports indicate guest agent support in some environments
   - Direct macOS Intel + QEMU 10.2.1 (HVF) testing shows CHR non-response to guest-agent queries
   - Control VM validation confirms host-side QEMU/socket/protocol are correct
   - See findings: [chr-qemu-guest-agent-research.md](../chr-qemu-guest-agent-research.md)

**Key decision:** AppleScript gives better feedback for UI; utmctl fallback deferred to Phase 2

### VM Explorer View (UX)

**Visibility:** Opened via command or from quick menu (not always visible in activity bar)

**Structure:**

```
RouterOS CHR VMs (view)
├── CHR-7.15.2          [status: stopped]    ← mikropkl image
│   ├─ Start
│   ├─ Stop
│   ├─ Set as Connection (context: updates workspace settings baseUrl)
│   └─ Delete (warns if active connection)
├── CHR-7.14.3          [status: running]    ← mikropkl image
│   ├─ Stop
│   ├─ Set as Connection
│   └─ Delete
├── + Add CHR by Version... (prompts for version, uses mikropkl + utm://)
└── 🔄 Refresh          (manual refresh, no polling)
```

**Filtering:** Only shows mikropkl-format CHR VMs (identified by metadata/naming convention)

**Commands:**

- `tikbook.vm.start` - Start selected VM (AppleScript, rich feedback)
- `tikbook.vm.stop` - Stop selected VM (graceful, force option if needed)
- `tikbook.vm.setConnection` - Update workspace settings with VM's IP/port
- `tikbook.vm.addCHR` - Add CHR by version (mikropkl + utm:// URL scheme)
- `tikbook.vm.delete` - Delete VM with warnings (especially if active connection)
- `tikbook.vm.refresh` - Refresh VM list and status (manual only, no polling)
- `tikbook.vm.open` - Open VM explorer view

### Set Connection Logic (MVP Simplified)

**When user clicks "Set as Connection" context menu:**

1. Detect VM IP address (see IP Detection Strategy below)
2. Update **user settings** (not workspace): `tikbook.baseUrl` = `http://[IP]` (port 80 default, omit from URL)
3. Show notification: "Connection set to CHR VM. Username: admin, Password: (TikBook default)"
4. User manually tests connection via existing TikBook commands

**IP Detection Strategy (research complete):**

- Do not rely on UTM guest agent for CHR IP detection on macOS (confirmed non-response in direct testing)
- Primary approach: user-provided/manual IP + existing connection settings workflow
- Secondary approach: UTM network/config awareness to present expected subnet hints
- Optional future approach: serial-console-assisted IP discovery when available
- See evidence and repro scripts: [chr-qemu-guest-agent-research.md](../chr-qemu-guest-agent-research.md)

**Deferred to separate feature (Phase 2+):**

- Auto-connect logic (broader than just CHR/VMs)
- Network discovery (IP detection, port scanning)
- RouterOS API polling/validation

**First-time setup alert:**

- When user creates new CHR → show notification with next steps
- Guidance on username/password (admin user, TikBook default password for CHR)
- Link to docs for port forwarding setup if needed

**Workspace vs User Settings:**

- MVP uses **user settings** (global across all workspaces)
- All workspaces see same VM list (UTM is system-level on macOS)
- Phase 2 enhancement: Workspace-scoped settings for better multi-workspace support

---

## Implementation Approach

### Experiment Phase (Before Implementation)

**Dependenc order matters:** GitHub integration must come first, then IP detection.

1. **Experiment 1:** GitHub Releases & Mikropkl Format
   - Fetch CHR releases from tikoci/mikropkl using GitHub API
   - Parse release tag (`chr-7.21.3`) and assets (`chr.aarch64.apple.7.21.3.utm.zip`)
   - Validate regex: `/(rose\.)?chr\.([^.]+)\.([^.]+)\.([^.]+)\.utm\.zip$/`
   - Extract: image type, architecture, backend, version
   - Extend existing GitHub API wrapper in [src/remote.ts](../src/remote.ts)
   - Result: Reusable `fetchCHRReleases()` function

2. **Experiment 2:** Architecture Detection & Version Selection
   - Detect macOS architecture: `os.arch()` === 'arm64' or 'x64'
   - Map: ARM64 → `chr.aarch64.apple.X` (first choice); fallback to `chr.aarch64.qemu.X`
   - Map: Intel → `chr.x86_64.apple.X` (first choice); fallback to `chr.x86_64.qemu.X`
   - Sort versions (newest first): `semver.parse()` and compare
   - Result: `selectCHRForPlatform(versions: Release[]): Asset`

3. **Experiment 3:** AppleScript VM Creation & IP Detection (research closed)
   - Create/delete mikropkl VM via AppleScript
   - Tested UTM + direct QEMU guest-agent path for CHR IP retrieval
   - Result: not viable on macOS CHR environment tested (timeouts/non-response)
   - Outcome: use fallback IP workflow for MVP/Phase 3

### Phase 1: Core Provider (GitHub + mikropkl + AppleScript VM control)

1. **Extend GitHub API wrapper**
   - Add `fetchCHRReleases(org: string, repo: string)` to [src/remote.ts](../src/remote.ts)
   - Parse release assets for mikropkl CHR format
   - Use existing axios pattern, add timeout/error handling

2. **Create `VMProvider` interface + `UTMProvider` implementation**
   - Implement: `listVMs()`, `getStatus()`, `startVM()`, `stopVM()`, `deleteVM()`, `getCHRVersions()`
   - AppleScript-first for list/start/stop (structured responses)
   - Error handling: VM not found, UTM not running, permission denied
   - Parse AppleScript responses for UI feedback
   - Port validated AppleScript code from experiments

3. **Implement mikropkl filtering logic**
   - Filter UTM VMs to only mikropkl CHR VMs
   - Extract version/arch/backend from VM name or metadata
   - Store metadata: `{ isCHR: true, version: '7.21.3', arch: 'aarch64', backend: 'apple' }`

4. **Tests (macOS only, skip on other platforms)**
   - Unit tests for GitHub API parsing
   - Unit tests for architecture/version selection
   - Unit tests for AppleScript response parsing
   - Unit tests for mikropkl filtering logic
   - Integration tests with real UTM (macOS devs must have UTM installed)

### Phase 1b: UI Integration (Command + Explorer + "Add by Version")

1. **Create `VMExplorer` view**
   - Register in `package.json` with platform context (`when: isMac`)
   - Implement TreeDataProvider (filters to mikropkl CHR VMs only)
   - Manual refresh only (no polling)
   - Refresh on view open/close and before/after operations
   - Develop command: `tikbook.vm.open` to open explorer

2. **Implement start/stop/delete/setConnection commands**
   - Command handlers with progress indication
   - Parse AppleScript responses for structured UI feedback
   - Delete warns if VM is active connection in settings
   - Context menu: "Set as Connection" updates user settings

3. **Add CHR by version**
   - QuickPick menu: fetch versions from GitHub via `getCHRVersions()`
   - Display versions with architecture/backend info
   - After selection: open utm:// URL or use AppleScript to create VM
   - Show first-time setup alert (username/password guidance)

### Phase 2: Linux Support (QEMU/libvirt)

- Implement `LibvirtProvider` using `virsh` CLI
- Reuse `VMProvider` interface for consistent UX
- Tests skip on non-Linux, require libvirt installed

### Phase 3: Windows Support (Hyper-V + Optional)

- Implement `HyperVProvider` using PowerShell
- Optional: VirtualBox as alternative (lower permission model)
- Tests skip on non-Windows, require Hyper-V or VirtualBox installed

---

## Design Questions

### Question 1: Network Configuration Discovery

**Context:** How should we get the VM's IP address or RouterOS API port?

**Options:**

- **Option A (Experiment result):** Parse VM config files
  - Pros: Always available, doesn't require running VM
  - Cons: Complex XML parsing, fragile to UTM format changes
  
- **Option B (Simpler):** Use localhost:8728 by default (NAT port forwarding)
  - Pros: Works out-of-box for most UTM setups
  - Cons: Requires user to configure port forwarding
  
- **Option C (Hybrid):** Try localhost first, fall back to config parsing
  - Pros: Works for both local and configured IPs
  - Cons: More code, potential race conditions

**Decision:** **Option B for MVP** - Assume localhost + standard RouterOS ports (8289 HTTPS, 8728). Can add Option A in phase 2 if needed for advanced users.

### Question 2: Status Polling Frequency

**Context:** How often should we refresh VM status in the explorer?

**Options:**

- **Option A:** Every 1 second (real-time feel)
  - Pros: Responsive UI, catches fast state changes
  - Cons: Battery drain, system resource usage (~1.1s per poll)
  
- **Option B:** Every 5 seconds (balanced)
  - Pros: Still feels responsive, much lower overhead
  - Cons: May miss brief state transitions

- **Option C:** On-demand only (user clicks refresh)
  - Pros: Minimal resources
  - Cons: Stale state, less integrated feel

**Decision:** **Deferred to Phase 2+.** MVP uses manual refresh only (button click). Status updates on:

- View open/close
- Before/after start/stop operations
- User clicks refresh button

Automatic polling can be added in Phase 2 if needed (5s interval reasonable per Experiment 12).

### Question 3: AppleScript Permission Prompt - UX Strategy

**Context:** First-time users on macOS get "Visual Studio Code wants to control UTM" prompt (macOS security model).

**Options:**

- **Option A:** Educate proactively
  - Add help text: "First run will prompt for permission (macOS security)"
  - Add prompt dismissal guide in README
  
- **Option B:** Request permission on extension activate
  - Prompt for permission early (extension startup)
  - Pros: Gets it out of the way
  - Cons: May confuse users who haven't used VM feature yet
  
- **Option C:** Let it happen naturally
  - No documentation, just let user see the prompt
  - Pros: Less UI clutter
  - Cons: Might confuse first-time users

**Decision:** **Let it happen naturally** (revised). User will see the macOS prompt once when first starting a VM. Document in README/troubleshooting section so users know it's expected. No pre-warning UI needed—keep it simple, document it well.

### Question 4: MVP Scope - macOS Only?

**Context:** Full implementation with Linux + Windows support would take 3-4x longer.

**Options:**

- **Option A:** macOS only for MVP
  - Pros: Ship fast (~2 weeks), validate UX, time for Linux later
  - Cons: Windows/Linux users excluded; may need architecture rework
  
- **Option B:** macOS + Linux (QEMU/libvirt)
  - Pros: Covers 2 major platforms
  - Cons: ~4-5 weeks, may slip
  
- **Option C:** All 3 platforms at once
  - Pros: Comprehensive launch
  - Cons: ~6+ weeks, high risk

**Decision:** **Option A (macOS only)** for MVP. The VM provider interface is designed to support all platforms. Linux can be added as Phase 2 feature (~2 week sprint). Windows (Hyper-V) as Phase 3 if customer demand exists.

---

## Open Questions

### Research Complete ✅

1. **GitHub CHR Releases:** mikropkl format documented
   - Release format: `chr-7.21.3` tag with assets `chr.{arch}.{backend}.{version}.utm.zip`
   - Architectures: `aarch64` (ARM64) or `x86_64` (Intel)
   - Backends: `apple` (Apple Virtualization) or `qemu` (QEMU)
   - Regex pattern: `/(rose\.)?chr\.([^.]+)\.([^.]+)\.([^.]+)\.utm\.zip$/`
   - GitHub API wrapper exists: [src/remote.ts](../src/remote.ts)

2. **Architecture Detection:**
   - Use `os.arch()` to detect platform (arm64 vs x64)
   - Preferred: Apple Virtualization (`*.apple.*.utm`) over QEMU (faster)
   - Fallback: QEMU variants if needed
   - Version sorting: Semantic versioning (newest first)

### Experiments Needed (In Order)

1. **Experiment 1:** GitHub Releases & Parsing
   - Extend [src/remote.ts](../src/remote.ts) with `fetchCHRReleases()` function
   - Parse mikropkl release assets and extract metadata
   - Validate version/architecture mapping

2. **Experiment 2:** Architecture Selection
   - Detect macOS arch and select appropriate CHR image
   - Sort versions semantically
   - Test version picker logic

3. **Experiment 3:** AppleScript VM Creation & IP Detection (completed)
   - Create/delete CHR VM via AppleScript
   - Tested guest agent IP detection and documented final results
   - Guest-agent-based IP retrieval is not a delivery assumption for macOS CHR

---

## Testing Strategy

### Unit Tests

- UTM provider methods (list, start, stop, getStatus, deleteVM)
- Error handling (VM not found, UTM crashed, permission denied)
- AppleScript response parsing (structured messages)
- mikropkl filtering logic (identify CHR VMs)
- GitHub CHR release fetching/parsing

### Integration Tests (macOS only)

- **Requirement:** macOS developers must have UTM installed
- Tests skip on non-macOS platforms automatically
- Start/stop operations with real UTM
- Create/delete mikropkl VM workflows
- Guest agent IP detection (research completed; not viable on macOS CHR test environment)

### Experiment Tests (Before Implementation)

- Create/delete mikropkl VM via AppleScript
- Validate fallback IP workflow (manual/known-subnet guidance) for CHR
- Test GitHub API for CHR release list
- Validate architecture detection and QEMU image selection

### Manual Testing

- Fresh macOS install (verify permission prompt works as documented)
- Start/stop multiple VMs rapidly
- Network connectivity after connect
- Error cases: UTM not running, VM not found, API timeout

### User Testing (Post-MVP)

- First-time user experience (download → start → connect workflow)
- Permission prompt clarity on fresh macOS
- Explorer responsiveness with large VM lists

---

## Deployment & Rollout

### MVP Release Checklist

- [ ] All unit tests passing
- [ ] Integration tests with real UTM
- [ ] Documentation complete (README section + troubleshooting)
- [ ] Permission prompt behavior documented
- [ ] Error messages user-friendly and actionable
- [ ] Package version bumped appropriately
- [ ] CHANGELOG entry added
- [ ] Code review completed

### Rollout Strategy

1. **Alpha:** Internal testing only, gather feedback
2. **Beta:** Release to TikBook early adopters, monitor error reports
3. **Stable:** Full release to all users

---

## Future Phases

### Phase 2: Linux Support (QEMU/libvirt)

- Implement `LibvirtProvider` using `virsh` CLI or libvirt libraries
- Reuse `VMProvider` interface for consistent cross-platform UX
- Support for Boxes, virt-manager, cockpit ecosystems
- Tests skip on non-Linux, require libvirt installed
- Target: ~2-3 week sprint after MVP validation

### Phase 3: Windows Support (Hyper-V, optional)

- Implement `HyperVProvider` using PowerShell or Hyper-V APIs
- Optional: VirtualBox as alternative (lower permission model)
- Tests skip on non-Windows, require Hyper-V or VirtualBox installed
- Requires admin privileges for Hyper-V; document this
- Target: 2-3 week sprint (if customer demand exists)

### Phase 4: Advanced Features (Future)

- Multi-router topology (compose multiple CHR instances)
- SSH tunnel for terminal access
- VM snapshot/restore for test isolation
- Custom CHR versions beyond latest
- Container backend fallback (Docker/Podman)

---

## References

### Homework Completed

- GitHub integration: [src/remote.ts](../src/remote.ts) - axios-based GitHub API wrapper (already in codebase)
- mikropkl releases: <https://github.com/tikoci/mikropkl/releases> - Release format documented
- mikropkl README: <https://github.com/tikoci/mikropkl> - Architecture, backends, installation methods

### External References  

- UTM documentation: <https://docs.getutm.app/> (AppleScript reference, guest agent API)
- tikoci/mikropkl (CHR packaging): <https://github.com/tikoci/mikropkl>
- RouterOS CHR official: <https://mikrotik.com/download#chr>
- VS Code Tree View API: <https://code.visualstudio.com/api/extension-guides/tree-view>
- macOS AppleScript: <https://developer.apple.com/library/archive/documentation/AppleScript/Conceptual/AppleScriptX/>
