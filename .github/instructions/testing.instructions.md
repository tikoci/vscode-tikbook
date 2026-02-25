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
