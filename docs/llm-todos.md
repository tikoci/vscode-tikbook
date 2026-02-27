# LLM TODOs

This file tracks **quick action items** from LLM sessions - typically 1-3 hour tasks with clear requirements.

---

## 📋 Organization System

**For quick tasks (1-3 hours):** Add to this file (llm-todos.md)

- Code cleanup
- Small bug fixes
- Documentation updates
- Clear, actionable items

**For larger features (requiring design decisions):** Use [docs/specs/](./specs/README.md)

- Features needing multi-paragraph specifications
- Features requiring user input over time
- Features with open design questions
- Features you want to evolve incrementally

**Workflow:**

1. Add quick items here
2. Create spec in docs/specs/ for complex features
3. Mark spec status: `draft` → `under-review` → `ready-for-implementation` → `implemented`
4. When spec is ready, reference it from here or implement directly

**See also:**

- [DEVELOPMENT.md](../../DEVELOPMENT.md) - Main development guide
- [docs/specs/README.md](./specs/README.md) - Feature spec system
- [future-features.md](./future-features.md) - Long-term ideas and dependencies

---

## 🔴 High Priority Tasks

These items should be addressed soon:

### ✅ Implement Web Extension Bundling with Bun - COMPLETED

**Status:** ✅ COMPLETE (2026-02-26)
**Implementation:** Switched from tsc-only to Bun for both node and web builds

**What was fixed:**

- Node build: `bun build` to `out/extension.js` (0.71 MB bundled)
- Web build: `bun build --target=browser` to `dist/extension.js` (0.79 MB bundled)
- All 91 tests pass with Bun compilation
- Web extension successfully loads on vscode.dev with proper bundling
- Single source file (`src/extension.ts`) with different targets eliminates duplication

**Build Pipeline:**

- `npm run compile` → builds node target only (dev-optimized)
- `npm run compile:web` → builds web target (explicit, when needed)
- `npm run compile:test` → builds all tests
- `npm test` → runs desktop tests (91 tests, 2s)
- `npm run test:web` → runs browser tests with web build
- `npm run vsix:serve` → packages and serves on localhost:5000

**Verification:**

- ✅ Desktop VSIX installs and works
- ✅ Web VSIX packages successfully (2.8 MB)
- ✅ Extension loads on vscode.dev with bundled code
- ✅ Commands register and execute
- ✅ All test runners work (CLI, web, GUI extension runner)

**Related Update:**

- Updated docs/testing-vscode-web-local.md to remove "known limitation" note

### Add Integration Tests for VS Code Extension Features (Status: Phase 1-2 Complete)

**Status Update:** ✅ Phase 1 (Priority 0 - Contributions): 66 tests complete  
**Status Update:** ✅ Phase 2 (Priority 1 - Notebook Kernel): 45 tests complete  
**Remaining:** Phase 2 decision - Continue with Approach 1 for more integration tests or wait?

**Files completed:**

- src/test/suite/integration/contributions.test.ts (66 tests)
- src/test/suite/integration/notebook-kernel.test.ts (17 tests)
- src/test/suite/integration/config.test.ts (13 tests)
- src/test/suite/integration/vscode-compat.test.ts (19 tests)

**See:** [docs/integration-testing-strategy.md](./integration-testing-strategy.md) for complete status

### Create Root DEVELOPMENT.md Entry Point ✅ COMPLETE

**Status:** Completed 2026-02-26
**Files created:** DEVELOPMENT.md (root), docs/specs/README.md (new spec system)
**Outcome:**

- Created comprehensive DEVELOPMENT.md as single entry point
- Created docs/specs/ system for incremental feature design
- Provides template-based workflow for capturing design decisions
- See [DEVELOPMENT.md](../../DEVELOPMENT.md) and [docs/specs/README.md](./specs/README.md)

### Hide Interactive REPL Behind Experimental Features → MOVED TO SPEC

**Status:** Detailed spec created, ready for implementation
**Spec:** [docs/specs/experimental-features.md](./specs/experimental-features.md)
**Scope:** Generic experimental feature system for REPL, Video, and future features
**Next Step:** Implement experimental.ts infrastructure per spec

### CHR VM Management Integration (Phase 1-1b: Complete, Phase 3: Deferred) ⚠️

**Status:** Phase 1-1b Infrastructure Complete, Phase 3 Deferred
**Scope:** [docs/specs/chr-test-environment.md](./specs/chr-test-environment.md)

**Phase 1-1b COMPLETE (Ready to Test):**

- ✅ VM provider abstraction + UTM implementation (listVMs, getStatus, startVM, stopVM)
- ✅ Explorer tree view displays CHR VMs correctly
- ✅ Start/Stop commands work on running VMs (tested Feb 26, 2026)
- ✅ Delete command with confirmation dialog implemented
- ✅ GitHub CHR release fetching + version selection
- ✅ Comprehensive logging with UI context

**Phase 3 DEFERRED (Not Yet Implemented):**

- ❌ Create VM (full implementation) - Currently shows stub error
  - Stub method added to make scope clear
  - Requires: Download CHR image, extract, create UTM bundle, configure network
  - Marked in code: `log.warn('NOT YET IMPLEMENTED for Phase 3')`
  - See: src/vm-providers/utm-provider.ts line 268
- ❌ IP detection via QEMU guest agent for CHR on macOS - Research completed; not viable in tested environment
- ⚠️ Phase 3 should use fallback IP workflow (manual/serial/config-hint) instead of guest-agent dependency
- ❌ Advanced networking features

**Testing Guidance:**

- ✅ **DO test:** Start, Stop, Delete, tree view, version selection UI
- ❌ **Do NOT test:** Create command (deferred to Phase 3, stub intentionally throws error)
- ✅ **Expected result:** Create command shows this error: "CHR VM creation is not yet implemented. Phase 2 scope includes VM management only. Phase 3 will add VM creation."

**CRITICAL BUG FIXES (2026-02-27):**

- ✅ **Fixed:** Delete cascade bug in AppleScript
  - **Issue:** Deleting VM while iterating corrupted iteration state - only the iteration bug affected one VM per delete call, but it failed
  - **Fixed:** Store VM reference, exit loop, then delete safely
  - **Files:** src/vm-providers/utm-provider.ts line 350 (deleteVM method)

- ✅ **Fixed:** Cannot delete running VMs (UTM API requirement)
  - **Issue:** UTM returns `-2700: The virtual machine must be stopped before this operation can be performed`
  - **Root cause:** UTM API doesn't allow deletion of running or paused VMs
  - **Solution:** UI gate approach (simpler, more user-friendly)
    - "Delete" context menu only shows for stopped/unknown VMs
    - Enforced via package.json when clause: `viewItem !~ /running/`
    - If running: no delete option appears (prevents user confusion)
    - If stopped: delete works immediately
  - **Error handling:** If delete still fails with "must be stopped" error, user gets clear message
  - **Testing:** Verify delete hidden for running VMs; verify delete works for stopped VMs

**Important for LLM Agents:**

- **Before suggesting feature testing**, verify scope in [.github/instructions/phase-scope-verification.md](.github/instructions/phase-scope-verification.md)
- Check code for "NOT YET IMPLEMENTED", "Phase X" markers
- Spec clearly shows Phase structure - always verify feature is in target deliverable
- The Create command is intentionally stubbed to prevent ambiguity about completion status

**AI Workflow Improvement:**

- Created: [.github/instructions/logging-ui-context.md](.github/instructions/logging-ui-context.md) - Logging best practices for UI-dependent code
- Created: [.github/instructions/phase-scope-verification.md](.github/instructions/phase-scope-verification.md) - Before testing, verify scope
- Updated: All logging now includes before/after filtering context (shows what UI displays, not just raw counts)

## ⚡ Quick Code Wins

**Status (2026-02-27): Tasks #9-11 COMPLETED ✅**

These tasks provided infrastructure patterns for future feature work. Completed:

- ✅ **Task #9 (20 min):** Centralized output channel manager — Created `src/output-channels.ts`, removed duplicate channels from schema-mapper.ts and scriptfs.ts
- ✅ **Task #10 (15 min):** Command boundary type guards — Added "Command Boundaries & Type Guards" section to docs/conventions.md with examples
- ✅ **Task #11 (15 min):** Async/await best practices — Added "Async Safety Patterns" section to docs/typescript-patterns.md explaining race condition prevention
- ✅ **Deferred:** Task #12 (VM patterns guide) — Not needed yet; UTM/AppleScript patterns too specific to this platform. Revisit when building second VM provider.

These are 5-30 minute cleanups that improve codebase quality for future feature work. Grouped by effort.

### 🟢 5-15 min fixes (cleanup, consolidation, documentation)

1. **Consolidate duplicate output channels** (10 min)
   - **Files:** src/schema-mapper.ts line 18, src/scriptfs.ts line 13
   - **Issue:** Both create "RouterOS Virtual FileSystem" output channel, causing duplicate channels
   - **Fix:** Extract to shared `getVirtualFileSystemChannel()` helper in shared.ts, use from both files
   - **Benefit:** Cleaner Output panel, consistent logging setup

2. **Document web compatibility issue in scriptfs.ts** (5 min)
   - **File:** src/scriptfs.ts line 1 - `import { TextDecoder, TextEncoder } from 'util'`
   - **Issue:** Node util module not available in web extensions; uses fallback but undocumented
   - **Fix:** Add comment explaining web gating needed if scriptfs extends to web
   - **Pattern:** Similar to pattern in `converters.ts` for conditional encoding

3. **Fix markdown cell separator regex fragility** (5 min)
   - **File:** src/notebook.ts line 340-345
   - **Comment:** Code says "uses a markdown comment hack to break markdown cells... have to find it"
   - **Fix:** Extract regex to named constant, add comment explaining the pattern (`[//]: #.`)
   - **Benefit:** Make markdown format more maintainable, clear for future notebook work

4. **Add ESLint rule for commented-out code** (10 min)
   - **Files:** converters.ts lines 55-60, notebook.ts line 269, virtualdocs.ts line 289, commands.ts line 27
   - **Pattern:** Multiple files have commented-out code blocks with unclear intent
   - **Fix:** Document in `tools/eslint/vscode-sanity.mjs` a rule to flag commented code > 3 lines
   - **Benefit:** Prevents dead code accumulation; forces decisions: remove or preserve with clear reason

### 🟡 15-25 min focused updates (code safety improvements)

5. **Enable or remove metadata parsing in notebook.ts** (10 min)
   - **File:** src/notebook.ts line 268 - commented `commitPending('markdown', rawMetadataParsed.groups?.[3])`
   - **Current:** Dead code with no explanation
   - **Options:**
     - A) Enable: Implement proper metadata persistence for notebooks (requires spec planning)
     - B) Remove: Delete commented code, keep simple 2-arg calls
   - **Recommendation:** Remove for now (Option B); revisit when metadata persistence is specified
   - **Benefit:** Cleaner code, clearer intent for notebook format

6. **Move LSP command integration from comment to feature** (15 min)
   - **File:** src/commands.ts line 27 - commented `await commands.executeCommand('routeroslsp.runCommand', 'show.output.log')`
   - **Current:** Falls back to warning message instead
   - **Fix:** Implement as experimental feature behind `tikbook.lsp.showLogs` command
   - **Benefit:** Users can see RouterOS LSP debug output; useful for troubleshooting; foundation for LSP coordination
   - **Gating:** Either gate as experimental or add as simple feature if LSP extension is available

7. **Apply web-safe encoding pattern to scriptfs.ts** (10 min)
   - **File:** src/scriptfs.ts - uses Node `TextDecoder/TextEncoder` from util
   - **Pattern:** Already applied in notebook.ts (uses global), follow same approach
   - **Fix:** Replace `import { TextDecoder, TextEncoder } from 'util'` with fallback to global
   - **Benefit:** Makes scriptfs.ts web-safe by default; removes dependency on Node util

8. **Restructure eslint config for readability** (10 min)
   - **File:** eslint.config.mjs - vscode-api-version-compat rule is inlined on same line as closing brace
   - **Issue:** Makes spacing hard to read/maintain
   - **Fix:** Move to separate lines like other rules for clarity
   - **Benefit:** Easier future maintenance without line-wrapping issues

### 🟣 20-35 min focused enhancements (patterns for future work)

9. **Extract centralized output channel manager** (20 min)
   - **Context:** From working with VM explorer, learned centralizing status mappers is cleaner
   - **Apply to:** Output channels (currently scattered across files, some with fallbacks)
   - **Create:** `src/output-channels.ts` exporting:
     - `getTikBookChannel()` - Main extension logs
     - `getVirtualFileSystemChannel()` - ScriptFS + schema-mapper
     - `getRouterOSLSPChannel()` - LSP coordination (currently missing)
   - **Benefit:** Single source of truth for channels, consistent error handling, easier to track which feature owns which channel
   - **Related:** Similar pattern to `vscode-compat.ts` for version features

10. **Document command boundary type guards pattern** (15 min)
	- **File:** docs/conventions.md  - Add new section after "Type Safety"
	- **Context:** Successfully applied during hardening pass (vm-commands.ts)
	- **Document:**
	  - Problem: Commands pass `unknown` args; optional chaining is fragile
	  - Solution: Type guards like `isVMTreeCommandItem()` are more reliable
	  - Example: Include guard patterns from vm-commands.ts
	  - When to use: All command handlers + argument unpacking
	- **Benefit:** Prevents silent type errors in command handlers; helps LLM agents write safer code

11. **Add async/await best practices to TypeScript patterns** (15 min)
	- **File:** docs/typescript-patterns.md - new section "Async Safety Patterns"
	- **Context:** From VM explorer work, learned about async-safe UI construction
	- **Document:**
	  - Pattern: Await async provider methods before building UI strings
	  - Why: Race conditions can cause stale data in tooltips/descriptions
	  - Anti-pattern: Building UI in constructor, then calling async method
	  - Example: Show before/after from vm-explorer.ts
	- **Benefit:** Prevents subtle race condition bugs; improves code quality in async-heavy features

12. **Create "Code Patterns from VM Integration" guide** (20 min)
	- **New file:** docs/vm-integration-patterns.md
	- **Content:** Lessons learned from CHR VM management that apply to future integrations (other VM systems, containers, etc.)
	- **Sections:**
	  - Provider abstraction pattern (how vm-providers registry works)
	  - Type-safe status mapping (mapUTMStatusToVMStatus function)
	  - AppleScript error handling in Node
	  - UI gating for unavailable operations (hiding Delete when VM is running)
	  - Tree view filtering/sorting (CHR version sorting with semver)
	- **Benefit:** Future integrators (Hyper-V, libvirt, Docker) have playbook; foundation for extensible architecture

### 📋 Recommended Priority Path for Quick Wins

**Week 1 (Infrastructure for future features):**
1. Extract centralized output channel manager (item #9) — 20 min
2. Document command boundary type guards pattern (item #10) — 15 min
3. Add async/await best practices (item #11) — 15 min

**Result:** Better foundations that help future features like experimental features, services integration, etc.

**Week 2 (Code cleanup):**
4. Consolidate duplicate output channels (item #1) — 10 min
5. Fix markdown cell separator regex (item #3) — 5 min
6. Create VM integration patterns guide (item #12) — 20 min *(applies to future expansions: Hyper-V, Docker, libvirt)*

**Result:** Cleaner codebase, patterns documented for expansion.

**Optional (if time):**
- Items #2, #5, #6, #7, #8 are all < 15 min each
- Item #4 (ESLint rule) helps prevent future dead code

### Rationalize Notebook Serialization Code

**Files:** notebook.ts lines 560-599, README.md format specification
**Issue:** Code and README are out of sync. Commented code uses different markers (`#|`, `#.`) than current implementation.
**Task:** Either document why alternative code is preserved (reference? future format?) or remove as dead code. Ensure README format spec matches actual implementation.

## Pending Tasks

### Add linting for markdown embedded in UI strings

**Files affected:** package.json (markdownDescription, markdownDeprecationMessage, viewsWelcome, etc.)
**Reason:** Markdown rendered in VS Code UI is not currently linted.
**Priority:** 🟢 Low - nice-to-have validation

### SystemScriptFS Completion and Organization → MOVED TO SPEC

**Status:** Detailed spec created (draft), awaiting user input
**Spec:** [docs/specs/scriptfs-completion.md](./specs/scriptfs-completion.md)
**Reason for Draft:** Feature is ~70% complete but needs user specification of:

- Exact file/path structure expectations
- Filename templates per schema entry
- Multi-file vs single-file preference
- RouterOS add operation requirements
**Next Step:** User fills in spec requirements, then change to ready-for-implementation

### Video Player and Teaching Features

**Context:** Video player and walkthrough are placeholders for future teaching/training features. Goal is to use TikBook for teaching RouterOS.
**Tasks:**

1. Document video conversion process (ffmpeg needed to convert audio to MP3 for VS Code compatibility)
2. Create planning document for teaching features (video integration, walkthrough improvements)
3. Consider broader task: disable/gate experimental features properly
**Note:** Video player is intentionally experimental - not ready for promotion yet

### Example Notebook Library

**Context:** Provide good sample notebooks for users and LLM agents.
**Tasks:**

1. Create a small set of curated example notebooks (basic, intermediate, advanced)
2. Include examples for REST output, CSV exports, and Markdown RouterOS
3. Document how to use/extend examples in README.md and docs/

### TIKOCI Tool Integrations (Discovery)

**Context:** TikBook should be a jumping-off point to other RouterOS tools from the TIKOCI organization.
**Tasks:**

1. Review <https://tikoci.github.io> for candidate tool integrations
2. Identify which tools fit directly into VS Code workflows
3. Create a short list of integrations to prototype (restraml diff, schema downloads, curl2rsc, utf2rsc/csv2rsc)
4. Start with a `curl2rsc` integration prototype (command + webview or embedded UI)
5. Research restraml RAML usage for REST validation inside TikBook (agentic use)
6. Define how to surface schema downloads in Quick Commander (RAML/OAS2/inspect.json)

### RouterOS /app Dev Workflow → MOVED TO SPEC

**Status:** Placeholder spec created (draft), awaiting user input
**Spec:** [docs/specs/app-yaml-schema.md](./specs/app-yaml-schema.md)
**Priority:** YAML schema is higher priority than full UI (per user)
**Reason for Draft:** Needs user specification of:

- Complete /app YAML property list
- Example /app YAML file
- File detection pattern preference
- Auto-configuration behavior
**Next Step:** User provides schema requirements in spec

**Note:** Full /app UI toolkit is future work, schema is Phase 1

### RouterOS Certificate UX → MOVED TO SPEC

**Status:** Placeholder spec created (draft), awaiting user design
**Spec:** [docs/specs/certificate-ux.md](./specs/certificate-ux.md)
**Reason for Draft:** Needs user specification of UX design, operation scope, deployment wrapping requirements
**Next Step:** User sketches ideal UX and prioritizes operations in spec

### ScriptFS + Remote UX (viewsWelcome)

**Context:** viewsWelcome should better integrate scriptfs.ts with VS Code remote capabilities.
**Tasks:**

1. Add viewsWelcome entries to guide mounting and remote use of scriptfs
2. Ensure UX accounts for remote scenarios (ssh/containers/wsl)

### code-server Documentation

**Context:** Users need guidance for running TikBook under code-server.
**Tasks:**

1. Add README section for code-server setup
2. Document limitations and required settings (CORS, certs, ports)

### Connection Profiles

**Context:** Support multiple RouterOS connections without editing global settings.
**Tasks:**

1. Define profile format (name, baseUrl, username, auth method)
2. Address weak credential management in VS Code settings
3. Explore cross-tool credential integration (e.g., macOS Keychain)

### Research: RouterOS Operations & Transport Constraints

**Context:** Multi-router support and transport abstraction need to understand which RouterOS operations are transport-specific. This affects transport design, profile defaults, and user expectations.
**Goal:** Identify RouterOS-specific reasons why a user would choose REST vs SSH vs Native API.
**Research Questions:**

1. Which operations only work over specific transports? (e.g., does `/console/inspect` require SSH?)
2. Is JSON serialization (`:serialize`) available over all transports, or transport-specific?
3. Are there RouterOS monitoring/event features that only make sense with Native API's `listen` model?
4. Do certificate/PKI workflows require specific transports (import, export, deploy)?
5. Does `/app` management have transport-specific characteristics (performance, feature limitations)?
6. Are there administrative constraints (per-transport permissions, logging differences)?
**Output:** Document mapping operations → transport capabilities to inform abstraction design.
**Note:** Requirements still being clarified. Needs more thinking time before actionable. Related to multi-router management across feature set.

- scriptfs.ts uses TextEncoder/TextDecoder from Node's util, which is not available in VS Code web. If SystemScriptFS is used in web, replace with global TextEncoder/TextDecoder or gate to desktop-only usage.
- BUILD_TOOLING.md says markdownlint runs on all .md files, but scripts now target docs/**/*.md only. Update the doc to match.
- eslint.config.mjs has vscode-api-version-compat inlined on the same line as the previous rule and closing brace. It works but is hard to maintain.
- schema-mapper.ts and scriptfs.ts create output channels with the same name ("RouterOS Virtual FileSystem"), which may confuse Output panel output. Consider consolidating.
- Implement LSP command integration for showing RouterOS LSP logs. Currently commands.ts line 27 has commented code `routeroslsp.runCommand` that could enable this. Currently shows warning message instead.
- Clean up commented exception handling in converters.ts lines 55-60. Code appears to be leftover from refactoring - either implement proper error handling or remove the commented block.
- Fix markdown cell separator detection in notebook.ts line 265. Comment says "uses a markdown comment hack to break markdown cells... have to find it..." - indicates the regex/logic may be fragile.
- Enable or remove metadata parsing in notebook.ts line 269. Line is commented: `commitPending('markdown', rawMetadataParsed.groups?.[3])`. Related to metadata persistence feature.
- Add more user settings to control internal behavior and enable/disable UI elements (currently hardcoded - mentioned in Known Issues)
  > **Status:** Only 7 settings currently exist in package.json (baseUrl, username, password, apiTimeout, sshCommand, checkCertificates, provideLspServerCredentials). Many UI behaviors and features are hardcoded.
- Add VS Code custom `when` context to track connection status. This will enable dynamic menu visibility and wording based on whether RouterOS is online.
  > **Status:** Only `tikbook.usingSecrets` context exists in config.ts. No connection status context implemented yet.
- Support internationalization files for strings. Even though only English is planned, having all strings in one place makes editing easier and code cleaner. File: extension.ts likely needs refactoring.
  > **Status:** No i18n/localization support found in codebase. All strings are hardcoded in source files.
- Re-introduce walkthrough feature with better content (was removed as non-functional in 0.3.1)
  > **Status:** No walkthrough configuration found in package.json. Feature completely removed.
- Implement saving collapsed state for notebook sections. Currently, collapsed sections don't persist when reopening notebooks. File: notebook.ts likely needs metadata support.
  > **Status:** Confirmed - notebook.ts sets `transientCellMetadata: { inputCollapsed: true, outputCollapsed: true }` which prevents persistence.
- Evaluate and decide whether to keep "Start Interactive REPL" feature. README notes it "may be removed in future versions" as usefulness is uncertain.
  > **Status:** REPL is implemented and active in menus.ts line 120. **DECISION NEEDED:** Keep or remove this feature.
- Add support for video audio encoding. Videos need audio re-encoded to MP3 for VS Code webview compatibility. Some environments still have no audio - needs investigation.
  > **Status:** Video player fully implemented in video.ts with MP3 audio support. Audio issues remain environment-specific.

## Future Ideas

- (Add ideas here for future improvements that are not actionable yet.)

## Completed

- (Move finished items here with links to the implementation or notes.)

## Notes

- Keep items short and actionable.
- Prefer adding file paths to help future sessions jump to the right spot quickly.

### Hardening Retrospective (2026-02-27)

Good patterns to repeat:

- Tighten verification gates early (`compile` includes `typecheck`) so latent issues surface before feature merge.
- Use focused type guards at command boundaries (tree item payloads) instead of optional chaining on `unknown`.
- Keep status/enum mapping centralized (`mapUTMStatusToVMStatus`) and add direct unit coverage for the mapper.
- Prefer async-safe UI plumbing (await optional async provider methods before building tooltip/info text).
- Re-run full harness after fixes (`npm run compile`, `npm test`) rather than relying on partial checks.

Patterns to avoid:

- Direct execution of compiled tests with raw mocha when test files depend on VS Code host APIs (`vscode` module).
- Importing mocha suite/test helpers in this repo's test files; use global `suite`/`test` pattern.
- Declaring helper functions inside suite blocks in ways that bundling/transpilation can scope incorrectly; prefer `const` helpers at suite scope.

Tooling notes from this hardening pass:

- Most helpful:
  - `run_in_terminal` for authoritative compile/test outcomes.
  - `read_file` + `grep_search` for fast pinpointing of type/lint failures.
  - `apply_patch` for small, surgical multi-file fixes.
- Less helpful in this workflow:
  - `test_failure` (did not surface details for this harness run pattern).
  - Direct `npx mocha` for extension tests (fails outside VS Code test host).

---

## Code Cleanup & Technical Debt from Comments

These items were found by reviewing commented-out code in the codebase:

### Commented Code Blocks to Review

1. **Alternative notebook serialization** (notebook.ts lines 560-599)
   - ~50 lines of different serialization approach using `#|` and `#.` markers
   - Either document why it's kept or remove dead code
   - May be useful reference for future metadata work

2. **Exception handling** (converters.ts lines 55-60)
   - Commented try-catch block for JSON conversion
   - Either implement proper error handling or remove

3. **Metadata parsing** (notebook.ts line 269)
   - `commitPending('markdown', rawMetadataParsed.groups?.[3])`
   - Disabled but may be needed for metadata support feature

4. **Alternative active notebook getter** (virtualdocs.ts line 289)
   - `const nb = window.activeNotebookEditor?.notebook`
   - Commented in favor of workspace.openNotebookDocument
   - Cleanup or document why alternative is kept

### Implementation Notes from Comments

1. **Markdown cell separator** (notebook.ts line 265)
   - Comment: "uses a markdown comment hack to break markdown cells... have to find it..."
   - Suggests fragile implementation that may need robustness improvements

2. **LSP command integration** (commands.ts line 27)
   - Commented: `await commands.executeCommand('routeroslsp.runCommand', 'show.output.log')`
   - Could enable showing RouterOS LSP logs from TikBook
   - Currently shows warning message instead

3. **RouterOS Code Style Settings** (converters.ts line 154)
   - Commented alternative for conditional key quoting in JSON-to-Array conversion
   - Should be implemented as configurable setting coordinated with RouterOS LSP
   - Part of broader "RouterOS Code Style" settings that should be consistent across both extensions
   - See FUTURE_FEATURES.md "JSON Key Formatting Options" for full context
