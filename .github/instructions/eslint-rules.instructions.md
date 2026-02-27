---
name: 'ESLint & Linting'
description: 'Guidelines for eslint.config.mjs and lint configuration'
applyTo: 'eslint.config.mjs,tools/eslint/**'
---

# ESLint Configuration

These guidelines apply to ESLint setup and linting rules.

## Core Rules for Agents

ESLint configuration is optimized to catch common LLM mistakes:

- **No console.log in extension code** - Prevents invisible logging
- **Explicit return types** - Helps agents understand intent
- **No floating promises** - Catches async mistakes
- **No Node built-ins in extension** - Ensures web compatibility (except allowlist)
- **Variable shadowing** - Common LLM mistake in nested scopes
- **Type-aware linting** - Catches subtle TypeScript errors

## Adding Rules

- Run `npm run lint` after changes
- Rules are in `eslint.config.mjs`
- VSCode-specific rules are in `tools/eslint/vscode-sanity.mjs`
- When you discover a common pattern mistake, add a rule to prevent it

### Codify patterns as rules

**When to add a rule:**

- You caught a mistake that could be automated
- A pattern emerged from multiple code reviews
- A convention should be enforced consistently

**Process:**

1. Add rule to `tools/eslint/vscode-sanity.mjs` with clear error message
2. Document the pattern in `docs/conventions.md` (include the *why*)
3. Add entry to `docs/sarb/decision-log.md` explaining why this rule is valuable
4. Run `npm run lint --fix` to validate against existing code

**Example decision-log entry:**

```
- 2026-02-25: Added no-console-in-extension rule - console.log is invisible to users; use OutputChannel instead
```

## Per-File Allowlists

Some files use Node APIs that are normally blocked:

- `src/routeros.ts` - allows `https` import
- `src/virtualdocs.ts` - allows `path` import
- `src/scriptfs.ts` - allows `util` import

Do not add to allowlist without documented reason (e.g., desktop-only feature).

## Testing Lint Rules

- Run `npm run lint` to validate all files
- Check for new warnings after each change
- Fix lint errors before committing

## References

See [docs/conventions.md](../../docs/conventions.md) for patterns being enforced.
