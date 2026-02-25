# Copilot instructions for TikBook

Keep guidance brief and actionable. For full details, see [docs/sarb-instructions.md](../docs/sarb-instructions.md).

Additional context-specific rules in `.github/instructions/`:
- `vscode-extension.instructions.md` - Extension code standards
- `testing.instructions.md` - Test and experimental code
- `documentation.instructions.md` - Docs organization and linking
- `eslint-rules.instructions.md` - Linting expectations
- `routeros-integration.instructions.md` - RouterOS REST API patterns

Pattern guides in `docs/`:
- `typescript-patterns.md` - TypeScript + RouterOS types (generics, type narrowing, extensible records)
- `routeros-patterns.md` - REST API patterns (version compatibility, error handling, credentials)
- `versioning-patterns.md` - VS Code version compatibility (API gates, runtime fallbacks)
- `copilot-setup.md` - Copilot configuration and troubleshooting
- `web-desktop-compatibility.md` - Design-time verification for VS Code for Web (if created)

Architectural reference: See [docs/architecture.md](../docs/architecture.md), [docs/conventions.md](../docs/conventions.md), and [docs/sarb/code-review-checklist.md](../docs/sarb/code-review-checklist.md).

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

## Workflow checks

- Review [docs/llm-todos.md](../docs/llm-todos.md) and [docs/future-features.md](../docs/future-features.md) for active constraints and decision points.
- Run eslint (npm run lint) on code changes.
- Add tests when behavior is uncertain; use llm-experiments.test.js for one-off tests.
- Keep commands, contributions, and activation events in package.json in sync with code.
- Validate RouterOS commands using v7 docs or RouterOS LSP.
- Publishing is only via .github/workflows/build.yaml (no direct publish).
- Gate experimental features behind settings when noted in docs/llm-todos.md or docs/future-features.md.
