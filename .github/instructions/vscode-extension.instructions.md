---
name: 'VS Code Extension Development'
description: 'Guidelines for src/**/*.ts (extension code)'
applyTo: 'src/**/*.ts'
---

# VS Code Extension Development Standards

These rules apply to extension code in `src/**/*.ts`. The goal is web-compatible, type-safe extension code.

## Must Follow

- **No Node built-ins** except: routeros.ts (https), virtualdocs.ts (path), scriptfs.ts (util). Gate others behind `vscode.env.uiKind`.
- **No console.log**. Use `log.info()`, `log.warn()`, `log.error()` from the output logging helper.
- **Explicit return types** on all functions. ESLint enforces this.
- **Await all promises**. No floating promises. ESLint catches these.
- **Credentials in SecretStorage only**. Never settings or environment variables.
- **Use vscode.workspace.fs** for file I/O, not Node `fs` module.

## Type Safety

- Use `Record<string, unknown>` or spreads for RouterOS responses (version-specific attributes).
- No `any` unless documented why. ESLint enforces `@typescript-eslint/no-explicit-any`.
- Prefer `const` over `let`. Use `let` only when reassigning.

## Async & Error Handling

- All async functions must have explicit `Promise<T>` return types.
- Handle errors from RouterOS REST API; map to user-friendly messages.
- Validate RouterOS commands against v7 schema before committing.

## References

See [docs/conventions.md](../../docs/conventions.md) for detailed patterns.
See [docs/sarb-instructions.md](../../docs/sarb-instructions.md) for full SARB guidance.
