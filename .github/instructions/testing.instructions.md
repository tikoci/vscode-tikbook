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

- Run tests to pass using `npm test` (VS Code extension)
- Keep tests lint-clean; fix warnings as well as errors
- Document what assumption is being tested
- Move validated logic to main code and remove test file

## Critical: Test Framework Version

**NEVER downgrade `@vscode/test-cli` below v0.0.12**

- Versions <0.0.12 use `c8@9.1.0` which has broken glob patterns (GitHub issue microsoft/vscode-test-cli#79)
- Symptom: tests report "Exit code: 0" but no tests actually run (silent failure)
- Solution: Ensure package.json has `"@vscode/test-cli": "^0.0.12"` or higher
- If tests stop working, check [docs/unit-test-fix.md](../../docs/unit-test-fix.md) immediately

## Test Configuration Requirements

- Config file: `.vscode-test.mjs` (ESM format)
- File pattern: `files: 'out/test/suite/**/*.test.js'` (glob pattern matching all test files)
  - **GUI (Extension Test Runner)**: Parses compiled `.test.js` files directly to discover `suite()` and `test()` calls
  - **CLI (vscode-test-cli)**: Loads all matching files into Mocha for execution
- Individual test files: `src/test/suite/*.test.ts` (each with `suite()` and `test()` calls)
- Both `npm test` (desktop) and `npm run test:web` (browser) work with the same config
- GUI Debug: Use the "Debug" button in the test tree to step through tests

## Verifying Test Changes

**After modifying `.vscode-test.mjs`, verify both environments catch failures:**

1. Add temporary failing test: `assert.fail('verification')`
2. Run `npm test` → should fail (exit code 1)
3. Run `npm run test:web` → should also fail (exit code 1)
4. Remove failing test → both should pass (exit code 0)

If either shows exit code 0 with a failing test, the test runner is broken.

## Third-Party Tooling Issues

- Always suggest to user filing an upstream issue when functionality is lost or the workaround is ugly; include repro steps and versions.  ideally offer to agentically to the report after user review and confirm.  so sub-goal is make sure upstream library help us avoid ugly or potentially fragile code
- Keep notes concise and actionable so future contributors can decide whether to upgrade, pin, or patch.  this is important especially when changes in package version are needed for a code change or fix. 
