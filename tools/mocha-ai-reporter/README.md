# mocha-ai-reporter

Custom Mocha reporter that ensures test output is always visible and logged, even when `@vscode/test-cli` captures stdout.

## Purpose

The VS Code test runner captures console output by default, making it difficult to debug test failures or see real-time test progress. This reporter solves that by:

- Writing all test output to **both console AND** `.vscode-test/test-output.log`
- Preserving `console.log()`, `console.error()`, and other console methods from test code
- Providing AI agents with readable, persistent test results they can `tail` or `grep`
- Ensuring test output is never lost, even if VS Code test runner swallows it

## Usage

Referenced in `.vscode-test-cli.mjs`:

```javascript
export default {
  files: 'out/test/**/*.test.js',
  reporter: './tools/mocha-ai-reporter/index.cjs',
  // ...
};
```

## How It Works

1. **Intercepts console methods:** Replaces `console.log`, `console.error`, etc. during test run
2. **Dual output:** Writes to both original console streams AND append to log file
3. **Restores console:** After `EVENT_RUN_END`, restores original console behavior
4. **Structured logging:** Tracks test suites, passes, failures with indentation

## Output Location

Test output is written to:
```
.vscode-test/test-output.log
```

To view during test runs:
```bash
tail -f .vscode-test/test-output.log
```

## Technical Notes

- **CommonJS format required:** Mocha's reporter API doesn't support ESM in this context
- **Node-only:** Uses `fs`, `path`, `util` - won't work in browser test environment
- **Synchronous writes:** Uses `fs.appendFileSync()` to ensure output ordering
- **Process exit handling:** Restores console even on early exits

## When to Modify

- **Add new console method:** Update `originalConsole` object and restore function
- **Change output format:** Modify `writeLine()` or event handlers
- **Different log location:** Update `logPath` variable
- **Add timestamps:** Modify `writeLine()` to prefix with `Date.now()` or ISO string

## Integration Points

- Used by: `.vscode-test-cli.mjs` (CLI test runner)
- Not used by: `.vscode-test.mjs` (GUI Test Explorer - uses different reporter)
- Log file: `.vscode-test/test-output.log` (excluded from git via `.gitignore`)

## Why Not a One-Liner?

This reporter is **167 lines** because it:
- Intercepts and restores 7 console methods
- Handles both stdout and stderr streams
- Formats suite hierarchy with indentation
- Tracks test timing and statistics
- Handles edge cases (early exits, undefined values, formatting)

A one-liner can't provide this level of orchestration.
