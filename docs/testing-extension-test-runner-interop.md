# Extension Test Runner Interop Notes

This document tracks suspected issues in third-party tooling that affect test execution and reporting in this repo.

## Extension Test Runner: Run vs Debug Behavior

**Affected tools**:

- Extension Test Runner (VS Code extension)
- @vscode/test-cli
- @vscode/test-electron

**Symptoms**:

- GUI test discovery works.
- "Run Test" reports "Test process exited unexpectedly" even though the command exits with code 0.
- Output panel shows the test command running with `--reporter .../fullJsonStreamReporter.cjs` and an exit code of 0.
- "Debug Test" succeeds and updates the UI correctly, including pass/fail icons and failure details.

**Repro (Run Test)**:

1. Use Extension Test Runner to run a single test via "Run Test".

2. Observe output like:

   - `vscode-test --label 0 --reporter .../fullJsonStreamReporter.cjs --run ... --grep /^(...$)/`
   - Exit code 0

3. UI reports "Test process exited unexpectedly" despite the exit code being 0.

**Repro (Debug Test)**:

1. Use Extension Test Runner to run a single test via "Debug Test".
2. Observe that tests execute and UI pass/fail state matches the results.

**Root cause (likely)**:

- The Extension Test Runner expects JSON events from `fullJsonStreamReporter.cjs`.
- The test runner process exits with code 0 but emits no JSON events in "Run Test" mode.
- The UI treats missing JSON output as a failure and marks the test as failed.

**Relevant code**:

- @vscode/test-cli merges mocha options in a way that favors config over CLI args: see `testEnvOptions` in `out/cli/platform/desktop.mjs`.
- @vscode/test-cli `fullJsonStreamReporter.cjs` writes JSON events to stdout; the "Run Test" path appears to emit none.

**Workaround (IMPLEMENTED)**:

- **Dual-config pattern:** Two separate config files for different use cases
  - `.vscode-test.mjs` - NO reporter, used by Extension Test Runner GUI
  - `.vscode-test-cli.mjs` - custom reporter, used by `npm test` and `npm run test:web`
- Use "Debug Test" in the Extension Test Runner (UI results match actual outcomes).
- CLI tests write full output to `.vscode-test/test-output.log` (always available).

**Potential fix upstream**:

- Ensure the "Run Test" path emits JSON events when `fullJsonStreamReporter.cjs` is used, or
- Treat a zero-exit test run with no JSON events as an explicit error with actionable diagnostics.

**Status**:

- Confirmed behavior in this repo on macOS with @vscode/test-cli 0.0.12 and @vscode/test-electron 2.5.2.

## Lessons Learned

### Good and Useful Outcomes

- CLI tests run reliably with the current config and are fast once VS Code is cached.
- CLI output is always captured in `.vscode-test/test-output.log` for humans and LLMs.
- Extension Test Runner "Debug Test" produces correct UI results and honors failures.
- The unit test suite validates pure logic (converters, schema mapper, VS Code compat) without network calls.

### Friction Points and Pitfalls

- Extension Test Runner "Run Test" appears to be broken in the current toolchain (exit code 0 with no JSON events).
- CLI stdout can still be minimal; use `.vscode-test/test-output.log` as the source of truth.
- If `.vscode-test.mjs` sets `mocha.reporter`, it can override GUI reporters and break UI parsing.
- Older @vscode/test-cli versions silently run zero tests due to glob/minimatch issues.
- CLI custom reporter captures `console.log`/`console.warn`/`console.error` output into `.vscode-test/test-output.log`.
- **Test discovery is strict**: tests must live under `src/test/suite/` to compile into `out/test/suite/**/*.test.js`.
- `.vscode-test/test-output.log` is written synchronously for reliability; if it still stops early, suspect a crash or forced process exit.

## Best Practices for Future Extensions

### Test Structure and Discovery

- Use `.vscode-test.mjs` (ESM) and avoid `.vscode-test.js` to prevent loader conflicts.
- Keep test files in `src/test/suite/*.test.ts` and compile to `out/test/suite/*.test.js`.
- Use an explicit glob like `out/test/suite/**/*.test.js`.
- Use `suite()` and `test()` with `mocha.ui = 'tdd'` if tests are written in TDD style.

### Runner Configuration

- **Dual-config pattern (SOLUTION):**
  - `.vscode-test.mjs` - GUI config, no reporter (Extension Test Runner compatible)
  - `.vscode-test-cli.mjs` - CLI config, custom reporter (writes `.vscode-test/test-output.log`)
  - `npm test` uses `.vscode-test-cli.mjs` for readable output
  - Extension Test Runner automatically discovers and uses `.vscode-test.mjs`
- Keep a temporary failing test to validate that the runner actually executes tests.

### GUI Integration Expectations

- Use "Debug Test" for accurate UI results.
- Treat "Run Test" failures with exit code 0 as a tooling issue, not a test failure.
- If GUI output shows the command but no JSON events, assume the reporter pipeline is broken.

### Versioning and Reliability

- Keep `@vscode/test-cli` at 0.0.12 or later.
- Re-run tests after dependency updates to confirm discovery and execution.
- Ensure VS Code is cached to improve local test turnaround time.

### Testing with Mocha

A previous LLM used this code as script to check mocha operation, outside of `vscode-test`:

```js

const Mocha = require('mocha');
const mocha = new Mocha();

console.log('Mocha.prototype methods:');
const proto = Object.getPrototypeOf(mocha);
const methods = Object.getOwnPropertyNames(proto).filter(m => typeof proto[m] === 'function');
console.log(methods.filter(m => ['reporter', 'run', 'addFile', 'ui'].includes(m)));

console.log('\nmocha.reporter type:', typeof mocha.reporter);

// Try reporter option in constructor
try {
  const mocha2 = new Mocha({ reporter: './some/path' });
  console.log('\nReporter in constructor: accepted (probably ignored)');
} catch (e) {
  console.log('\nReporter in constructor: rejected -', e.message);
}

// Check what happens with unknown options
const mochaWithUnknown = new Mocha({ unknownOption: 'value', ui: 'tdd' });
console.log('\nUnknown options: accepted (probably ignored)');
```
