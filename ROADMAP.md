# TikBook Roadmap

Near-term agent-tracked work items. This is the **first stop** for "what should we
do next." It intentionally sits above the existing trackers in scope:

- `ROADMAP.md` (this file) — themes + seeded tasks with enough context to start
- [docs/llm-todos.md](docs/llm-todos.md) — 1–3 hour items with clear requirements
- [docs/specs/](docs/specs/README.md) — per-feature design lifecycle
  (`draft` → `under-review` → `ready-for-implementation` → `implemented`)
- [docs/future-features.md](docs/future-features.md) — long-horizon vision and decision points

`CHANGELOG.md` is **past-tense only**.

**Process:** when a roadmap item solidifies into a concrete design, spin up a spec
under `docs/specs/` and link it from the item here. When it ships, move the summary
into `CHANGELOG.md` and strike through the entry (or remove it).

---

## Theme 1: Shift CHR backend from UTM to quickchr

**Status:** proposed — 2026-04

**Why:** `tikoci/quickchr` is the designated QEMU/CHR expert in the tikoci ecosystem
and works cross-platform. The current `src/vm-providers/utm-provider.ts` is
macOS-only via AppleScript/utmctl, and the UTM path accumulated enough
platform-specific complexity (AppleScript permission prompts, UTM 3.x object model,
URL-scheme download flow) that a rewrite is cleaner than incremental porting.

Related: [docs/specs/chr-test-environment.md](docs/specs/chr-test-environment.md)
(currently scoped to UTM MVP — will need revision).

**Short-term handling:** keep the existing UTM/CHR implementation in-tree as
parked work, but do **not** surface it in the VS Code UI while the quickchr
direction is unresolved.

**Tasks:**

- [ ] De-expose the current CHR/UTM UI: stop contributing the explorer/commands
      and stop activating the provider while quickchr replacement is pending.
      Keep the code/tests/docs in-tree as parked implementation history.
- [ ] Capture everything we learned about UTM-from-VS-Code as a skill
      (AppleScript dictionary quirks, `utmctl` behaviour, `utm://` URL-scheme
      download flow, macOS permission prompt, VM list filtering). Candidate name:
      `tikoci-vscode-utm` (tikoci-scoped, since it's local-path-ish and
      VS-Code-specific). This is a **pocket reference** so the knowledge survives
      the removal of the provider code.
- [ ] Decide: **replace** or **both** — does `UTMProvider` stay as a macOS-only
      fallback behind a setting, or does quickchr fully subsume it? Default
      assumption: quickchr subsumes it.
- [ ] Remove `src/vm-providers/utm-provider.ts`, `utm-delete-strategies.sh`,
      `utm-diagnostic.sh`, `scripts/test-utm-*.sh`, `docs/UTM.sdef`,
      `docs/applescript-patterns.md` (or move what's still relevant into the
      skill), and the UTM-specific integration tests under
      `src/test/integration/utm-*`, `vm-applescript-*`.
- [ ] Wire `quickchr` (npm: `@tikoci/quickchr`) into `src/vm-providers/` as the
      primary provider. Keep the `VMProvider` interface; replace the
      implementation.
- [ ] Update `src/extension.ts` activation — it currently `new UTMProvider()` +
      registers it; swap for the quickchr-backed provider.
- [ ] Update `docs/specs/chr-test-environment.md` to the quickchr design (or
      open a new spec and mark this one abandoned).

## Theme 2: Broaden RouterOS virtual filesystem beyond the current ScriptFS slice

**Status:** proposed — 2026-04

**Why:** `rscfile://` is not just "mount `/system/script`." The next body of work is a
broader RouterOS virtual filesystem theme where the current script-attribute editor
is only **Story 1**. The roadmap needs to keep open the next decisions: how a user
picks a router, how much of the RouterOS command tree should be surfaced in VS Code,
when a resource should open as plain text vs. a TikBook notebook, and how `rscfile://`
stays aligned with `rscena://` / virtualdocs instead of drifting into two unrelated
UI models.

Related: [docs/specs/scriptfs-completion.md](docs/specs/scriptfs-completion.md),
[docs/architecture.md#virtual-file-systems](docs/architecture.md#virtual-file-systems),
[docs/future-features.md#systemscriptfs--virtual-documents--notebook-integration](docs/future-features.md#systemscriptfs--virtual-documents--notebook-integration).

**Tasks:**

- [ ] Treat current ScriptFS as **Story 1**: expose script-bearing RouterOS
      attributes as editable VFS resources, and do not mark the broader VFS theme
      "done" just because the current script slice works.
- [ ] Keep attribute identity primary: the tree should represent the editable
      attribute/file (`source`, `on-event`, `on-up`, etc.), not just the parent
      RouterOS item.
- [ ] Decide router-picking UX for VFS mounts: current configured router, explicit
      IP/DNS entry, future discovered routers (MNDP / `mcp-monorepo`), and
      credential / re-auth handoff.
- [ ] Decide how far the VFS tree goes inside VS Code:
      (a) script-bearing attributes only,
      (b) configured/read-only command-tree views surfaced through virtualdocs or a
      webview,
      (c) a fuller command-tree browser.
      Default assumption: keep the editable tree smaller than the full RouterOS tree.
- [ ] Decide presentation modes per resource: open as plain text editor, open as a
      TikBook notebook, or offer both with clear semantics.
- [ ] Align `rscfile://` and `rscena://` / virtualdocs so editable attribute
      resources and read-only configured/derived views share a coherent model
      instead of competing UX.
- [ ] Update the ScriptFS spec (or split a broader VFS spec) so the roadmap, spec,
      and current code all describe the same next slice of work.

## Theme 3: Bundle rosetta MCP with the extension

**Status:** proposed — 2026-04

**Why:** `tikoci/rosetta` is a SQLite-FTS5 RAG over RouterOS 7 docs exposed as an
MCP server. If TikBook auto-installs/configures it in the user's VS Code at
activation, every Copilot/Claude chat in the user's editor gets grounded
RouterOS-7 answers without the user having to know what MCP is.

**Tasks:**

- [ ] Decide **how** to ship: (a) declare a dependency and run it from
      `node_modules`, (b) bundle the SQLite DB + server, or (c) document manual
      install only. `(a)` is lowest maintenance; `(b)` is biggest "just works."
- [ ] Prototype `mcp.json` injection from the extension — VS Code supports
      workspace-scoped and user-scoped MCP. Prefer user-scoped with explicit
      opt-in.
- [ ] Handle the web target: rosetta is Node/SQLite — web target can only
      *document* the MCP, not run it.
- [ ] Add to `CLAUDE.md` + `.github/copilot-instructions.md`: "when touching
      RouterOS behaviour, reach for rosetta MCP first." *(Already in CLAUDE.md
      — add the Copilot side too.)*

## Theme 4: `/app` YAML JSONSchema + Monaco parity with tikapp.html

**Status:** proposed — 2026-04

**Why:** `tikoci/restraml` now publishes the JSONSchema for MikroTik's RouterOS
7.21+ `/app` YAML format, and `~/GitHub/restraml/docs/tikapp.html` demonstrates a
client-side Monaco editor that validates against it. TikBook should offer the same
validation + completion inside "real" VS Code — no browser detour.

Related: [docs/specs/app-yaml-schema.md](docs/specs/app-yaml-schema.md) (draft) +
[docs/future-features.md#routeros-app-yaml-schema-verification](docs/future-features.md).

**Tasks:**

- [ ] Fetch or bundle the `/app` YAML JSONSchema from restraml.
- [ ] Register it via VS Code's `yaml.schemas` contribution (requires
      `redhat.vscode-yaml` — either take it as a dep in `extensionPack` or
      degrade gracefully).
- [ ] Port the Monaco-specific UX tricks from `tikapp.html` — inline diagnostics,
      enum completions, device-mode constraints — adapting them to VS Code's
      editor APIs rather than raw Monaco.
- [ ] Document the trigger: file pattern (e.g. `*.app.yaml`, `app.yaml` inside a
      `/app`-shaped directory) — see the `routeros-app-yaml` skill for format
      rules.

## Theme 5: Ship RouterOS skills with the extension

**Status:** proposed — 2026-04

**Why:** The extension can do more than ship code — it can ship *agent context*.
`tikoci/routeros-skills` already holds the canonical public `routeros-*` skills
used by Copilot + Claude Code (currently consumed via symlinks from `~/.copilot/`
and `~/.claude/`). When TikBook is installed, we can make those skills available
to the user's VS Code Copilot automatically.

**Tasks:**

- [ ] Inventory what "install-time" agent surface VS Code exposes today —
      workspace `.github/copilot-instructions.md` injection? extension-provided
      chat participants? MCP registration? Skill directories?
- [ ] Decide **scope**: global user-level install vs. workspace-scoped. Avoid
      silently mutating user configs — require explicit opt-in via a
      welcome/walkthrough.
- [ ] Pick the shipping mechanism: git submodule of `tikoci/routeros-skills`, or
      npm dependency (if published), or bundled copy refreshed on release.

## Theme 6: Copilot integration surfaces inside TikBook

**Status:** proposed — 2026-04

**Why:** rosetta MCP and shipped RouterOS skills are enabling layers, but they do not
by themselves define the end-user Copilot experience inside TikBook. After the VFS
theme starts landing, TikBook should decide what RouterOS-aware Copilot integration
actually looks like in the editor: which context to surface, which UX primitives to
use, and how to avoid duplicating what rosetta / skills / RouterOS LSP already know.

**Tasks:**

- [ ] Decide the primary Copilot product surface: chat participant, prompt actions,
      notebook-aware commands, editor actions on VFS/virtualdoc resources, or a mix.
- [ ] Define which router context can be safely surfaced to Copilot: configured
      router, mounted VFS authority, selected virtualdoc, notebook metadata, current
      command-tree location, etc.
- [ ] Align with rosetta MCP and RouterOS skills so TikBook contributes context and
      UX, rather than baking RouterOS knowledge into ad hoc prompts.
- [ ] Keep desktop/web constraints explicit — some integrations may only work on
      desktop, while others should degrade to docs/context only in web.
- [ ] Revisit after the first meaningful VFS progress so Copilot integration follows
      the actual resource model instead of guessing it early.

## Theme 7: mcp-monorepo MCPs as VS Code explorers

**Status:** proposed — 2026-04

**Why:** `~/Lab/mcp-monorepo` has MCPs for MikroTik device discovery (MNDP,
neighbor, etc.). The data these expose is tree-shaped — a natural fit for VS
Code TreeView explorers. The MCP can stay the single source of truth; the
explorer is a UI on top.

**Tasks:**

- [ ] Confirm which `mcp-monorepo` servers are ready / public — currently a Lab
      project.
- [ ] Design a generic `MCPTreeExplorer` TreeDataProvider so multiple MCPs can
      back different explorers (discovery, dude.db, etc.).
- [ ] Gate to desktop — MCP transports typically need Node.

## Theme 8: Native RouterOS API transport (tiktui / restraml)

**Status:** research — 2026-04

**Why:** REST is the only transport today. Native RouterOS API (port 8728/8729)
is richer and sometimes the only way to reach certain commands, but has a known
"tag multiplex" complexity that `~/Lab/tiktui` and `~/Lab/restraml` have been
chewing on. Also: SSH execution is a viable third transport, and `quickchr`
already knows a lot about SSH to CHR.

Related: [docs/future-features.md#native-routeros-api-transport](docs/future-features.md),
[docs/future-features.md#ssh-transport-for-notebook-execution](docs/future-features.md),
[docs/architecture.md#transport-abstraction-future](docs/architecture.md).

**Tasks:**

- [ ] Treat as **research-first** — revisit after tiktui / restraml settle the
      tag-multiplex question. Do not attempt a transport abstraction in TikBook
      before that clears.
- [ ] When ready: draft a `docs/specs/transport-abstraction.md` with REST / SSH /
      native-API capability matrix. Decision point is already flagged in
      future-features.md.

---

## Cross-cutting: agentic-AI alignment (keep this working)

Continuous — not a feature, but worth re-checking each session-start:

- `.github/copilot-instructions.md` is the source of truth. Claude Code and other
  agents defer to it via `CLAUDE.md` / `AGENTS.md`.
- User-level guidance (`~/CLAUDE.md` + the `tikoci-crossref` skill) covers
  org/platform/bun/skills conventions — the repo-level files should not
  duplicate.
- Skills referenced here (`routeros-*` public, `tikoci-*` local) live in
  `~/GitHub/routeros-skills/` and `~/.copilot/skills/` respectively. The
  "ship routeros-skills" theme above is about surfacing them **inside the
  installed extension** for end users.
