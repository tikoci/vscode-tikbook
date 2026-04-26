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

- [DEVELOPMENT.md](../DEVELOPMENT.md) - Main development guide
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

**Why now:** The hierarchy is better than it used to be, but a few high-traffic docs
still drift from current reality (for example, parked CHR/UTM state, spec-index
wording, and notebook format notes).

**Priority:** 🔴 High

### CHR backend direction cleanup

**Files affected:** `ROADMAP.md`, `README.md`, `CLAUDE.md`, `docs/specs/README.md`, `docs/specs/chr-test-environment.md`, UTM-related docs/research

**Why now:** `ROADMAP.md` now points toward quickchr, so older UTM-centric guidance
should be treated as historical context or updated explicitly. The user-facing UI is
already hidden in code/package contributions, so the next actionable slice is docs +
spec cleanup that makes the parked state explicit until quickchr lands.

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
**Status:** ✅ Done (2026-04-23)
**Outcome:** Removed the obsolete commented serializer and synced the README format description to the current implementation.

### 4. Error Detection Patterns (Regex vs LSP)
**Problem:** Error detection is currently regex-based and incomplete. Not robust across RouterOS versions.
**Action:** Research and propose improvements: expand regex patterns, move to LSP-based detection, or auto-generate from docs.

### 5. Metadata and Output Persistence in Notebooks
**Problem:** Notebooks do not persist outputs or metadata, blocking features like collapsed state, per-cell settings, and output saving.
**Action:** Move this to a spec-backed implementation slice before coding. The spec
needs to answer: what metadata is persisted, whether output persistence is per-cell
or per-notebook, how `.md.rsc` and `.rsc.md` encode it, and what stays transient.

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

### 🟡 Active items

1. **Decide scope for `scripts/lint-sanity.ts`** (LMA-5)
   - **Files:** tools/eslint/vscode-sanity.mjs, docs/linting-migration-audit.md
   - **Issue:** Three archived lint checks still have no replacement (`require-eventemitter-dispose`, `no-floating-disposable`, `vscode-api-version-compat`).
   - **Decide:** What belongs in a standalone audit script versus documented review guidance. Keep Biome as default; only add a script for the highest-value checks.

2. **VM-integration patterns guide** (parked)
   - The CHR/UTM provider work is currently de-exposed (Theme 1 in ROADMAP.md). Defer write-ups (`docs/vm-integration-patterns.md`, async-safety patterns) until the quickchr replacement lands and the patterns are re-validated against real code rather than parked code.

3. **Command boundary type guards pattern** (15 min, design-light)
   - **File:** docs/conventions.md - add a section after "Type Safety".
   - **Context:** Applied during the 2026-02-27 hardening pass (vm-commands.ts).
   - **Cover:** problem (`unknown` args + fragile optional chaining), solution (`is*` guards), when to use (all command handlers + argument unpacking).

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

- 2026-04-26: Removed remaining commented-out dead code blocks (`converters.ts` JSON-array clipboard try/catch + inline regex hints, `virtualdocs.ts` alternative `activeNotebookEditor` getter, `commands.ts` `routeroslsp.runCommand` placeholder). Re-implementing the LSP-log path is parked until it has a spec.
- 2026-04-26: De-duplicated `llm-todos.md` — collapsed the trailing "Code Cleanup & Technical Debt from Comments" section into the active item list, dropped Quick-Code-Wins entries already shipped, and removed the stale "Recommended Priority Path" plan.
- 2026-04-23: Cleaned up Markdown RouterOS notebook parsing in `src/notebook.ts` by extracting named separator/shebang regexes, removing dead metadata parsing code, and dropping the obsolete commented serializer block.
- 2026-04-23: Added notebook tests that cover explicit Markdown cell breaks, reserved metadata suffix handling, and consecutive-markdown serialization.
- 2026-04-23: Aligned CHR/UTM docs with the current parked state in `README.md`, `CLAUDE.md`, and `docs/specs/README.md`.

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
