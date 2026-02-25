---
name: 'Testing & Validation'
description: 'Guidelines for test files and experimental code'
applyTo: '**/*.test.ts,**/*.spec.ts,llm-experiments.test.js'
---

# Testing & Experimental Code Guidelines

These rules apply to test files and one-off validation code.

## Test Files

- Use `llm-experiments.test.js` for quick validation of uncertain behavior
- Test edge cases before committing to main code
- Validate RouterOS API assumptions (does this command exist in v7?)
- Use clear test names that describe the assumption being validated

## Allowed in Tests

- `console.log` is allowed (lint is disabled for test files)
- Node APIs are allowed (tests run in Node, not in extension host)

## Experimental Code

- Gate experimental features behind settings (see docs/llm-todos.md and docs/future-features.md)
- Document in README when features are experimental
- Link to future-features.md decision points

## Before Committing Test Code

- Run tests to pass
- Document what assumption is being tested
- Move validated logic to main code and remove test file

## Critical: Test Framework Version

**NEVER downgrade `@vscode/test-cli` below v0.0.12**

- Versions <0.0.12 use `c8@9.1.0` which has broken glob patterns (GitHub issue microsoft/vscode-test-cli#79)
- Symptom: tests report "Exit code: 0" but no tests actually run (silent failure)
- Solution: Ensure package.json has `"@vscode/test-cli": "^0.0.12"` or higher
- If tests stop working, check [docs/unit-test-fix.md](../../docs/unit-test-fix.md) immediately

## Test Configuration Requirements

- Config file: `.vscode-test.mjs` (ESM format, not .js)
- File pattern: `'out/test/**/*.test.js'` (explicit .test.js suffix)
- Test files must use `.test.ts` extension in src/test/
- Both `npm test` (desktop) and `npm run test:web` must work
- **ONLY ONE** config file should exist (delete `.vscode-test.js` if it exists)

## Verifying Test Changes

**After modifying `.vscode-test.mjs`, verify both environments catch failures:**

1. Add temporary failing test: `assert.fail('verification')`
2. Run `npm test` → should fail (exit code 1)
3. Run `npm run test:web` → should also fail (exit code 1)
4. Remove failing test → both should pass (exit code 0)

If either shows exit code 0 with a failing test, the test runner is broken.
