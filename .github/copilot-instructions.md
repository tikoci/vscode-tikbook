# Copilot instructions for TikBook

Keep guidance brief and actionable. For full details, see [DEVELOPMENT.md](../DEVELOPMENT.md).

Additional context-specific rules in `.github/instructions/`:

- `ai-editing-best-practices.md` - Safe code editing protocols (read first!)
- `vscode-extension.instructions.md` - Extension code standards
- `testing.instructions.md` - Test and experimental code
- `documentation.instructions.md` - Docs organization and linking
- `eslint-rules.instructions.md` - Linting expectations
- `routeros-integration.instructions.md` - RouterOS REST API patterns

Pattern guides in `docs/`:

- `typescript-patterns.md` - TypeScript + RouterOS types (generics, type narrowing, extensible records)
- `routeros-patterns.md` - REST API patterns (version compatibility, error handling, credentials)
- `versioning-patterns.md` - VS Code version compatibility (API gates, runtime fallbacks)
- `testing-vscode-web-local.md` - Testing web extensions locally and on vscode.dev
- `copilot-setup.md` - Copilot configuration and troubleshooting
- `web-desktop-compatibility.md` - Design-time verification for VS Code for Web (if created)
- `agentic-collaboration-patterns.md` - AI-assisted spec refinement workflows (iterative Q&A, research patterns)

Architectural reference: See [docs/architecture.md](../docs/architecture.md), [docs/conventions.md](../docs/conventions.md), and [docs/sarb/code-review-checklist.md](../docs/sarb/code-review-checklist.md).

**📋 Feature Development (start here each session):**

- **Roadmap (near-term themes):** [ROADMAP.md](../ROADMAP.md) — seeded tasks for agents
- **Quick tasks (1-3 hours):** [docs/llm-todos.md](../docs/llm-todos.md)
- **Larger features:** [docs/specs/README.md](../docs/specs/README.md) — only implement specs marked `ready-for-implementation`
- **Long-term vision:** [docs/future-features.md](../docs/future-features.md)

If `ROADMAP.md` conflicts with an older draft spec, TODO, or historical note, treat
`ROADMAP.md` as the near-term source of truth and update the stale doc as part of
the work.

`CHANGELOG.md` is past-tense only — do not record planned work there.

## Core rules

- This is a VS Code extension. Avoid Node-only APIs in extension code, especially for web.
- Do not use console.log. Use the existing output logging helper (e.g., log.info()).
- RouterOS support targets 7.20.2+ (min 7.10). Validate commands against v7 schema.
- If a change belongs in the RouterOS LSP (not VS Code-specific), suggest that instead.
- Do not change package.json version unless the user asks.
- Prefer vscode.workspace.fs + vscode.Uri over Node fs/path for file IO.
- Gate desktop-only behavior with vscode.env.uiKind or vscode.env.appHost.
- Use SecretStorage for credentials; avoid settings for secrets.
- Keep types open to new RouterOS attributes (avoid overly strict typing).
- Use all available and reasonable tools to solve problem
- Always run build and unit tests before saying anything is "done" or "complete"
- Keep working to solve build issue if you can, including **all** tests

## Copilot Usage Context

- User is working in VS Code on macOS with Copilot (agent mode enabled).
- Provide feedback when user prompts or interaction patterns could be improved for efficiency/clarity.

## Workflow checks

- **Before editing code:** Read `.github/instructions/ai-editing-best-practices.md` - prevents corruption from ambiguous context matching
- Review [ROADMAP.md](../ROADMAP.md) first, then [docs/llm-todos.md](../docs/llm-todos.md) and [docs/future-features.md](../docs/future-features.md) for active constraints and decision points.
- Run eslint (npm run lint) on code changes.
- Add tests when behavior is uncertain; use llm-experiments.test.js for one-off tests.
- Keep commands, contributions, and activation events in package.json in sync with code.
- For RouterOS questions, use rosetta/RouterOS docs tooling first when available; otherwise validate commands using v7 docs or RouterOS LSP.
- Publishing is only via .github/workflows/build.yaml (no direct publish).
- Gate experimental features behind settings when noted in docs/llm-todos.md or docs/future-features.md.
- If third-party test tooling is buggy, document it in docs/interop-issues.md and consider filing an upstream issue.
- **When adding runtime assets** (media/, web resources): Update `.vscodeignore` if patterns need adjustment.
- **Web research source note (MikroTik):** `help.mikrotik.com` runs on Atlassian Confluence; `forum.mikrotik.com` runs on Discourse. For fetch-based extraction, query for specific section headers (Confluence) or post/reply structure and versions (Discourse) to reduce navigation noise.

## Markdown workflow (AI-friendly)

**Always use npm scripts, never call the legacy markdownlint CLI directly:**

- Check public docs: `npm run markdown:lint:public`
- Check human/internal docs: `npm run markdown:lint:agentic`
- Auto-fix issues: `npm run markdown:fix:all` (run at end of session if needed)
- Fix all (code + markdown): `npm run format` (runs eslint --fix + markdown --fix)

**Agentic linting philosophy:**

- `.markdownlint.yaml` holds the shared GitHub-oriented rules for real docs
- `.markdownlint-cli2.yaml` excludes LLM instruction files (`CLAUDE.md`, `AGENTS.md`, `.github/instructions/**`, etc.) from CLI linting
- Human-facing docs should be well-formed; prompt/instruction files are not a formatting battleground

**Workflow for markdown changes:**

1. Edit markdown file (no linting during development)
2. If you touched `README.md` or `CHANGELOG.md`, run `npm run markdown:lint:public`
3. If you touched `ROADMAP.md`, `DEVELOPMENT.md`, or files in `docs/`, run `npm run markdown:lint:agentic`
4. Do not rewrite LLM instruction files just to satisfy generic markdownlint preferences

**Why npm scripts instead of npx:**

- Uses the repo's `markdownlint-cli2` setup and ignore patterns
- Applies the shared `.markdownlint.yaml` rules with `.markdownlint-cli2.yaml` CLI ignores
- Handles the right file sets for public vs human/internal docs
- Consistent with eslint/lint workflow

## Unit Test Framework (CRITICAL)

- **DO NOT downgrade `@vscode/test-cli` below v0.0.12** - versions <0.0.12 have broken glob/minimatch causing silent test failures
- See [docs/unit-test-fix.md](../docs/unit-test-fix.md) for troubleshooting if tests report exit 0 but don't actually run
- Config file MUST be `.vscode-test.mjs` (ESM format) with pattern `'out/test/**/*.test.js'`
- Verify tests work: both `npm test` and `npm run test:web` should report failures when tests fail (exit code 1)

**GUI Test Runner Reminder:** If tests do not appear in the VS Code Testing sidebar, run `npm run compile:test`. `npm run compile` alone does NOT build `out/test/**/*.test.js`.

## Testing Workflow Hints

**When implementing features:**

- Suggest running tests after changes: "Run tests with Test Explorer (⌘⇧T) or `npm test`"
- If GUI Test Runner doesn't show tests: "Run `npm run compile:test` to build test files for GUI discovery"
- For web testing: Prompt user to open vscode.dev or github.dev (they are equivalent for extension testing)
  - Example: "Open <https://vscode.dev> to test the web extension" (don't automate `open` command - let users see the action)

**To focus Test Explorer programmatically:**

```typescript
await vscode.commands.executeCommand('workbench.view.testing.focus');
// or show most recent test output:
await vscode.commands.executeCommand('testing.showMostRecentOutput');
```

**Manual web extension testing workflow:**

1. Prompt: "Run `npm run vsix:serve` in terminal"
2. Prompt: "Open <https://vscode.dev> in browser"
3. Prompt: "Install from <https://localhost:5000> using Command Palette"
4. Prompt: "Test extension activation with Option+Shift+M"

See [docs/manual-testing-web-extensions.md](../docs/manual-testing-web-extensions.md) for the required manual checks after build or packaging changes.
