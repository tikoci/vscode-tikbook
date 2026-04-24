# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Source of truth: shared repo guidance first

For the general workflow, start with [AGENTS.md](AGENTS.md), then follow the
shared repo guidance below. This file only adds Claude-Code-specific notes.

This repo's primary agent guidance lives in GitHub Copilot's native locations, and
Claude Code should follow them as-is instead of duplicating them here:

- **[.github/copilot-instructions.md](.github/copilot-instructions.md)** — always-on core rules, markdown workflow, test-framework gotchas
- **[.github/instructions/](.github/instructions/)** — context-scoped rules (editing, extension code, testing, routeros integration, docs, biome)
- **[DEVELOPMENT.md](DEVELOPMENT.md)** — full contributor guide (setup, build, testing, publishing)
- **[docs/architecture.md](docs/architecture.md)** — components, virtual filesystems, data flow, web/desktop gating
- **[docs/conventions.md](docs/conventions.md)** — logging, secrets, REST client, type guards, naming

Project preference: keep model-specific instructions minimal. If something applies to
both Copilot and Claude Code, edit the Copilot files above — not this one. This file
only holds the things Claude Code needs that Copilot doesn't.

User-level guidance also applies: `~/CLAUDE.md` already covers the tikoci org, Intel
Mac platform facts, Bun preferences, the `routeros-*` / `tikoci-*` skill convention,
and the cross-project map via the `tikoci-crossref` skill. Don't restate any of it
here.

## Tracking work

Work is tracked in four places, smallest-to-largest:

1. **[ROADMAP.md](ROADMAP.md)** — near-term seeded tasks for agents (e.g. UTM→quickchr swap, rosetta MCP bundling, /app YAML + Monaco, ship routeros-skills). Start here.
2. **[docs/llm-todos.md](docs/llm-todos.md)** — 1–3 hour items with clear requirements.
3. **[docs/specs/](docs/specs/README.md)** — per-feature lifecycle (`draft` → `ready-for-implementation` → `implemented`). Only code against `ready-for-implementation`.
4. **[docs/future-features.md](docs/future-features.md)** — long-term vision, decision points, cross-feature dependencies.

`CHANGELOG.md` is **past tense only** — shipped versions. Do not record planned
work there.

## Claude-Code-specific notes

### MCP

- The `plugin:context7:context7` server is configured on this machine — prefer it
  over web search for library/SDK/framework docs (VS Code API, axios, luxon, etc.).
- The `rosetta` server (SQLite-FTS5 RAG over RouterOS 7 docs) is the first stop for
  any RouterOS question — CLI paths, property tables, device specs, changelogs,
  command-version diffs. Start with `routeros_search`; one call usually answers.
  Only v7 data exists. One of ROADMAP.md's tasks is to have the **extension itself**
  install/configure this MCP for end users — keep that path in mind when adding
  RouterOS-facing features.

### Skills to know about

The canonical cross-project map is the `tikoci-crossref` skill — trigger it when a
task crosses project boundaries. Other high-relevance skills for this repo:

- `routeros-fundamentals`, `routeros-command-tree`, `routeros-app-yaml`,
  `routeros-container`, `routeros-qemu-chr` — domain knowledge for the RouterOS
  surface TikBook exposes.
- `tikoci-pico-css-spa`, `tikoci-github-pages-spa` — relevant when adapting
  `~/GitHub/restraml/docs/tikapp.html` Monaco tricks for a TikBook webview.

### Task tracking

Use `TaskCreate` / `TaskUpdate` for multi-step work within a session. Persistent
work items go into the docs above (ROADMAP / llm-todos / specs) — not into memory
and not into new scratch files.

## Build / test / lint quick reference

Full details are in [DEVELOPMENT.md](DEVELOPMENT.md); common commands:

| Command | What it does |
|---|---|
| `npm run compile` | clean + lint + typecheck + build `out/extension.js` (node target) |
| `npm run compile:web` | build `dist/extension.js` (browser target) |
| `npm run compile:test` | build `out/test/{unit,integration}/**/*.test.js` — **required for GUI Test Runner** |
| `npm test` | unit tests only (`out/test/unit/**`, per `.vscode-test-cli.mjs`) |
| `npm run test:web` | unit tests against the web extension host |
| `npm run lint` | `biome check .` (no --write) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run markdown:lint:agentic` | lint `docs/` + `.github/instructions/` (relaxed rules) |
| `npm run markdown:lint:public` | lint `README.md` + `CHANGELOG.md` (strict rules) |
| `npm run vsix:package` | build node + web `.vsix` files |
| `npm run vsix:serve` | serve web `.vsix` over HTTPS for vscode.dev testing |

**Test suite policy** (see [docs/test-running-policy.md](docs/test-running-policy.md)):
`src/test/unit/` is pure — no AppleScript/UTM/QEMU/shell. `src/test/integration/`
touches external systems and each file uses a top-level `suite.skip` so it is
opt-in only. Default `npm test` runs unit only. Do **not** downgrade
`@vscode/test-cli` below `0.0.12`.

**Publishing** is only via `.github/workflows/build.yaml`. Never run `vsce publish`
manually. Don't bump `package.json` version unless asked.

## Architecture in one paragraph

TikBook is the VS Code-specific companion to the `TIKOCI.lsp-routeros-ts` extension
(declared as `extensionPack`). Entry: `src/extension.ts` wires up a notebook kernel
(`notebook.ts`, two formats: `.md.rsc` / `.tikbook` and `.rsc.md` / `.rscmd`), two
virtual filesystems (`rscena://` read-only views in `virtualdocs.ts`; `rscfile://`
read-write ScriptFS in `scriptfs.ts`), a REST client (`routeros.ts` / `shared.ts`),
a status watchdog (`watchdog.ts`), and converters/commands/menus. The codebase also
contains parked CHR VM explorer/provider work (`vm-explorer.ts` + `vm-providers/`)
that is not currently activated while the roadmap shifts from UTM toward quickchr.
Desktop-only code must be gated with
`vscode.env.uiKind === UIKind.Desktop`; prefer `vscode.workspace.fs` over `node:fs`
and `SecretStorage` over settings for credentials. Language parsing and
diagnostics belong to the LSP, not here.
