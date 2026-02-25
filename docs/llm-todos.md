# LLM TODOs

This file tracks deferred cleanup and suggestions from LLM sessions. Add new items here when a good idea is identified but not acted on immediately.

## 🔴 High Priority Tasks

These items should be addressed soon:

### Create Root DEVELOPMENT.md Entry Point

**Files affected:** DEVELOPMENT.md (new), docs/development/ (folder reorganization)
**Reason:** Agents need a single discoverable entry point like CONTRIBUTING.md. Currently LLM guidance is scattered across docs/.
**Priority Note:** Plan this before implementing; impacts file layout and Copilot instructions organization.
**Future steps:**

1. Review current structure and decide on docs/development/ subfolder
2. Create DEVELOPMENT.md at root that points to all LLM guidance
3. Update .github/instructions/ files to reference DEVELOPMENT.md
4. Validate all internal markdown links

### Hide Interactive REPL Behind Experimental Features

**Files affected:** menus.ts, package.json, notebook.ts, README.md
**Reason:** Not well documented; keep for now but hide behind Experimental Features setting
**Priority Note:** Lower priority compared to core notebook and transport work; treat as an example of experimental feature gating
**Steps:**

1. Add a JSON-only setting (no UI) to enable experimental features
2. Gate REPL command/menu items behind the setting
3. Add a short touchpoint map in FUTURE_FEATURES.md (commands, menus, controller)
4. Update README.md to mark REPL as experimental and hidden by default

### Rationalize Notebook Serialization Code

**Files:** notebook.ts lines 560-599, README.md format specification
**Issue:** Code and README are out of sync. Commented code uses different markers (`#|`, `#.`) than current implementation.
**Task:** Either document why alternative code is preserved (reference? future format?) or remove as dead code. Ensure README format spec matches actual implementation.

## Pending Tasks

### SystemScriptFS Completion and Organization

**Context:** Auto-mount is commented out in extension.ts lines 39-57 for debugging purposes (this is intentional). More work planned before enabling.
**Tasks:**

1. Complete scriptfs.ts implementation (current version not fully correct)
2. After scriptfs is complete, rationalize overlap between scriptfs.ts and virtualdocs.ts
3. Consider broader task: disable/gate experimental features properly
**Note:** Auto-mount comment-out is temporary for debugging - not a decision point

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

### RouterOS /app Dev Workflow (VS Code)

**Context:** Support custom /app container development/testing from VS Code.
**Tasks:**

1. Add UI to manage `/app` entries (list, view YAML, enable/disable, cleanup)
2. Support local `app-store-urls` testing workflow (serve YAML from VS Code)
3. Add helper for "edit/repull" workflow (copy YAML, re-add, cleanup)
4. Auto-configure YAML schema for RedHat YAML extension when TikBook activates

- Check if schema is already configured
- Prompt to add or auto-add based on JSON-only setting
- Also document manual steps in README

### RouterOS Certificate UX

**Context:** VS Code UI for RouterOS certificates is missing. Users also need a simple path to wrap certs for deployment.
**Tasks:**

1. Add VS Code UI management for RouterOS certificates (import, view, export, delete)
2. Add support to wrap certificates into mobile/desktop deployment formats (e.g., .mobileconfig)
3. Recommend supporting VS Code extensions for schema/validation of those formats

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
