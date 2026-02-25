# TikBook Architecture & Design Decisions

This document captures key architectural decisions and component relationships for TikBook. Use this to understand cross-component impacts before proposing changes.

## Component Overview

### TikBook Extension (src/)

Main VS Code extension that integrates with RouterOS. Provides notebooks, virtual filesystem, and commands.

**Key responsibilities:**

- Notebook kernel implementation (tikbook, markdown-routeros formats)
- Virtual file system providers (rscfile://, rscena://)
- VS Code UI (commands, menus, status bar, webviews)
- REST API client coordination with RouterOS LSP

**Does NOT own:**

- Language parsing / syntax validation → RouterOS LSP
- LSP command execution → RouterOS LSP

### RouterOS LSP Extension (separate repo)

Generic language server for RouterOS scripts. Provides syntax validation, diagnostics, completions, hover info.

**Key responsibilities:**

- RouterOS script parsing and validation
- Diagnostics and hover information
- Code completion and symbol lookups
- Signature help

**Coordination with TikBook:**

- TikBook provides credentials to LSP (optional, via settings)
- LSP validates code; TikBook decides execution
- Both extensions connect to same RouterOS (by default)

## Core Architectural Patterns

### Transport Abstraction (Future)

RouterOS can be reached via REST API, SSH, or native API. Currently only REST is implemented.

**Decision:** Transport choice affects:

- Available operations (some only work on native API)
- Credential management (different auth models)
- Performance characteristics
- Web vs. desktop availability

**See:** [docs/future-features.md](future-features.md) for SSH/native API transport design notes.

### Virtual File Systems

Three ways to view/edit RouterOS content in VS Code:

1. **rscena://** (virtual docs) - Read-only preview of exported data (CSV, global functions, etc.)
2. **rscfile://** (scriptfs) - Read-write filesystem for `/system/script` (experimental, auto-mount commented out)
3. **Notebooks** - Cell-based execution and documentation

**Potential conflict:** Users may be confused by 3 different views of RouterOS content. Consider consolidating or clarifying use cases.

### Notebook Serialization

Two formats, one kernel:

- `.md.rsc` / `.tikbook` - RouterOS script with Markdown markers (`#.markdown`, `#.`)
- `.rsc.md` / `.rscmd` - Markdown with ` ```routeros ` code fences

**Design decision:** Single kernel abstracts format differences. Serializers handle conversion.

**See:** notebook.ts lines 560-599 (alternative serialization code, commented out) - may reference future metadata format.

### Metadata Support (Planned)

Notebooks currently have transient metadata (not persisted). Blocking features:

- Output persistence (save cell outputs)
- Collapsed state persistence
- Per-cell skip flags
- Execution timing info

**Implementation challenge:** Different formats handle metadata differently:

- `.md.rsc`: Could use custom comment blocks
- `.rsc.md`: Could use footnote-style fake references

### Error Detection

Currently regex-based (7 patterns in notebook.ts lines 465-471). Incomplete and version-specific.

**Options:**

- Expand regex database
- Move to RouterOS LSP
- Use LSP diagnostics

## Known Architectural Debt

### scriptfs.ts Uses Node util

Uses `TextEncoder/TextDecoder` from Node's util module. Not available in VS Code web.

**Impact:** SystemScriptFS cannot be auto-mounted in web unless gated to desktop or replaced with global TextEncoder/TextDecoder.

**Status:** Auto-mount is commented out in extension.ts pending this fix.

### Duplicate Output Channels

schema-mapper.ts and scriptfs.ts both create channel named "RouterOS Virtual FileSystem". May confuse Output panel organization.

**Solution:** Consolidate or rename to distinguish purposes.

### Commented Serialization Code

notebook.ts lines 560-599 contain ~50 lines of alternative serialization logic with different markers (`#|`, `#.`).

**Unknown:** Is this reference implementation, abandoned approach, or future format?

**Action needed:** Clarify and document or remove.

## Data Flow

### Notebook Cell Execution

```text
User types in cell → TikBook notebook.ts → RouterRestClient → RouterOS REST API
User executes cell → Cell code sent to RouterOS → Response parsed → Error detection → Output rendered

### Credential Sync

```text
User sets password in TikBook → Stored in SecretStorage
On activation → TikBook reads secret
Optionally → TikBook sends creds to RouterOS LSP (if setting enabled)
```

### Virtual Docs (rscena://)

```text
User selects "Show CSV" → TikBook REST call → Format to CSV → Create TextDocument via createVirtualDocument
User selects "Refresh" → New REST call → Diff content → Update editor
```

## Extension Modes (Desktop vs Web)

### Desktop (default)

- Full access to Node APIs (https, path, util)
- SSH support possible
- File system access
- All features available

### VS Code for Web

- No Node APIs
- No SSH
- REST API (requires CORS proxy)
- No systemscriptfs auto-mount
- Limited virtual file system

**Gating:** Use `vscode.env.uiKind` (DESKTOP vs WEB) to branch behavior.

## Decision Points Pending

See [docs/future-features.md](future-features.md) for:

- REPL: Keep or remove?
- Video player: Experimental or stable?
- SystemScriptFS auto-mount: Enable or keep manual?
- Output persistence: Always, never, or configurable?
- Error detection: Expand regex or move to LSP?
- Transports: Design abstraction for REST/SSH/native API

## Adding New Features

Before starting work:

1. Identify which component owns the feature (TikBook vs LSP)
2. Check if it affects transport abstraction
3. Consider web vs desktop implications
4. Update this document if architecture changes

## References

- [Extension activation flow](../src/extension.ts)
- [REST client](../src/shared.ts)
- [Notebook implementation](../src/notebook.ts)
- [docs/future-features.md](future-features.md) for pending decisions
- [docs/llm-todos.md](llm-todos.md) for cleanup items
