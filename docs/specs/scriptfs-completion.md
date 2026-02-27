# ScriptFS Feature Completion

> **Status:** `draft`  
> **Priority:** `high`  
> **Effort Estimate:** TBD (pending spec completion)  
> **Created:** 2026-02-26  
> **Last Updated:** 2026-02-26  
> **Owner:** Needs user input to define complete requirements

**Related:**

- Spec: experimental-features.md (ScriptFS should be gated as experimental)
- Issue: N/A
- Docs: architecture.md (mentions ScriptFS as work-in-progress)
- Code: src/scriptfs.ts, src/scriptfs-schema.ts

---

## Overview

### What This Feature Does

ScriptFS provides a **virtual filesystem** (`rscfile://` protocol) that maps RouterOS script-containing paths to VS Code's Explorer. Users can browse, edit, create, and delete RouterOS scripts directly from VS Code without manual cut-and-paste.

**Key value:** Enables end-users to edit scripts stored in `/system/script` and other RouterOS script attributes (schedulers, DHCP clients, logging actions, etc.) with full RouterOS LSP support directly on the router.

### Why We Need It

**Current workflow (without ScriptFS):**

1. Write script in TikBook notebook or .rsc file
2. Test script execution
3. Manually cut-and-paste to `/system/script` on router
4. No immediate LSP feedback on router-stored scripts

**With ScriptFS:**

1. Mount `rscfile://router.local` in VS Code Explorer
2. Browse `/system/script`, schedulers, DHCP clients, etc.
3. Edit scripts directly (LSP validation works)
4. Save → immediate sync to router
5. No manual copy-paste needed

### Success Criteria

- [ ] File structure in VS Code matches RouterOS CLI paths
- [ ] Filenames correspond to RouterOS attributes (e.g., `on-event`, `source`)
- [ ] Single-attribute creates work (e.g., create script with just "name")
- [ ] Multi-attribute creates fail gracefully with clear error
- [ ] Write operations behave correctly (no corruption, proper sync)
- [ ] Works in both desktop and web VS Code (after TextEncoder fix)
- [ ] No crashes or data loss
- [ ] Clear documentation of supported operations

---

## Current State

### What Exists Today

**Implementation Status: ~70% complete, bugging**

- ✅ FileSystemProvider interface implemented (`src/scriptfs.ts`, 926 lines)
- ✅ Schema definitions for 20+ RouterOS paths (`src/scriptfs-schema.ts`, 325 lines)
- ✅ Read support works
- ✅ Write support partially works (line 555+ in scriptfs.ts)
- ✅ Directory listing works with schema-based paths
- ❌ Auto-mount disabled in extension.ts (lines 39-57, commented out intentionally)
- ❌ Uses Node `TextEncoder/TextDecoder` from `util` - not web-compatible
- ❌ File creation (add operation) needs testing and refinement
- ❌ File structure doesn't always match RouterOS CLI paths
- ❌ Filenames don't always correspond to RouterOS attributes correctly

**Schema Coverage:**
Supports 20+ RouterOS paths including:

- `/system/script` (core use case)
- `/system/scheduler` (on-event scripts)
- `/system/routerboard` (button scripts)
- `/interface/vrrp` (on-master, on-backup scripts)
- `/ip/dhcp-client` (dhcp scripts)
- `/ip/dhcp-server/alert` (on-alert scripts)
- `/tool/netwatch` (on-up, on-down, on-test scripts)
- `/tool/e-mail` (on-success, on-failure scripts)
- `/system/logging/action` (script-type logging)
- Many more...

### What's Missing or Broken

**Known Issues:**

1. **File structure doesn't match RouterOS CLI paths consistently**
   - Example: Need to verify paths like `/system/script` vs `/System/Script` vs `/script`
   - User requirement: "file structure shown in vscode should match/mimic routeros CLI paths"

2. **Filenames not always based on RouterOS attributes**
   - Current: Some filenames use `${name}.rsc` template
   - User requirement: "file name which cooresponse with the 'on-event=' (or whatever script attribute)"
   - Example: `/system/scheduler` item with name="backup-task", attribute on-event="..." should show as `backup-task` (not `backup-task.rsc`?)

3. **File creation (add) operations need work**
   - Single-attribute creates should work (e.g., create script with just "name")
   - Multi-attribute creates should fail gracefully if RouterOS requires multiple attributes
   - Current behavior: Unclear, needs testing

4. **TextEncoder/TextDecoder not web-compatible**
   - Line 1: `import { TextDecoder, TextEncoder } from 'util';`
   - Node's `util` module not available in web
   - Fix: Use global `TextEncoder`/`TextDecoder` or gate to desktop-only

5. **Auto-mount disabled**
   - Intentionally disabled (extension.ts lines 39-57) while debugging
   - Decision needed: Enable by default? Manual only? Behind experimental flag?
   - Related to experimental features spec

6. **Duplicate output channel name**
   - Both `scriptfs.ts` and `schema-mapper.ts` use "RouterOS Virtual FileSystem"
   - Should rename one to avoid confusion

### Files Affected

- `src/scriptfs.ts` - Main FileSystemProvider implementation
- `src/scriptfs-schema.ts` - Schema definitions for RouterOS paths
- `src/schema-mapper.ts` - REST API mapping utilities
- `src/extension.ts` - Auto-mount initialization (commented out)
- `package.json` - Activation event: `onFileSystem:rscfile`

---

## Design Questions

### Question 1: File Path Structure

**Context:** How should the virtual filesystem paths map to RouterOS CLI paths?

**Current Behavior:** Paths like `rscfile://router.local/system/script/my-script.rsc`

**User Requirement:** "file structure shown in vscode should match/mimic routeros CLI paths, at least for items we want shown in vscode"

**Questions:**

- Should paths match REST API paths (`/system/script`) or CLI paths (`/system script`)?
- Should file extensions be added (`.rsc`) or use raw attribute names?
- How to handle nested paths (e.g., `/ip/dhcp-server/*/alert`)?

**Decision:** TBD - User needs to specify exact path structure expectations

### Question 2: Filename Templates

**Context:** What should filenames be in the virtual filesystem?

**Current Behavior:** Uses `filenameTemplate` in schema (e.g., `${name}.rsc`)

**User Requirement:** "file name which cooresponse with the 'on-event=' (or whatever script attribute)"

**Examples to clarify:**

- `/system/script` item with name="backup" → Filename should be `backup` or `backup.rsc`?
- `/system/scheduler` item with name="daily-backup", on-event="..." → Filename should be `daily-backup` or `on-event` or `daily-backup.on-event`?
- `/system/routerboard` with multiple script attrs (mode-button, reset-button, wps-button) → How to represent?

**Decision:** TBD - User needs to provide examples of desired filename structure

### Question 3: File Creation Requirements

**Context:** When user creates a new file, what should happen?

**User Requirement:**

- "if a routeros `add` operation needs just a name (or any single attribute to create) to create a new item, scriptfs should allow that"
- "if multiple attributes are needed to call some routeros `add`/PUT operation, that should fail at this point"

**Questions:**

- How to detect which attributes are required for creation? (Inspect schema? Try-catch?)
- What error message to show when multi-attribute required?
- Should there be a UI to guide multi-attribute creation?
- Example: Creating `/system/script` needs just "name", but creating `/ip/dhcp-client` might need "interface" + other attrs

**Decision:** TBD - Need to test RouterOS add requirements per path

### Question 4: Auto-Mount Behavior

**Context:** Should ScriptFS auto-mount when extension activates?

**Options:**

- **Auto-mount by default** - Automatically mount when RouterOS baseUrl configured
- **Manual only** - User explicitly mounts via command
- **Experimental flag** - Auto-mount when experimental.features.scriptfs enabled
- **Prompt user** - Ask on first activation whether to auto-mount

**Decision:** TBD - Defer to experimental-features spec, but user can clarify preference

### Question 5: Multi-File vs Single-File Per Item

**Context:** Some RouterOS items have multiple script attributes (e.g., `/system/routerboard` has mode-button, reset-button, wps-button)

**Current Behavior:** Schema has `multiFilePerItem` flag

**Options:**

- **Multi-file:** Show as directory with multiple files inside
  - `/system/routerboard/mode-button.rsc`
  - `/system/routerboard/reset-button.rsc`
  - `/system/routerboard/wps-button.rsc`
- **Single-file:** Concatenate all attributes into one file (current for some items)
  - `/system/routerboard.rsc` with all scripts inside

**Decision:** TBD - User preference?

---

## Requirements

### Functional Requirements

#### Must Have

1. **CLI Path Matching:** VS Code paths mirror RouterOS CLI structure
2. **Attribute-Based Filenames:** Filenames correspond to RouterOS script attributes
3. **Single-Attr Creation:** File creation works when only one attribute required
4. **Multi-Attr Creation Failure:** Clear error when multi-attribute required
5. **Web Compatibility:** Fix TextEncoder/TextDecoder for VS Code web
6. **Read Operations:** Reliable file reading from RouterOS
7. **Write Operations:** Reliable file writing to RouterOS (no corruption)
8. **Delete Operations:** Reliable file deletion from RouterOS

#### Should Have

1. **Auto-mount Configuration:** User can enable/disable auto-mount
2. **Creation Guidance:** UI hints when multi-attribute creation needed
3. **Conflict Detection:** Warn if file changed on router since last read
4. **Directory Caching:** Reasonable performance for directory listings

#### Could Have (Future)

1. **Two-way Sync:** Watch for changes on router and update VS Code
2. **Offline Mode:** Edit files locally, sync when connection restored
3. **Metadata Display:** Show RouterOS attributes as file properties
4. **Search:** Find scripts by content or attributes

### Non-Functional Requirements

**Performance:**

- Directory listings < 2 seconds for typical routers
- File operations < 1 second (read/write/delete)
- Cache item listings to reduce REST calls

**Reliability:**

- No data corruption on write
- Clear error messages for all failure modes
- Graceful degradation when router unreachable

**Compatibility:**

- Desktop VS Code (macOS, Windows, Linux)
- VS Code for Web (after TextEncoder fix)
- RouterOS 7.10+ (min), 7.20.2+ (target)

**Usability:**

- File structure intuitive for RouterOS users
- Error messages actionable
- Documentation clear

---

## User Experience

### User Flows

**Flow 1: Mount and Browse Scripts**

1. User runs command "TikBook: Mount RouterOS Scripts"
2. Extension creates workspace folder: `rscfile://192.168.88.1/`
3. Explorer shows `/system/script`, `/system/scheduler`, etc.
4. User expands `/system/script`
5. sees list of scripts with `.rsc` extension (or attribute-based names)
6. User clicks script → Opens in editor with RouterOS LSP validation

**Flow 2: Edit Existing Script**

1. User opens `rscfile://192.168.88.1/system/script/backup.rsc`
2. Edits script content
3. Saves (Ctrl+S)
4. ScriptFS updates script on router via REST API
5. Confirmation in status bar or output channel

**Flow 3: Create New Script**

1. User right-clicks `/system/script` folder
2. Selects "New File"
3. Names it `new-script.rsc`
4. ScriptFS creates script with name="new-script" on router
5. User edits content, saves
6. Script updated on router

**Flow 4: Create Fails (Multi-Attribute Required)**

1. User tries to create file in path requiring multiple attributes
2. ScriptFS shows error: "Cannot create [path] - multiple attributes required. Use RouterOS CLI or REST API."
3. No partial/corrupt items created on router

### UI/UX Design

**Commands:**

- `tikbook.scriptfs.mount` - Mount RouterOS scripts as workspace folder
- `tikbook.scriptfs.unmount` - Unmount scripts workspace
- `tikbook.scriptfs.refresh` - Force refresh directory cache

**Settings:**

```json
{
  "routeros.scriptfs.autoMount": {
    "type": "boolean",
    "default": false,
    "description": "Automatically mount RouterOS scripts on extension activation"
  }
}
```

**File Extensions:**

- `.rsc` for RouterOS scripts (or no extension if using attribute names?)

### Examples

**Example 1: /system/script Structure**

```
rscfile://192.168.88.1/
  system/
    script/
      backup.rsc          (name="backup", source="...")
      config-check.rsc    (name="config-check", source="...")
      startup.rsc         (name="startup", source="...")
    scheduler/
      daily-backup        (name="daily-backup", on-event="...")
      weekly-update       (name="weekly-update", on-event="...")
```

**Example 2: /system/routerboard Multi-File**

```
rscfile://192.168.88.1/
  system/
    routerboard/
      mode-button.rsc     (mode-button script)
      reset-button.rsc    (reset-button script)
      wps-button.rsc      (wps-button script)
```

---

## Implementation Notes

### Architecture

**Components:**

- `SystemScriptFS` class - Implements FileSystemProvider interface
- `scriptfsSchema` - Schema definitions for each RouterOS path
- `SchemaMapper` - Maps schema to REST API calls
- Commands - Mount/unmount/refresh operations

**Data Flow:**

```
VS Code File Operation → SystemScriptFS → SchemaMapper → RouterRestClient → RouterOS REST API
                                                              ↓
                                                        Response/Error
                                                              ↓
                                                      Update VS Code
```

### Technical Approach

**Phase 1: Fix Critical Issues (2-3 hours)**

1. Fix TextEncoder/TextDecoder for web compatibility
2. Rename output channel to avoid duplicate
3. Test and document file creation behavior
4. Add unit tests for edge cases

**Phase 2: Path Structure Refinement (TBD)**
> **BLOCKED:** Awaiting user spec for path/filename structure

1. Update schema templates based on user requirements
2. Adjust path rendering logic
3. Test with various RouterOS items
4. Update documentation

**Phase 3: Polish & Testing (TBD)**

1. Add integration tests
2. Test on real RouterOS devices
3. Performance optimization
4. Enable auto-mount (behind experimental flag)

### Key Implementation Details

**TextEncoder/TextDecoder Fix:**

```typescript
// Current (not web-compatible):
import { TextDecoder, TextEncoder } from 'util';

// Fix option 1 (use globals):
const encoder = new TextEncoder();
const decoder = new TextDecoder();

// Fix option 2 (conditional import):
const { TextEncoder, TextDecoder } = typeof window !== 'undefined'
  ? window
  : await import('util');
```

**File Creation Logic:**

```typescript
async writeFile(uri: Uri, content: Uint8Array, options: { create: boolean }): Promise<void> {
  const { schema, item } = parseUri(uri);
  
  if (options.create) {
    const requiredAttrs = getRequiredAttrsForCreate(schema);
    if (requiredAttrs.length > 1) {
      throw FileSystemError.NoPermissions(
        `Cannot create ${uri}: Multiple attributes required (${requiredAttrs.join(', ')}). Use RouterOS CLI.`
      );
    }
    // Single-attr create OK, proceed...
  }
  
  // Update logic...
}
```

### Dependencies

**Required Before Implementation:**

- [x] Experimental features system (see experimental-features.md)
- [ ] User specification of path/filename structure
- [ ] User specification of creation requirements per path
- [ ] Testing on RouterOS devices to verify add/update operations

**Nice to Have:**

- [ ] RouterOS inspect endpoint to query required attributes
- [ ] UI for multi-attribute item creation

---

## Testing Strategy

### Unit Tests

**Files:** `src/test/scriptfs.test.ts`

**Test Cases:**

- [ ] `findSchemaForParts()` correctly matches paths
- [ ] `renderFilename()` produces expected filenames
- [ ] `deriveItemName()` extracts item name from filename
- [ ] `normalizeItemName()` handles .rsc extension correctly
- [ ] TextEncoder/TextDecoder work in test environment

### Integration Tests

**Files:** `src/test/suite/integration/scriptfs.test.ts`

**Test Cases:**

- [ ] Mount filesystem successfully
- [ ] Read directory lists correct items
- [ ] Read file retrieves correct content
- [ ] Write file updates RouterOS item
- [ ] Create file creates RouterOS item (single-attr path)
- [ ] Create file fails gracefully (multi-attr path)
- [ ] Delete file removes RouterOS item
- [ ] Cache invalidation works correctly

### Manual Testing

**Scenarios requiring manual verification:**

1. **Real RouterOS connection:**
   - Mount filesystem from RouterOS 7.10, 7.20.2, 7.16
   - Browse various paths (/system/script, /system/scheduler, etc.)
   - Verify filenames match expectations
   - Create/edit/delete scripts
   - Verify changes persist on router

2. **Error handling:**
   - Disconnect router mid-operation
   - Try to create item with missing required attrs
   - Try to edit read-only items
   - Verify error messages helpful

3. **Web compatibility:**
   - Test in VS Code for Web after TextEncoder fix
   - Verify all operations work

**Test with:**

- [ ] VS Code desktop (macOS, Windows, Linux)
- [ ] VS Code for Web
- [ ] RouterOS 7.10 (minimum)
- [ ] RouterOS 7.20.2 (target)
- [ ] RouterOS 7.16 (in-between)

---

## Rollout Plan

### Feature Flags

**Experimental Feature?**

- [x] Yes - Hide behind `experimental.features.scriptfs` setting
- [ ] No

**Auto-mount controlled by:** `routeros.scriptfs.autoMount` (boolean, default false)

### Migration

**Breaking Changes:**

- If path/filename structure changes, existing mounted filesystems may need remount
- Document migration steps if schema changes significantly

**Backward Compatibility:**

- Filesystem is virtual - no local state to migrate
- Changes only affect how items appear in VS Code, not router state

### Documentation Updates

- [ ] Update README.md with ScriptFS usage guide
- [ ] Add to DEVELOPMENT.md (experimental feature examples)
- [ ] Update architecture.md (ScriptFS completion status)
- [ ] Create docs/scriptfs-guide.md with detailed usage
- [ ] Update CHANGELOG.md when feature stable

---

## Open Issues & Risks

### Risks

**Risk 1: Data corruption on write**

- **Likelihood:** Low (code exists and partially tested)
- **Impact:** High (could corrupt router config)
- **Mitigation:** Extensive testing, read-back verification, backup warnings in docs

**Risk 2: Performance issues with large configs**

- **Likelihood:** Medium
- **Impact:** Medium
- **Mitigation:** Caching, lazy loading, pagination if needed

**Risk 3: RouterOS version incompatibilities**

- **Likelihood:** Medium (different versions have different paths)
- **Impact:** Medium
- **Mitigation:** Use /console/inspect to verify paths at initialization

**Risk 4: Complex items with multi-attribute dependencies**

- **Likelihood:** High (many RouterOS paths require multiple attrs)
- **Impact:** Medium
- **Mitigation:** Fail gracefully with clear errors, document limitations

### Unresolved Questions

- [ ] Exact path structure specification (User input needed)
- [ ] Filenames based on name attr or script attr? (User input needed)
- [ ] Multi-file per item preference (User input needed)
- [ ] Required attributes for creation per path (RouterOS testing needed)
- [ ] Auto-mount preference (Defer to experimental-features spec)

### Known Limitations

- Cannot create items that require multiple attributes (by design)
- No two-way sync (changes on router don't auto-update VS Code)
- No conflict resolution (last-write-wins)
- No offline mode (requires active RouterOS connection)
- Read-only items cannot be edited (as expected)

---

## Decisions Log

### 2026-02-26: Mark as Experimental Feature

**Question:** Should ScriptFS be experimental?  
**Decision:** Yes, use experimental.features.scriptfs  
**Rationale:** Feature is incomplete and needs more testing. Hide behind experimental flag until stable.

### 2026-02-26: Fix TextEncoder for Web

**Question:** How to fix web compatibility?  
**Decision:** Use global TextEncoder/TextDecoder  
**Rationale:** Globals work in both Node and web environments. No conditional imports needed.

---

## Implementation Checklist

> **Note:** Checklist will be completed once status changes to `ready-for-implementation`

**Pending User Input:**

- [ ] Specify exact path structure expectations
- [ ] Specify filename structure expectations (examples per schema entry)
- [ ] Clarify multi-file vs single-file preference
- [ ] Test and document RouterOS add requirements per path

**Once Ready:**

- [ ] Fix TextEncoder/TextDecoder
- [ ] Rename duplicate output channel
- [ ] Update schema per user requirements
- [ ] Test file creation on RouterOS
- [ ] Add unit tests
- [ ] Add integration tests
- [ ] Manual testing on RouterOS devices
- [ ] Documentation complete
- [ ] Mark as stable or keep experimental
- [ ] Update spec status to `implemented`

---

## References

- RouterOS REST API: <https://help.mikrotik.com/docs/display/ROS/REST+API>
- RouterOS /console/inspect: Verify path availability per device
- VS Code FileSystemProvider API: <https://code.visualstudio.com/api/references/vscode-api#FileSystemProvider>
- Schema Definitions: [src/scriptfs-schema.ts](../../src/scriptfs-schema.ts)

---

## Notes / Scratchpad

**User Requirement Summary (from chat):**
> "i need a better spec on what i'm looking for may be the actual blocker... the real task here is documenting what we have for scriptfs along with tasks needed to finish the feature... i need to better identify issues and define some functionality better in scriptfs... i want the routeros attributes with the script as the file name which cooresponse with the 'on-event=' (or whatever script attribute)... file structure shown in vscode should match/mimic routeros CLI paths... if a routeros `add` operation needs just a name (or any single attribute to create) to create a new item, scriptfs should allow that but if multiple attributes are needed to call some routeros `add`/PUT operation, that should fail at this point."

**Key Points:**

- Feature is half-implemented and bugging
- User needs to write detailed spec to unblock
- Path structure needs clarification
- Filename structure needs examples
- Creation logic needs refinement
- High value feature once complete (direct LSP integration with router scripts)

**Next Steps for User:**

1. Review current schema entries in scriptfs-schema.ts
2. For each entry (or at least key ones like /system/script, /system/scheduler), specify:
   - Desired file path in VS Code
   - Desired filename format
   - Multi-file or single-file for multi-script items
3. Test RouterOS add operations to document required attributes
4. Update this spec with findings
5. Change status to `ready-for-implementation`
