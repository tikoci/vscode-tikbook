# Test Running Workflow & Suite Policy (2026)

## Test Suite Structure

- **Unit tests**: `src/test/unit/`
  - Fast, pure, require only VS Code/npm
  - No AppleScript, UTM, QEMU, CHR, or external dependencies
- **Integration tests**: `src/test/integration/`
  - Require or touch anything outside VS Code/npm (AppleScript, UTM, QEMU, CHR, shell, etc.)
  - May be slow, require manual setup, or have side effects
  - All integration test files use a top-level `suite.skip` so they are not run by default

## Running Tests

- **Default (npm test, Test Explorer, CI):**
  - Only unit tests are run (see `.vscode-test-cli.mjs`)
  - Integration tests are skipped by default
- **To run integration tests:**
  1. Edit `.vscode-test-cli.mjs` and change `files` to `'out/test/**/*.test.js'` or `'out/test/integration/**/*.test.js'`
  2. Or, manually unskip a specific integration test file by changing `suite.skip` to `suite`
  3. Run with `npm test` or the Test Explorer

## Policy

- **All new tests** must be placed in the correct suite:
  - Use `unit/` for pure logic, parsing, config, manifest, conversions, etc.
  - Use `integration/` for anything that requires or simulates external systems, hardware, or long setup/side effects
- **Integration tests** must always use a top-level `suite.skip` so they are opt-in only
- **Unit tests** must never use or reference AppleScript, UTM, QEMU, CHR, or shell commands

## References
- [docs/test-suite-structure.md](test-suite-structure.md)
- [docs/integration-testing-strategy.md](integration-testing-strategy.md)

---

*Last updated: 2026-02-27*
