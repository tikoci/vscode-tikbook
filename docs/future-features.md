# Future Features & Capabilities

This document tracks potential features, enhancements, and architectural improvements for TikBook. Items here may require significant design work, cross-component changes, or depend on external factors (like RouterOS or VS Code API changes).

## 🔴 Decision Points - Choices Required

These items require architectural or product decisions before implementation can proceed:

### 1. Interactive REPL Feature - Keep or Remove?

**Location:** menus.ts line 120, notebook.ts  
**Current Status:** Fully implemented and accessible via "Start Interactive REPL" command  
**Issue:** README states "Not sure it's useful and may be removed in future versions"  
**Decision Needed:**

- **Keep:** Document use cases, improve UX, promote as feature
- **Remove:** Clean up code, remove from menus, deprecate in changelog
- **Improve:** Rework to address specific use cases (debugging, quick tests, etc.)

**Considerations:**

- Does it provide value over regular notebooks?
- Are users actually using it?
- Storage model differs from notebooks (tape vs. cells)

### 2. Video Player - Experimental or Stable?

**Location:** video.ts (fully implemented)  
**Current Status:** Experimental feature with working implementation  
**Issue:** MP3 audio requirement, platform-specific audio issues  
**Decision Needed:**

- **Promote to Stable:** Document fully, fix remaining audio issues, commit to maintenance
- **Keep Experimental:** Document as beta feature, limited support
- **Extract to Separate Extension:** Make generic video player for VS Code ecosystem
- **Remove:** If use cases are unclear and maintenance burden is high

**Considerations:**

- Primary use case (training videos, documentation, screen recordings?)
- Maintenance burden vs. value
- Whether multimedia notebook features justify complexity

### 3. SystemScriptFS Auto-Mount - Enable or Keep Manual?

**Location:** extension.ts lines 39-57 (commented out)  
**Current Status:** Write support implemented, auto-mount disabled  
**Issue:** Auto-mounting scripts filesystem is commented out  
**Decision Needed:**

- **Enable Auto-Mount:** Uncomment code, test, make it default behavior
- **Keep Manual Only:** Users explicitly mount when needed
- **Make Configurable:** Add setting to control auto-mount behavior
- **Improve UX:** Better prompts/notifications for mounting

**Considerations:**

- Performance impact of auto-mounting
- User confusion if scripts appear unexpectedly
- Discoverability if manual-only

### 4. Output Persistence - Always, Never, or Configurable?

**Location:** notebook.ts - `transientOutputs` flag  
**Current Status:** Always transient (never saved)  
**Issue:** No way to save notebook outputs currently  
**Decision Needed:**

- **Always Save:** Change `transientOutputs: false` globally
- **Never Save:** Keep current behavior (transient)
- **User Setting:** Global on/off in settings
- **Per-Notebook Metadata:** Each notebook decides
- **Per-Cell Metadata:** Each cell can opt-in/out

**Considerations:**

- File size growth with saved outputs
- Sensitive data in outputs (passwords, configs)
- Version control diff complexity
- Loading performance with large outputs

### 5. Error Detection Strategy - Expand Regex or Use LSP?

**Location:** notebook.ts lines 465-471  
**Current Status:** 7 hardcoded regex patterns  
**Issue:** Incomplete error pattern coverage  
**Decision Needed:**

- **Expand Regex:** Research and add more error patterns
- **Move to LSP:** Have RouterOS LSP detect and report errors
- **Hybrid:** Use both approaches
- **Parse RouterOS Docs:** Auto-generate patterns from official docs

**Considerations:**

- Maintenance burden of regex patterns
- RouterOS version differences
- LSP architectural changes required
- False positive/negative rates

---

## ⚠️ Feature Dependencies & Conflicts

These features have interdependencies or potential conflicts that need coordination:

### Output Persistence ↔ Metadata Support ↔ Collapsed State

**Relationship:** All three require notebook metadata infrastructure  
**Issue:** Implementing metadata support blocks/enables all three features  
**Implementation Order:**

1. Build metadata serialization infrastructure for both .md.rsc and .rsc.md formats
2. Add collapsed state persistence (simpler, good test case)
3. Add output persistence with configurability
4. Use metadata for other features (cell tags, skip flags, timing info)

**Conflict:** Output persistence settings (global vs per-notebook vs per-cell) affects metadata schema design

### LSP Cell Execution ↔ Error Detection ↔ REST-able Commands

**Relationship:** Moving execution to LSP affects error detection and REST optimization  
**Issue:** Current error detection is in TikBook, moving to LSP changes architecture  
**Trade-offs:**

- Moving to LSP: Better error detection, but requires LSP changes
- Keeping in TikBook: Easier short-term, but duplicate logic
- Hybrid: Complex architecture, harder to maintain

**Conflict:** REST-able command detection (for JSON output) is intertwined with cell execution logic

### SystemScriptFS ↔ Virtual Documents ↔ Notebook Integration

**Relationship:** All three deal with RouterOS script representation in VS Code  
**Issue:** Three different ways to view/edit RouterOS scripts could confuse users  
**Clarity Needed:**

- Virtual Documents (rscena:) = Read-only views for preview/export
- SystemScriptFS (rscfile:) = Read-write filesystem for /system/script
- Notebooks = Cell-based execution and documentation

**Potential Conflict:** User expectations about syncing between representations

### Settings Expansion ↔ UI Complexity

**Relationship:** More settings = more power but more complexity  
**Issue:** Finding balance between control and simplicity  
**Considerations:**

- Default behaviors should work for 80% of users
- Advanced settings in separate section
- Settings validation and helpful error messages
- Settings presets for common scenarios (dev, production, read-only)

### i18n Support ↔ Code Organization

**Relationship:** String extraction affects all source files  
**Issue:** Refactoring all hardcoded strings is large, cross-cutting change  
**Strategy:**

- Do as separate dedicated effort, not incrementally
- Use TypeScript for type-safe string keys
- Consider VS Code's l10n API vs custom solution
- Plan for future: even if English-only now, structure for later

---

## Notebook Capabilities

### Notebook Output Persistence

**Status:** Planned (mentioned in Known Issues and README)  
> **Implementation Status:** Confirmed NOT implemented - notebook.ts line 15/22/29/36 sets `transientOutputs: true` which prevents output persistence.

**Description:** Implement option to save each cell's outputs to the notebook file on disk. This is a standard notebook feature that allows viewing previous execution results without re-running cells.  
**Considerations:**

- Should be a user setting (on/off)
- Need to balance file size vs. utility
- Consider output types: text, JSON, errors, timing info
- May need per-notebook or per-cell granularity for output saving
- Requires notebook metadata support (see below)

### Notebook Metadata Support

**Status:** Planned (README states "neither is supported today")  
> **Implementation Status:** Confirmed NOT implemented - notebook.ts sets all metadata as transient. Format specs exist in serializers but no persistence layer.
>
> **Code Note:** notebook.ts line 269 has commented metadata parsing code: `commitPending('markdown', rawMetadataParsed.groups?.[3])`. This suggests partial implementation started but was disabled.
>
> **Alternative Approach:** notebook.ts lines 560-599 contains ~50 lines of **completely different serialization logic** using different markers (`#|` for markdown, `#.` for code end). This commented code may represent:
>
> - An earlier serialization format that was replaced
> - An alternative format being considered
> - Reference implementation for a future format
> **Decision Needed:** Clean up this dead code or document its purpose for future reference.

**Description:** Implement metadata support in notebooks to enable advanced features.  
**Use Cases:**

- Store options for saving outputs (per-notebook or per-cell)
- Track collapsed state of notebook sections
- "Skip cells" flag during "Run All Cells" execution
- Store execution timing, last run timestamp
- Custom cell tags or labels
**Implementation Notes:**
- `.md.rsc` format: Could encode in special comment blocks
- `.rsc.md` format: Could use fake footnote with parentheses `[//]: #. (key=val)`
- Need to maintain backward compatibility with existing notebooks
- notebook.ts lines 560-599 contain large commented block of **alternative serialization approach** that may be useful reference for metadata implementation

### Collapsed Section State Persistence

**Status:** Known limitation in README  
> **Implementation Status:** NOT implemented - notebook.ts explicitly marks `inputCollapsed` and `outputCollapsed` as transient metadata.

**Description:** Save and restore collapsed state of notebook sections across sessions. Currently, section folding doesn't persist when reopening notebooks.  
**Dependencies:** Requires notebook metadata support

### Error Detection Improvements

**Status:** Known Issue  
> **Implementation Status:** PARTIALLY implemented - notebook.ts lines 465-471 has 7 error patterns: "bad command", "no such item", "value of...out of range", "invalid value for argument", "Script Error", "syntax error", "expected end of command". More patterns may be needed.

**Description:** Improve error detection after notebook cell runs. Currently uses regular expressions with an incomplete set of error strings from RouterOS.  
**Approach:**

- Build comprehensive error string database from RouterOS documentation
- Consider using RouterOS LSP for error detection
- May need RouterOS version-specific error patterns
- Consider monitoring RouterOS releases for new error messages

### Syntax Coloring in Markdown-RouterOS Notebooks

**Status:** Known Issue  
> **Implementation Status:** NOT implemented - no embedded language support found in codebase. RouterOS LSP needs enhancement.

**Description:** Syntax coloring doesn't work in `markdown-routeros` notebooks when using "Markdown First" format (`.md` files with ` ```routeros ` code fences).  
**Blockers:**

- Requires RouterOS LSP support for "embedded languages"
- VS Code doesn't automatically wire up code blocks to LSP servers
- Needs custom proxy to connect grammars to LSP
- See VS Code documentation on embedded languages

### Markdown Preview Coloring

**Status:** Technical Debt  
**Description:** Even with embedded language support, markdown preview window uses its own JS library for syntax coloring instead of VS Code's theme/grammar system.  
**Research Needed:**

- Investigate hooks to override preview window coloring
- Ensure consistency between editor and preview
- May require VS Code extension API changes or workarounds

## Router Connectivity & Web Support

### Bidirectional `/system/script` Integration

**Status:** Work in Progress - Intentionally incomplete  
> **Implementation Status:** PARTIALLY implemented - scriptfs.ts has full FileSystemProvider with write support (line 555+). SystemScriptFS is initialized in extension.ts but auto-mounting is DISABLED (commented out lines 39-57) **for debugging purposes**. Current implementation is not fully correct.
>
> **Development Notes:**
>
> - Auto-mount commented out intentionally while debugging - this is expected
> - Implementation needs completion before enabling auto-mount
> - After completion, needs rationalization with virtualdocs.ts (some overlap exists)

**Description:** Current "Create Notebook from System Scripts" and "Show Scripts as :global functions" are one-way: router to editor. Building toward bidirectional sync.  
**Current Behavior:**

- Can import scripts from router to create notebook (one cell per script)
- Can view scripts as :global functions in text document
- No sync back to `/system/script` - must manually cut-and-paste
**Future Approach:**
- VS Code virtual file system for `/system/script`
- Real-time sync between local notebook cells and router scripts
- Conflict resolution when scripts change on router
- Option to push/pull individual scripts or entire notebook
**Implementation:**
- May use scriptfs.ts as starting point
- Need to handle script metadata (name, policy, owner)
- Watch for changes on router side

### CORS Proxy Support for VS Code for Web

**Status:** Known Limitation  
**Description:** VS Code for Web can load/save TikBook files but cannot run scripts due to CORS restrictions (RouterOS lacks CORS support).  
**Approach:**

- Document how to setup a CORS proxy
- Provide example proxy configurations
- Consider bundling simple proxy server or providing Docker image
- Update settings UI to configure proxy URL

### SSH Transport for Notebook Execution

**Status:** Missing feature  
**Description:** Support SSH as an execution transport for TikBook and RouterOS LSP, using private keys and existing `ssh` tooling.  
**Use Cases:**

- Execute notebook cells over SSH when REST is unavailable
- Run internal operations like `/console/inspect` and return JSON via `:serialize` to keep downstream logic consistent
- Allow hybrid mode: REST for data, SSH for execution-sensitive commands
**Implementation Ideas:**
- Add transport setting: `routeros.transport = rest|ssh|auto`
- Use `ssh` to run `:execute` and `:serialize` with consistent output parsing
- Reuse existing `sshCommand` setting and key-based auth
- Coordinate with RouterOS LSP so both extensions use same transport

### Native RouterOS API Transport

**Status:** Missing feature  
**Description:** Add support for the native RouterOS API as a transport. Key benefit is a `listen`-style model that fits JS/TS eventing.  
**Constraints:**

- Desktop only (not available in VS Code for Web)
- Requires new transport abstraction shared by TikBook and RouterOS LSP
**Goals:**
- Add transport setting: `routeros.transport = rest|ssh|api|auto`
- Use API `listen` for streaming/monitoring use cases
- Keep output format consistent with existing REST/SSH paths
- MVC-style separation in codebase to keep transport pluggable
**Actionable First Step:**
- Define a shared transport abstraction spec (interfaces, data contracts, error mapping)
- Decide whether TikBook, RouterOS LSP, or both own transport selection
**Design Note:**
- Transport choice is tightly coupled to credential management and profile support
- REST needs username/password; SSH needs key/agent; API needs its own auth model
- Profile support should store transport + credentials together to avoid mismatches
- Plan transport abstraction and profile/credential storage as one coordinated effort

### Enhanced Connection Status

**Status:** Partially Implemented  
> **Implementation Status:** Status bar implemented in watchdog.ts with connection checking. However, NO `when` context for connection state exists (only `tikbook.usingSecrets` context in config.ts).

**Description:** Status bar watchdog shows connection status, but more integration needed.  
**Enhancements:**

- VS Code custom `when` context for connection state (see LLM_TODOS.md)
- Show router model, version, identity in hover
- Connection health indicators (latency, packet loss)
- Auto-reconnect logic with backoff

### Connection Profiles

**Status:** Missing feature  
**Description:** Support multiple RouterOS connection profiles without editing global settings each time.  
**Challenges:**

- VS Code credential management is limited
- Need profile storage that works across tools
**Ideas:**
- Profile selector UI in status bar / command palette
- Use OS keychain (macOS Keychain, Windows Credential Manager, etc.) for profile secrets
- Optional profile import/export format

## LSP Integration & Code Movement

### Move Cell Execution to RouterOS LSP

**Status:** Technical Debt - High Priority  
> **Implementation Status:** NOT moved yet - cell execution still in notebook.ts (TikbookControllerBase class). LSP integration exists only for credential syncing (watchdog.ts lines 153-189). Cell execution uses direct RouterRestClient, not LSP commands.

**Description:** Move notebook cell execution from TikBook extension to RouterOS LSP to avoid duplication and enable non-VS Code LSP clients to use notebook features.  
**Benefits:**

- Single source of truth for RouterOS interactions
- Other LSP clients (Vim, Emacs, etc.) can use notebook features
- Better separation of concerns
- Unified error handling

**Implementation:**

- Use `workspace/executeCommand` LSP message
- Define custom LSP commands for cell execution
- TikBook becomes thin UI layer over LSP

### LSP-Based Diagnostics for Notebooks

**Status:** Technical Debt  
**Description:** LSP already highlights errors in notebook cells, but doesn't add them to VS Code's "Problems" panel.  
**Implementation:**

- Configure LSP to send diagnostics for notebook documents
- Map notebook cell positions to diagnostic ranges
- Ensure proper cleanup when cells are deleted/moved

### REST-able Commands Detection Using LSP

**Status:** Technical Debt  
**Description:** TikBook currently uses regex to detect commands that can be executed via REST API (for JSON output). LSP already has tokens and can calculate this more accurately.  
**Approach:**

- LSP provides "Hints" for REST-able commands
- TikBook uses hints to decide when to make additional REST calls
- Enables more commands beyond just `print`
- Diagnostic hints could mark REST-compatible vs. REST-incompatible code

## REST API Enhancements

### Expanded REST Command Support

**Status:** Concept (from "REST-able commands" note in Changelog)  
**Description:** Expand which RouterOS commands can be executed via REST API for structured JSON output.  
**Current:** Only works with simple `/path/to/command/print` patterns  
**Future:**

- Support GET on RouterOS paths (configuration queries)
- Support POST for `print` and `monitor` commands
- Handle more complex expressions: `/ip/address { ...code...; print }`
- Investigate `:put [:serialize to=<json|dsv> [<code>]]` approach
- Allow notebook cells with just a "path" to execute as GET

**Benefits:**

- Richer data output in notebooks
- Better integration with Data Table Renderers extension
- Enable interactive data exploration
- Support for streaming monitor output

## UI & User Experience

### Settings Configuration Improvements

**Status:** Known Issue  
> **Implementation Status:** Very limited - only 7 settings in package.json lines 122-179. Most behaviors are hardcoded without user control.

**Description:** More user settings needed to control internal behavior and enable/disable UI elements (currently hardcoded).  
**Areas:**

- Output format preferences (JSON, CSV, table, raw)
- Default cell language (RouterOS vs. markdown)
- Auto-save behavior
- Error handling verbosity
- UI element visibility (CodeLens, decorations, status bar items)

### RouterOS Certificate Management UX

**Status:** Missing feature  
**Description:** Provide VS Code UI to manage RouterOS certificates and help users deploy them to devices.  
**Scope Ideas:**

- View/import/export/delete RouterOS certificates
- Wrap certificates for deployment (e.g., .mobileconfig or platform-specific bundles)
- Recommend VS Code extensions that provide schema support for those formats

### Walkthrough Experience

**Status:** Removed in 0.3.1, planned for re-introduction as part of teaching features  
> **Implementation Status:** Completely removed - no walkthrough configuration in package.json.
>
> **Future Direction:** Part of broader vision to use TikBook for teaching/training RouterOS. Will be rebuilt with better content when teaching feature planning is complete.

**Description:** Create interactive walkthrough for new users to introduce TikBook features, setup connection, create first notebook.  
**Content Ideas:**

- Setting up RouterOS connection
- Connecting to router and verifying settings
- Creating first notebook
- Understanding notebook formats (tikbook vs. markdown-routeros)
- Running cells and viewing output
- Using Quick Commander menus
- Working with REST output and renderers

### Video Player Enhancement

**Status:** Experimental - Placeholder for teaching features  
> **Implementation Status:** FULLY implemented in video.ts with webview panel, MP3 audio, WebVTT support. Audio issues are NOT code bugs but platform/environment limitations.
>
> **Purpose:** Long-term goal is to use TikBook for teaching/training RouterOS. Video player and walkthrough features are placeholders to judge feasibility and plan integration.
>
> **Outstanding Work:**
>
> - Document video conversion process (ffmpeg pipeline for MP3 audio conversion)
> - Create planning document for teaching feature integration
> - Consider how to gate/disable experimental features properly

**Description:** Current custom video player added to test concept and compatibility with full WebVTT support (chapters, subtitles, metadata).  
**Current Limitations:**

- Videos require audio re-encoded to MP3 for VS Code webview compatibility
- Some environments have no audio playback at all
- Cannot use simple YouTube iframe due to VS Code's strict HTML content policies
**Future:**
- Fix audio playback across all platforms
- Document use case (documentation videos? router screen recordings?)
- Integrate with documentation system
- Add multimedia features: load code/documents from video links, sync editor with video examples
- Consider as separate extension if generally useful

### RouterOS `/app` Dev Toolkit (VS Code)

**Status:** Missing feature  
**Description:** Provide a VS Code workflow for custom `/app` container development and testing.
**Ideas:**

- Explorer view for `/app` entries (name, status, version, url-path, icon)
- View YAML with schema validation and quick fixes
- One-click "rebuild from YAML" workflow (copy YAML, re-add, cleanup)
- Local app-store testing: serve `app-store-urls` from VS Code
- Helper for common `/app` tasks (enable/disable/cleanup/repull)
**Reference:** <https://forum.mikrotik.com/t/amm0s-manual-for-custom-app-containers-7-22beta/268036>

### Webview Renderers for RouterOS Config Items

**Status:** Future feature  
**Description:** Add a webview-based UI to render RouterOS config items and lists directly in VS Code.
**Use Cases:**

- Render config items from the virtual file system in a structured UI
- Provide table/detail views for `/ip/address`, `/interface`, `/firewall` entries
- Enable inline actions (enable/disable, reorder, edit) with generated RouterOS commands
**Considerations:**
- Reuse JSON output from REST or SSH execution
- Keep a consistent data model between notebook outputs and webview renderers
- Provide read-only mode for safety

## AI & Copilot Integration

### GitHub Copilot Enhancement for RouterOS

**Status:** Concept mentioned in README  
**Description:** Currently, Copilot "Generate" in notebooks relies solely on generic Copilot logic with marginal RouterOS-specific results. TikBook could augment Copilot with RouterOS context.  
**Enhancements:**

- Provide current router configuration to Copilot context
- Offer global variables from `/system/script/env` as context
- Add RouterOS-specific prompting tailored to syntax and idioms
- Include RouterOS version information for version-specific features
- Provide schema information about available commands and parameters
**Benefits:**
- More accurate code generation for RouterOS scripts
- Context-aware suggestions based on actual router state
- Better error handling and RouterOS best practices

## Architecture & Code Quality

### VS Code Version Compatibility Strategy

**Status:** Infrastructure in place (vscode-compat.ts)  
**Description:** Comprehensive version detection and feature detection system exists. Currently supports VS Code 1.78.2+ with graceful degradation for missing features.
**Maintained Features:**

- Minimum version: 1.78.2 (June 2023)
- Feature flags for optional APIs (logOutputChannel, notebookEnhancedOutput, tabGroups, etc.)
- Runtime environment detection (web vs desktop, VS Code variants)
- Web-specific limitation handling
**Future Considerations:**
- When to drop support for older versions?
- How to communicate version requirements to users?
- Should certain features be gated behind newer VS Code versions?

### Internationalization (i18n) Support

**Status:** Technical Debt  
**Description:** Even though only English is planned, extract all user-facing strings to i18n files.  
**Benefits:**

- All strings in one place makes editing easier
- Code becomes cleaner without hardcoded strings
- Community could contribute translations if desired
- RouterOS itself is English-only, but UI strings could be localized

**Files Likely Affected:** Most TypeScript files in src/, especially extension.ts, commands.ts, menus.ts

### Virtual Document Protocol (`rscena:`)

**Status:** Implemented in 0.3.1 as experimental  
**Description:** Virtual read-only text document protocol for presenting RouterOS exports, system scripts, and notebook format previews.  
**Future Enhancements:**

- Support for more RouterOS data types (logs, monitoring data)
- Live-updating virtual documents (for monitoring)
- Diff view between router state and local files
- History/versioning of exports

### Virtual File System Support for `/rest/file`

**Status:** Missing feature  
**Description:** Extend the RouterOS virtual file system to support `/rest/file`, allowing access to non-script files (e.g., backups, certificates, exports, custom files).
**Use Cases:**

- View and download files from RouterOS storage
- Support file types beyond `.rsc` scripts
- Enable workflows for config backups and container assets
**Considerations:**
- Read-only vs read-write access
- Size limits and download streaming
- MIME type handling and editor associations

### RouterOS `/app` YAML Schema Verification

**Status:** Missing feature  
**Description:** Add validation for RouterOS container `/app` YAML manifests, including schema checks and diagnostics.  
**Reference:** <https://forum.mikrotik.com/t/amm0s-manual-for-custom-app-containers-7-22beta/268036/4>
**Scope Ideas:**

- Provide YAML schema for RouterOS `/app` format
- Validate required fields and value types
- Offer diagnostics and quick fixes in VS Code
- Integrate with RouterOS LSP for shared validation logic
- Include example templates and snippets for container apps
**Schema Sources:**
- Single-app schema: <https://tikoci.github.io/restraml/routeros-app-yaml-schema.latest.json>
- App-store schema: <https://tikoci.github.io/restraml/routeros-app-yaml-store-schema.latest.json>
**Editor Integration:**
- Recommend YAML extension (redhat.vscode-yaml)
- Support `# yaml-language-server: $schema=...` header for per-file validation
- Map `.tikapp.yaml` and `.tikappstore.yaml` patterns in settings
- Offer auto-config on TikBook activation (prompt or auto-add via JSON-only setting)

### RouterOS REST API Validation using RAML

**Status:** Future enhancement  
**Description:** Use RAML schemas from `tikoci/restraml` to validate REST calls and assist agentic workflows.
**Ideas:**

- Validate REST endpoint paths and parameters before execution
- Use schema for auto-complete and command hints
- Support "base" vs "+extra" schemas for package-specific commands
**Notes:**
- restraml schema is generated from `/console/inspect` and is convenience-focused, not strict validation
- OAS2 is available; OAS3 conversion currently fails validation (but may still load in some tools)
- Prefer RAML where supported, use OAS2 when needed
**Reference:** <https://tikoci.github.io/restraml>

## Cross-Extension Integration

### Converters and Helper Commands

#### JSON Key Formatting Options

**Status:** Should be configurable setting, coordinated with RouterOS LSP  
**Location:** converters.ts line 154 (commented code)
**Description:** The JSON-to-RouterOS-Array converter currently always quotes object keys for safety/simplicity:

```routeros
{"name"="test";"count"=5;"ip-address"="192.168.1.1"}
```

Commented code suggests an alternative that only quotes keys with special characters (spaces, `=`, `;`):

```routeros
{name="test";count=5;"ip-address"="192.168.1.1"}
```

---

## Developer Tooling

### VS Code Log Extraction Helper

**Context:** Troubleshooting VS Code extension issues often requires output from UI channels (Output panel, Testing view, etc.).

**Problem:** Today, this requires manual copy/paste of logs from VS Code UI into chat. This slows down debugging and is error-prone.

**Idea:** Provide a helper command or lightweight companion extension/MCP tool that can collect selected VS Code logs and share them with Copilot on request.

**Decision Needed:** Determine whether to implement as:

- A TikBook command that reads VS Code output channels
- A small separate debug extension
- An MCP tool that exposes VS Code log access

**Considerations:**

- VS Code API access constraints (OutputChannel APIs vs. internal logs)
- Security and privacy (avoid leaking secrets)
- User consent and scope of logs collected

**Better Approach:** This should be part of broader "RouterOS Code Style" settings that coordinate between TikBook and RouterOS LSP (both from same author, designed to work together).

**Implementation Strategy:**

- Add setting in both TikBook and RouterOS LSP: `routeros.style.quoteArrayKeys` (options: "always", "asNeeded", "never")
- TikBook uses setting for JSON-to-Array conversion
- RouterOS LSP uses setting for code formatting/generation
- Consistent style across both extensions
- Could expand to other style settings: indentation, line endings, comment style, etc.

**Related:** This fits into broader need for coordinated settings between TikBook and RouterOS LSP (see "Enhanced RouterOS LSP Collaboration" section)

#### RouterOS Array to JSON Conversion

**Status:** Requested feature (README notes "no RouterOS Array to JSON")  
**Description:** Currently, only JSON to RouterOS Array conversion is supported via "Copy as RouterOS Array" command. Reverse conversion would be useful.  
**Approach:**

- Use RouterOS `[:serialize to=json]` from notebook (more exact and consistent)
- Or implement parser for RouterOS array syntax
- Challenge: RouterOS arrays can contain code/expressions, not just data
**Considerations:**
- May not be needed if `:serialize` approach is sufficient
- Parser would be complex due to RouterOS's flexible syntax

#### Additional Converters and Snippets

**Status:** "On the radar" per README  
**Description:** More conversion utilities and code generation helpers.  
**Ideas:**

- CSV to RouterOS commands (e.g., bulk add/set operations)
- Configuration diff to script (generate script to transform config A to config B)
- Export configuration as different formats (YAML, TOML for automation tools)
- RouterOS to Ansible/Terraform module generation
- Script templates/snippets for common tasks
- Regular expression builder/tester for RouterOS match patterns

#### Observable RouterOS Converters

**Status:** Integration idea  
**Description:** Integrate existing Observable tools into TikBook UI or commands.
**Candidates:**

- `utf2rsc` - UTF/emoji to RouterOS string escapes
- `csv2rsc` - CSV to RouterOS arrays
**Reference:** <https://observablehq.com/collection/@a2m0/mikrotik>

### Enhanced RouterOS LSP Collaboration

**Status:** Ongoing  
**Description:** Continue moving shared functionality to RouterOS LSP to serve as backend for both TikBook and standalone LSP clients. Both extensions are from same author and designed to work together.
**Areas:**

- Script execution
- Error detection
- RouterOS version-specific features
- API client code
- Authentication and connection management
- **Code style settings** (see JSON Key Formatting under Converters section)
  - Coordinate style preferences across both extensions
  - Consistent formatting in TikBook converters and LSP code generation
  - Potential settings: key quoting, indentation, line endings, comment style
- Settings schema coordination (avoid duplicate/conflicting settings)

### TIKOCI Tool Hub Integration

**Status:** Future enhancement  
**Description:** Make TikBook a jumping-off point to other TIKOCI tools that fit VS Code workflows.
**Candidates:**

- `restraml` diff tool (RouterOS command diff via webview)
- Schema downloads (RAML/OAS2/inspect.json) in VS Code
- `curl2rsc` (convert curl to `/tool/fetch`)
- RouterOS binary download helper
**Ideas:**
- Add Quick Commander menu entries
- Embed tools in webviews for offline-ish UX
- Allow "open in browser" fallback

### restraml Diff Webview

**Status:** Integration candidate  
**Description:** Embed `tikoci/restraml` diff UI in a VS Code webview for RouterOS command changes across versions.
**Ideas:**

- Webview wrapper around existing HTML UI
- Add better controls and filters in VS Code
- Allow diff against local `inspect.json` snapshots
- Export diff results to markdown reports

## Documentation & Developer Experience

### Video Content Conversion Pipeline

**Status:** Needed for teaching features  
**Description:** VS Code webview requires MP3 audio in video files. Need documented ffmpeg pipeline for content conversion.
**Requirements:**

- Input: Various video formats (MP4, WebM, etc.)
- Output: VS Code-compatible video (video with MP3 audio)
- WebVTT subtitle/chapter generation
- Automated conversion workflow
**Tools:**
- ffmpeg for audio transcoding
- Script/tool to batch convert teaching videos
- Documentation for content creators

### Experimental Features Management

**Status:** Needed - multiple experimental features lack proper gating  
**Description:** Several features are experimental/incomplete but lack proper mechanisms to disable or gate them.
**Affected Features:**

- Video player (intentionally experimental for teaching feature planning)
- SystemScriptFS (incomplete, auto-mount disabled for debugging)
- Interactive REPL (keep but hidden by Experimental Features setting)
**Approach:**
- Add configuration setting for "Enable Experimental Features"
- Gate experimental commands/menus behind this setting
- Clear documentation about what's experimental and why
- Separate experimental docs from stable feature docs
**Setting Note:**
- Experimental toggle should be a JSON-only setting (no UI), with REPL as the initial example of a hidden experimental feature
**Interactive REPL Touchpoints (short map):**
- Command registration for REPL launch
- Menu entry in Quick Commander
- Notebook controller for interactive kernel
- README section describing REPL behavior

### viewsWelcome Integration for ScriptFS

**Status:** Missing UX enhancement  
**Description:** Improve viewsWelcome content to guide users in mounting ScriptFS and using it in remote environments.
**Ideas:**

- Add viewsWelcome links for mount/unmount
- Add remote-specific guidance (ssh/containers/wsl)
- Link to ScriptFS docs and troubleshooting

### code-server Support Documentation

**Status:** Missing documentation  
**Description:** Document how to use TikBook with code-server, including limitations and required settings.
**Topics:**

- CORS and certificate requirements
- Remote port considerations
- Expected limitations in web vs desktop

### Removed/Disabled Features Documentation

**Status:** Process needed (when features are removed or permanently disabled)  
**Description:** When removing features from VS Code extensions, implementation details are often lost. Since features are spread across many files (commands, menus, serializers, etc.), document implementation before removal.
**Process:**

1. Before removing any feature, document its implementation in this file under "Removed Features" section
2. Include file locations, command names, registration points
3. Note the reason for removal and potential conditions for re-adding
4. Reference any related issues or discussions
**Note:** Interactive REPL is currently planned to be hidden behind Experimental Features rather than removed

### Removed Features

**Status:** Placeholder section for documenting removed features prior to deletion
**Template:**

- Feature name
- Why removed
- Files/commands involved
- How to re-enable (if applicable)
- Links to issues/notes

### CORS Proxy Documentation

**Status:** Needed  
**Description:** Document how to setup and use CORS proxy for VS Code for Web.  
**Content:**

- Why it's needed (RouterOS CORS limitations)
- Example proxy configurations (nginx, Node.js, etc.)
- Security considerations
- Testing and troubleshooting

### Extension Development Documentation

**Status:** Scattered in BUILD_TOOLING.md and changelog  
**Description:** Consolidate developer documentation.  
**Topics:**

- Extension architecture overview
- Module responsibilities (commands, notebook, scriptfs, etc.)
- Build and debug setup
- Testing strategy
- Release process
- Contributing guidelines

## RouterOS Feature Dependencies

These features depend on changes or additions to RouterOS itself:

### Native CORS Support

**Benefit:** Would eliminate need for CORS proxy in web environments  
**Likelihood:** Unknown - depends on MikroTik roadmap

### Enhanced REST API

**Benefit:** More operations available via REST, better JSON output formatting  
**Likelihood:** RouterOS REST API is actively developed, incremental improvements likely

### WebSocket Support

**Benefit:** Real-time monitoring and updates without polling  
**Likelihood:** Unknown - would be significant addition to RouterOS

---

## Notes

- Items in this document are **not prioritized** - they're collected possibilities
- Some items may never be implemented if they prove unnecessary or impractical
- **See [llm-todos.md](llm-todos.md) for actionable, near-term tasks**
- When items become actionable and clear, move them to llm-todos.md
- Cross-reference GitHub issues where applicable
