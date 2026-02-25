
# System Architecture Review Board (SARB)

This document captures the expectations SARB uses when reviewing agentic work for this VS Code extension. Treat these as must-follow unless they conflict with user intent.

When the owner says "SARB," it refers to the agentic AI instructions and LLM toolchain guidance documented in this file and related docs.

## Context and scope

- This is a VS Code extension. The runtime is the VS Code extension host, not Node.js. Some Node APIs are unavailable, especially in web.
- The extension integrates with MikroTik RouterOS and adds tools for RouterOS admins, including notebooks and virtual files.
- The RouterOS LSP extension is a separate project. TikBook fills in VS Code-specific features. If a task belongs in the LSP instead, suggest it.
- SARB reviews work using guidance in this file and files under docs/sarb.
- Minimum supported RouterOS is 7.10 (REST API). Target is 7.20.2+ (v7 LTS).
- If unsure about a VS Code API, check for proposed vs stable APIs: <https://code.visualstudio.com/api/advanced-topics/using-proposed-api>

## Reference sources

- VS Code docs: <https://code.visualstudio.com/api>
  - Extension API: <https://code.visualstudio.com/api/references/vscode-api>
  - Contribution points: <https://code.visualstudio.com/api/references/contribution-points>
  - Commands: <https://code.visualstudio.com/api/references/commands>
  - Activation events: <https://code.visualstudio.com/api/references/activation-events>
  - Manifest: <https://code.visualstudio.com/api/references/extension-manifest>
- Extension samples: <https://github.com/microsoft/vscode-extension-samples>
  - Test example: <https://github.com/microsoft/vscode-extension-samples/tree/main/helloworld-test-cli-sample>
- VS Code source: <https://github.com/microsoft/vscode>
- MikroTik docs: <https://help.mikrotik.com>
- MikroTik forum: <https://forum.mikrotik.com>
  - Pay attention to posts by user "Amm0" and release threads.

## Before starting a task

- Review existing todos, README, and CHANGELOG to align with current direction.
- Always scan docs/llm-todos.md and docs/future-features.md for decision points and active constraints.
- Follow SARB guidance and validate that the plan meets project goals.
- Confirm RouterOS behavior with official docs or forum release threads.
- Ensure local package.json version is newer than any published version.
- Repository instructions in `.github/copilot-instructions.md` are automatically applied in Copilot Chat; no setup required.

## While writing or editing code

- Do not use console.log. Use the existing output logging pattern (e.g., log.info()).
- Run eslint (npm run lint) and pay attention to warnings.
- Add tests when behavior is uncertain. Use llm-experiments.test.js for one-off checks.
- Validate RouterOS commands against current v7 schema. Use RouterOS LSP to verify syntax where possible.
- Avoid Node-specific APIs in extension code. Tools scripts may use Node, but prefer portable options.
- Keep types open to new attributes; RouterOS adds fields over time.
- Treat features marked experimental in docs/llm-todos.md or docs/future-features.md as gated by settings.

### Codify patterns as lint rules

- **If you catch yourself making a mistake:** Check `eslint.config.mjs` to see if a rule exists; if not, propose adding one to `tools/eslint/vscode-sanity.mjs`.
- **If you discover a useful pattern:** Document it in `docs/conventions.md` and consider if a lint rule would prevent the anti-pattern.
- **When adding a lint rule:** Follow the pattern in vscode-sanity.mjs; run `npm run lint` to test; add an entry to `./sarb/decision-log.md` explaining why this rule catches a common mistake.
- **Link new rules to patterns:** Reference the specific pattern in `docs/conventions.md` that the rule enforces.

## After finishing a solution

- Optimize for readability for both humans and future LLMs.
- Consider adding lint rules (vscode-sanity.mjs) to codify lessons.
- Re-check changes in context: TikBook is a VS Code extension using REST via axios for RouterOS management.
- Capture new learnings in docs/tools so future agents do not repeat mistakes.
- Look for test coverage gaps and add tests when feasible.
- Provide a summary for the Kilo extension using a free LLM. If its review conflicts, ask the user.
- Verify package.json version and review CHANGELOG.md for current version context.
- If work touches decision points from docs/future-features.md (REPL, video player, output persistence, transports), document the choice and reasoning in ./sarb/decision-log.md.

### Run validation checks

**Required before completing work:**

- `npm run compile` - TypeScript compilation must succeed
- `npm run lint` - ESLint passes with no errors (warnings acceptable if documented)
- `npm test` - Unit tests pass (if tests exist for changed code)
- `npm audit` - No high/critical security vulnerabilities

**When changes affect web compatibility:**

- `npm test:web` - Browser mode tests pass
- Verify no Node-only APIs used without gates

**Additional checks:**

- **Package.json sync**: If adding commands/menus/settings, verify package.json contributions match code
- **Markdown links**: If moving/renaming files, check internal links aren't broken
- **Pre-publish validation**: `npm run vscode:prepublish` runs audit → lint → compile (final check before release)

**Note on tooling**: Pylance MCP tools are available in this workspace but are Python-specific. This is a TypeScript project; use standard TypeScript/ESLint validation instead.

## Release and publishing

- Verify package.json version follows the versioning scheme.
- Publishing is via GitHub Actions in .github/workflows/build.yaml only. Do not publish directly.

## Versioning scheme

- Version should be newer than any published release or pre-release unless it is a patch.
- Major version stays at 0 for now.
- Never change package.json version without asking the user.
