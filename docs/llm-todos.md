# LLM TODOs

This file tracks **quick action items** from LLM sessions - typically 1-3 hour
tasks with clear requirements that an agent can start without needing a fresh spec.

---

## 📋 Planning Hierarchy

| File | Use it for | Avoid using it for |
|---|---|---|
| [ROADMAP.md](../ROADMAP.md) | Near-term themes and "what should we do next?" | One-off quick fixes |
| `docs/llm-todos.md` | Small, agent-startable work items | Long design docs or vague ideas |
| [docs/specs/](./specs/README.md) | Design-heavy features with evolving requirements | General backlog tracking |
| [future-features.md](./future-features.md) | Long-horizon, blocked, or still-vague work | Current implementation order |

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

1. If it is near-term theme-setting work, add or update [ROADMAP.md](../ROADMAP.md) first
2. Add quick, directly actionable items here
3. Create a spec in `docs/specs/` for design-rich or multi-session features
4. Keep `future-features.md` for ideas that are not ready to compete with roadmap work

**See also:**

- [DEVELOPMENT.md](../../DEVELOPMENT.md) - Main development guide
- [docs/specs/README.md](./specs/README.md) - Feature spec system
- [future-features.md](./future-features.md) - Long-term ideas and dependencies
- [ROADMAP.md](../ROADMAP.md) - Near-term themes and active direction

---

## 🔴 High Priority Tasks

These items should be addressed soon and should stay aligned with `ROADMAP.md`:

### ScriptFS / VFS pre-work hardening

**Files affected:** `ROADMAP.md`, `src/scriptfs.ts`, `src/scriptfs-schema.ts`, `src/test/unit/`, `docs/specs/scriptfs-completion.md`, `docs/architecture.md`

**Why now:** VFS work is the most likely next code-heavy area, but ScriptFS still has
too much path-specific branching and too little direct unit coverage. Also, the
roadmap/spec/docs need to keep treating ScriptFS as the first editable slice of a
broader VFS theme, not the entire feature.

**Priority:** 🔴 High

### Agent/documentation coherence pass

**Files affected:** `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, `docs/llm-todos.md`, `docs/specs/README.md`, testing/docs references

**Why now:** Future agent sessions still hit duplicated workflow guidance and stale
references to the pre-cleanup test layout.

**Priority:** 🔴 High

### CHR backend direction cleanup

**Files affected:** `ROADMAP.md`, `docs/specs/chr-test-environment.md`, UTM-related docs/research

**Why now:** `ROADMAP.md` now points toward quickchr, so older UTM-centric guidance
should be treated as historical context or updated explicitly. First step: keep
the current half-shipped CHR/UTM UI out of the user-facing product surface.

**Priority:** 🔴 High

## 🛠️ Technical Debt (Action Items)

The following technical debt items are now tracked as quick tasks for cleanup and improvement:

### 1. ScriptFS stat and path handling still need cleanup
**Problem:** `SystemScriptFS` is now more coherent, but it still concentrates a lot of path/file handling in one class and needs continued hardening before larger VFS changes.
**Action:** Add direct unit coverage and keep moving path-specific behavior into schema metadata/helpers instead of ad hoc branching.

### 2. Agent guidance is still somewhat duplicated
**Problem:** The repo now has a clearer hierarchy, but workflow guidance is still repeated across agent entry-point files and can drift over time.
**Action:** Keep reducing duplicated prose and prefer pointer-style docs that defer to `ROADMAP.md` and `.github/copilot-instructions.md`.

### 3. Commented Serialization Code in notebook.ts
**Problem:** notebook.ts contains ~50 lines of alternative serialization logic (lines 560–599) that are commented out. Unclear if reference, abandoned, or future format.
**Action:** Review, clarify intent, and either document, refactor, or remove as appropriate.

### 4. Error Detection Patterns (Regex vs LSP)
**Problem:** Error detection is currently regex-based and incomplete. Not robust across RouterOS versions.
**Action:** Research and propose improvements: expand regex patterns, move to LSP-based detection, or auto-generate from docs.

### 5. Metadata and Output Persistence in Notebooks
**Problem:** Notebooks do not persist outputs or metadata, blocking features like collapsed state, per-cell settings, and output saving.
**Action:** Design and implement metadata serialization infrastructure for both .md.rsc and .rsc.md formats. Enable output persistence and related features.

### 6. "Open/Reopen/Copy As" command-surface audit
**Problem:** `package.json` when-clauses and menu groups are mostly right, but there are still likely gaps or over-broad selectors across file, notebook, `rscena://`, and `rscfile://` resources.
**Action:** Audit command visibility/placement for "Open As", "Reopen As", "Copy As", preview, and related actions so the affordances show up in the right places for the right resource types.

### 7. ScriptFS / protocol naming cleanup
**Problem:** "ScriptFS" and the `rscfile://` / `rscena://` naming story still reflects an earlier, narrower scope than the broader VFS direction now on the roadmap.
**Action:** Revisit naming only after the broader VFS shape stabilizes, so protocol and feature names reflect the eventual resource model instead of today's partial slice.

### 8. Linting coverage gaps from ESLint → Biome migration
**Problem:** The migration in `4a141ec` dropped type-aware linting (no-floating-promises, no-misused-promises, switch-exhaustiveness-check, prefer-nullish-coalescing) and the custom `vscode-sanity` ESLint plugin (no-node-builtins-web, require-eventemitter-dispose, no-floating-disposable, vscode-api-version-compat). Follow-up review restored the Biome-side web-safety checks and cleaned the warning noise, but the typed async/lifecycle checks are still not covered by Biome.
**Action:** See [linting-migration-audit.md](./linting-migration-audit.md) for the full breakdown and action items **LMA-1** through **LMA-7**. **LMA-1/2/3/4/7 are done.** The main remaining work is **LMA-5** (a small `lint-sanity` audit script). Keep **LMA-6** as radar, but do **not** re-add ESLint as default repo tooling unless the typed-lint gap proves worth that complexity.

## ⚡ Quick Code Wins

These are 5-30 minute cleanups that improve codebase quality for future feature work. Grouped by effort.

### 🟢 5-15 min fixes (cleanup, consolidation, documentation)

1. **Fix markdown cell separator regex fragility** (5 min)
   - **File:** src/notebook.ts line 340-345
   - **Comment:** Code says "uses a markdown comment hack to break markdown cells... have to find it"
   - **Fix:** Extract regex to named constant, add comment explaining the pattern (`[//]: #.`)
   - **Benefit:** Make markdown format more maintainable, clear for future notebook work

2. **Add lint/audit check for commented-out code** (10 min)
   - **Files:** converters.ts lines 55-60, notebook.ts line 269, virtualdocs.ts line 289, commands.ts line 27
   - **Pattern:** Multiple files have commented-out code blocks with unclear intent
   - **Fix:** If we build `scripts/lint-sanity.ts`, include a simple check that flags commented code blocks > 3 lines
   - **Benefit:** Prevents dead code accumulation; forces decisions: remove or preserve with clear reason

### 🟡 15-25 min focused updates (code safety improvements)

3. **Enable or remove metadata parsing in notebook.ts** (10 min)
   - **File:** src/notebook.ts line 268 - commented `commitPending('markdown', rawMetadataParsed.groups?.[3])`
   - **Current:** Dead code with no explanation
   - **Options:**
     - A) Enable: Implement proper metadata persistence for notebooks (requires spec planning)
     - B) Remove: Delete commented code, keep simple 2-arg calls
   - **Recommendation:** Remove for now (Option B); revisit when metadata persistence is specified
   - **Benefit:** Cleaner code, clearer intent for notebook format

4. **Move LSP command integration from comment to feature** (15 min)
   - **File:** src/commands.ts line 27 - commented `await commands.executeCommand('routeroslsp.runCommand', 'show.output.log')`
   - **Current:** Falls back to warning message instead
   - **Fix:** Implement as experimental feature behind `tikbook.lsp.showLogs` command
   - **Benefit:** Users can see RouterOS LSP debug output; useful for troubleshooting; foundation for LSP coordination
   - **Gating:** Either gate as experimental or add as simple feature if LSP extension is available

5. **Decide scope for `scripts/lint-sanity.ts`** (10 min)
   - **Files:** tools/eslint/vscode-sanity.mjs, docs/linting-migration-audit.md
   - **Issue:** Three archived lint checks still have no replacement (`require-eventemitter-dispose`, `no-floating-disposable`, `vscode-api-version-compat`)
   - **Fix:** Decide what belongs in a standalone audit script versus what should stay as documented review guidance
   - **Benefit:** Keeps Biome-first tooling while recovering the highest-value custom checks

### 🟣 20-35 min focused enhancements (patterns for future work)

6. **Document command boundary type guards pattern** (15 min)
	- **File:** docs/conventions.md  - Add new section after "Type Safety"
	- **Context:** Successfully applied during hardening pass (vm-commands.ts)
	- **Document:**
	  - Problem: Commands pass `unknown` args; optional chaining is fragile
	  - Solution: Type guards like `isVMTreeCommandItem()` are more reliable
	  - Example: Include guard patterns from vm-commands.ts
	  - When to use: All command handlers + argument unpacking
	- **Benefit:** Prevents silent type errors in command handlers; helps LLM agents write safer code

7. **Add async/await best practices to TypeScript patterns** (15 min)
	- **File:** docs/typescript-patterns.md - new section "Async Safety Patterns"
	- **Context:** From VM explorer work, learned about async-safe UI construction
	- **Document:**
	  - Pattern: Await async provider methods before building UI strings
	  - Why: Race conditions can cause stale data in tooltips/descriptions
	  - Anti-pattern: Building UI in constructor, then calling async method
	  - Example: Show before/after from vm-explorer.ts
	- **Benefit:** Prevents subtle race condition bugs; improves code quality in async-heavy features

8. **Create "Code Patterns from VM Integration" guide** (20 min)
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
1. Document command boundary type guards pattern (item #6) — 15 min
2. Add async/await best practices (item #7) — 15 min
3. Fix markdown cell separator regex (item #1) — 5 min

**Result:** Better foundations that help future features like experimental features, services integration, etc.

**Week 2 (Code cleanup):**
4. Create VM integration patterns guide (item #8) — 20 min *(applies to future expansions: Hyper-V, Docker, libvirt)*
5. Review metadata parsing direction (item #3) — 10 min
6. Review LSP log command path (item #4) — 15 min

**Result:** Cleaner codebase, patterns documented for expansion.

**Optional (if time):**
- Items #2, #3, #4, and #5 are all <= 15 min each
- Item #2 helps prevent future dead code

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

**Status:** ✅ Requirements locked (2026-02-27), Gate 1 foundation work started (2026-02-27)
**Spec:** [docs/specs/scriptfs-completion.md](./specs/scriptfs-completion.md)
**Progress:** [docs/research/scriptfs-gate1-progress.md](./research/scriptfs-gate1-progress.md)

**Gate 0 - Requirements LOCKED:**

1. ✅ URL contract locked (prefer display name, no extensions, IP:port authority)
2. ✅ Hierarchy locked (mirror RouterOS CLI, schema-supported paths only)
3. ✅ File identity locked (one file = one attribute, multi-file per item)
4. ✅ Create semantics locked (initial: /system/script + /system/scheduler only)
5. ✅ ScriptFS vs virtualdocs boundary locked (use case drives protocol choice)

**Gate 1 - Foundation Work (In Progress):**

1. ✅ ScriptFS encoding path no longer blocks web compatibility groundwork
2. ✅ Schema updated: /system/script and /system/scheduler use multiFilePerItem: true
3. ✅ mtime handling verified (advances on every write, critical for VS Code)
4. ✅ /console/inspect patterns documented and applied

**Gate 1 - Remaining:**
- [ ] Quick RouterOS test: validate add operations for /system/script and /system/scheduler
- [ ] Extend schema updates to remaining supported paths
- [ ] Add create operation guards (only /system/script and /system/scheduler)
- [ ] Continue simplifying remaining ScriptFS path-special cases

**Supporting research:**
- [docs/research/restraml-integration-notes.md](./research/restraml-integration-notes.md) - RouterOS schema
- [docs/research/console-inspect-api-patterns.md](./research/console-inspect-api-patterns.md) - Implementation patterns
- [docs/research/scriptfs-gate1-progress.md](./research/scriptfs-gate1-progress.md) - Foundation work tracking

**Next Step:** Extend Gate 1 work with RouterOS testing and schema path extensions

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

- Some older docs still imply markdownlint runs across every Markdown file; keep them aligned with the current `DEVELOPMENT.md` and npm-script workflow.
- The archived `vscode-sanity` checks still need triage into a future `scripts/lint-sanity.ts` so the highest-value custom coverage is not lost.
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
