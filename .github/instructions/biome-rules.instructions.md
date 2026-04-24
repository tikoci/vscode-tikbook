---
name: 'Biome Linting'
description: 'Guidelines for biome.json and lint configuration'
applyTo: 'biome.json'
---

# Biome Linting Configuration

These guidelines apply to Biome setup and linting rules in `biome.json`.

## Core Rules for Agents

Biome linting is configured to catch common mistakes in VS Code extension code:

- **No console.log in extension code** - Prevents invisible logging (`suspicious.noConsole`)
- **No explicit any** - Forces proper typing (`suspicious.noExplicitAny`)
- **Prefer const** - Catches mutable bindings that should be const (`style.useConst`)
- **Use import type** - Ensures type-only imports use `import type` (`style.useImportType`)
- **No unused variables/imports** - Detects dead code (`correctness.noUnusedVariables`, `noUnusedImports`)
- **Optional chain** - Encourages modern null-safe patterns (`complexity.useOptionalChain`)

Biome does NOT support custom plugins, so the VS Code-specific rules from `tools/eslint/vscode-sanity.mjs`
(EventEmitter disposal, floating disposables, VS Code API version compat) are now archived reference only.

## Suppressing a Rule Inline

Use `biome-ignore` comments (not eslint-disable):

```typescript
// biome-ignore lint/suspicious/noExplicitAny: intentional cast for deprecated VS Code API
const nb = (window as any).activeNotebookEditor
```

## Adding or Changing Rules

- Rules live in `biome.json` under `linter.rules`
- File-specific overrides go in `biome.json` `overrides` array
- Run `npm run lint` after changes to verify no new errors
- When adjusting severity, prefer `"warn"` over `"off"` unless the rule is a false positive

## Scope and Ignores

Biome only runs on files listed in `files.includes`:
- `src/**/*.ts` - extension source
- `scripts/**/*.ts` - build scripts
- `tools/**/*.mjs` - tooling
- `*.{ts,js,mjs}` - root-level config files

Files excluded by `.gitignore` (`out/`, `dist/`, `node_modules/`) are automatically skipped via `vcs.useIgnoreFile`.

## Lint Scripts

```bash
npm run lint      # check only — no auto-fix (safe for agents/CI)
npm run lint:fix  # check + apply safe fixes (for humans)
npm run format    # lint:fix + markdown fixes
```

`npm run lint` is called in the `compile` pipeline and should never auto-mutate files.
`npm run lint:fix` is the human-facing equivalent; use it to clean up a batch of changes.

## References

See [docs/conventions.md](../../docs/conventions.md) for patterns being enforced.
