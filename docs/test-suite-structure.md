# Test Suite Structure and Migration (Feb 2026)

## Overview

This document summarizes the test suite migration and structure improvements completed in February 2026, and outlines next steps for test organization.

---

## What Was Done

### 1. Test Suite Migration
- **All test files** are now located under:
  - `src/test/integration/` — for integration tests
  - `src/test/unit/` — for unit tests
- **No test files** remain outside these folders. Duplicates and placeholders were removed.
- **All test files** have their original, real content (not placeholders).

### 2. Import Path and Build Fixes
- All import paths in test files were updated to match the new structure and build location.
- The test build script (`compile:test`) was updated to run from `src/test`, so compiled output is now:
  - `out/test/integration/...`
  - `out/test/unit/...`
- This removes the redundant `src/` nesting in the output, making the test runner and file structure much clearer.

### 3. Test Runner and Build
- `npm run compile:test` completes successfully (exit code 0).
- The test runner GUI now shows a clean, logical test file structure.
- All tests are discoverable and runnable from both CLI and GUI.

---

## Next Steps: Test Suite Categorization

- **Goal:** Ensure that tests in `unit/` only require VS Code (and run fast), while tests in `integration/` require external dependencies (e.g., CHR, UTM, QEMU, or take significant time).
- **Action:**
  - Review all tests in `src/test/unit/` and `src/test/integration/`.
  - Move any test that requires external systems, hardware, or long setup to `integration/`.
  - Keep pure logic, fast, and VS Code-only tests in `unit/`.

---

## References
- See also: [docs/testing-extension-test-runner-interop.md](./testing-extension-test-runner-interop.md)
- [docs/integration-testing-strategy.md](./integration-testing-strategy.md)
- [README.md](../README.md)

---

*This document will be updated as the test suite is further refined and categorized.*
