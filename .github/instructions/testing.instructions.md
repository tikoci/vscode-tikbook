---
name: 'Testing & Validation'
description: 'Guidelines for test files and experimental code'
applyTo: '**/*.test.ts,**/*.spec.ts,llm-experiments.test.js'
---

# Testing & Experimental Code Guidelines

These rules apply to test files and one-off validation code.

## Test Files

### General Tests

- Use `llm-experiments.test.js` for quick validation of uncertain behavior
- Test edge cases before committing to main code
- Validate RouterOS API assumptions (does this command exist in v7?)
- Use clear test names that describe the assumption being validated

### Experimental Integration Tests

**When to use:** Testing integration approaches when behavior is unknown (e.g., "Which API triggers fewer security prompts?")

**Naming pattern:** `*.experiment.test.ts`

**Lifecycle:**

1. Create experiment test to gather empirical data
2. Run test and document findings in research doc
3. After decision made, mark tests with `this.skip()` to preserve as reference
4. Keep tests in codebase (shows what was tested, results documented)

**Pattern:**

```typescript
suite('Feature X Integration Experiments', () => {
    test('Experiment 1: Approach A', async function() {
        // After findings documented, add:
        // this.skip(); // Results in docs/research/feature-x.md
        
        console.log('=== Testing Approach A ===');
        console.log('Expected behavior: ...');
        // ... test code with rich console output
    });
});
```

**Run experiments:** `npm test -- --grep "Experiment"`

**Discovery requirement:** Place experiment files under `src/test/suite/` so they compile to `out/test/suite/**/*.test.js` and are picked up by the test runner.

**Logging requirement (current toolchain):** CLI runs capture `console.log`/`console.warn`/`console.error` output in `.vscode-test/test-output.log`. For GUI runs, console output is only visible in the Debug/Test output panels; if an experiment needs durable output, write results to a file and read it after the run:

```typescript
const RESULTS_FILE = path.join(process.cwd(), '.vscode-test', 'experiment-results.txt');
suiteTeardown(() => {
  fs.writeFileSync(RESULTS_FILE, resultsLog.join('\n'), 'utf-8');
  console.log(`Results: ${RESULTS_FILE}`);
});
```

**Why unit tests over shell scripts:**

- Runs in actual VS Code extension context (not just terminal)
- Programmatic assertions and output capture
- Discoverable in codebase (`src/test/*.experiment.test.ts`)
- Can skip but preserve as reference documentation
- No need for separate tooling or compilation steps

**When shell scripts might be needed:**

- Very complex environment setup that's hard to mock
- Testing behavior outside VS Code context as baseline
- Interactive prompts that benefit from manual observation
- (But try unit test approach first)

## Allowed in Tests

- `console.log` is allowed (lint is disabled for test files)
- CLI runs capture console output in `.vscode-test/test-output.log`; for GUI runs, write to a file for durable experiment results

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

**Dual-config pattern for GUI and CLI compatibility:**

- **GUI config:** `.vscode-test.mjs` (ESM format, NO reporter)
  - Used by: VS Code Extension Test Runner GUI
  - No mocha reporter set - allows GUI to use JSON reporter
  - Enables "Run Test" and "Debug Test" buttons in test explorer

- **CLI config:** `.vscode-test-cli.mjs` (ESM format, custom reporter)
  - Used by: `npm test` and `npm run test:web`
  - Writes full results to `.vscode-test/test-output.log`
  - AI-friendly and human-friendly - shows exactly which tests pass/fail

- File pattern (both configs): `files: 'out/test/suite/**/*.test.js'`
  - **GUI (Extension Test Runner)**: Parses compiled `.test.js` files to discover `suite()` and `test()` calls
  - **CLI (vscode-test-cli)**: Loads all matching files into Mocha for execution

- Individual test files: `src/test/suite/*.test.ts` (each with `suite()` and `test()` calls)
- Both `npm test` (desktop) and `npm run test:web` (browser) work with CLI config
- GUI Debug: Use the "Debug" button in the test tree to step through tests

**Why two configs?**
The Extension Test Runner expects no reporter (so it can inject its JSON reporter). But vscode-test-cli config takes precedence over CLI args, so we can't pass `--reporter spec` to override. Solution: separate configs for separate use cases and a CLI-only reporter that always writes `.vscode-test/test-output.log`.

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

---

## Integration Testing Strategy

**Status:** Phase 1 (Priority 0 + Priority 1) Complete - 115 tests passing

### Strategic Decisions (February 2026)

**IMPLEMENT:**

- ✅ **Approach 1: VS Code Test Framework** - PRIMARY FOCUS
  - Already have infrastructure (`vscode-test-cli`)
  - Fast (<5 sec per suite)
  - Covers 80% of testing needs
  - Integration tests in `src/test/suite/integration/`

### Test Coverage Summary (February 2026)

**Total Tests: 115 (all passing)**

**Priority 0 (66 tests) - Extension Contributions:**

- ✅ Command registration: 33 tests (all expected commands)
- ✅ Notebook types: 3 tests (tikbook, routeros, markdown-routeros)
- ✅ Configuration settings: 2 tests (defaults, documentation)
- ✅ Extension lifecycle: 2 tests (install, activation)
- ✅ File: `src/test/suite/integration/contributions.test.ts`

**Priority 1 (45 tests) - Notebook Kernel & Core APIs:**

- ✅ Notebook controllers: 4 tests (registration via VS Code API)
- ✅ Notebook serializers: 13 tests (ScriptSerializer, MarkdownSerializer)
- ✅ Configuration management: 13 tests (settings, URL formatting, detection)
- ✅ VS Code compatibility: 19 tests (version parsing, API detection, safeCall wrapper)
- ✅ Files:
  - `src/test/suite/integration/notebook-kernel.test.ts`
  - `src/test/suite/integration/config.test.ts`
  - `src/test/suite/integration/vscode-compat.test.ts`

**RouterOS Connection Validation (4 tests):**

- ✅ HTTP connectivity test: Detects URL/device reachability
- ✅ REST API endpoint test: Confirms /rest is available
- ✅ Authentication test: Verifies credentials
- ✅ Uses `.sarbsettings` JSONC configuration (skipLiveTests flag for CI/CD)
- ✅ File: `src/test/suite/integration/connection-validation.test.ts`

**Priority 2+ (Future) - Virtual FS, Remote, SSH:**

- 🟡 scriptfs.ts (16 API methods, complex state)
- 🟡 virtualdocs.ts (9 API methods, document management)
- 🟡 remote.ts (SSH integration, external dependency)
- 🟡 codelens.ts (UI integration, visual feedback)
- 🟡 watchdog.ts (status tracking, background operations)

---

## Lessons Learned (February 2026)

### 1. Don't Instantiate Extension-Registered Objects

**Problem:** Tests that create new instances of extension-registered objects (controllers, providers) fail because VS Code only allows one registration per ID.

**Example Error:**

```typescript
// ❌ BAD: Instantiate controller (FAILS - already registered by extension)
test('TikbookController creates controller', () => {
  const controller = new TikbookController(); 
  // ERROR: notebook controller with id 'tikbook' ALREADY exist
});
```

**Solution:** Test via VS Code API instead of instantiation.

```typescript
// ✅ GOOD: Test via openNotebookDocument (tests real behavior)
test('tikbook controller is registered', async () => {
  const notebook = await vscode.workspace.openNotebookDocument(
    'tikbook', 
    new vscode.NotebookData([])
  );
  assert.strictEqual(notebook.notebookType, 'tikbook');
  // This validates that extension registered the controller correctly
});
```

**Why This Works:**

- Extension activates and registers controllers before tests run
- `openNotebookDocument('tikbook', ...)` uses the already-registered controller
- Tests validate real extension behavior, not isolated class behavior
- Aligns with SARB principle: "Don't mock VS Code APIs, test real behavior"

**When to Apply:**

- Notebook controllers: Use `vscode.workspace.openNotebookDocument(type, data)`
- Text document providers: Use `vscode.workspace.openTextDocument(uri)`
- File system providers: Use `vscode.workspace.fs.readFile(uri)`
- Custom editors: Use `vscode.window.showTextDocument(uri)`

### 2. Script Serializer Creates 4 Cells, Not 3

**Discovery:** Script format (`#!tikbook` with `#.markdown` sections) creates 4 cells:

1. Code cell (comment line before first markdown section)
2. Markdown cell (content between `#.markdown` and `#.`)
3. Code cell (first command block)
4. Code cell (second command block)

**Test Update:**

```typescript
// ❌ OLD: Expected 3 cells
assert.strictEqual(notebook.cells.length, 3);

// ✅ NEW: Expect 4 cells (includes comment line as code cell)
assert.strictEqual(notebook.cells.length, 4);
assert.strictEqual(notebook.cells[0].kind, NotebookCellKind.Code); // comment
assert.strictEqual(notebook.cells[1].kind, NotebookCellKind.Markup); // markdown
```

**Lesson:** Test serializer output by inspecting actual cell structure, not assumptions.

### 3. hasAPI Function is Type-Safe by Design

**Discovery:** `hasAPI<T>(obj: T, prop: keyof T)` uses TypeScript generics to enforce compile-time safety.

**Implication:** Cannot test with `null` or missing properties without `any` casting, which defeats the purpose.

**Test Approach:**

```typescript
// ❌ BAD: Try to test null (defeats type safety)
const hasNull = hasAPI(null as any, 'anyProp'); // Type error

// ✅ GOOD: Test with real VS Code objects
const hasAppName = hasAPI(vscode.env, 'appName');
assert.strictEqual(hasAppName, true);
```

**Lesson:** When a utility function has strong typing, test it within its design constraints. Don't force it to handle cases TypeScript already prevents.

### 4. Configuration Inspect for Deterministic Tests

**Problem:** `config.get('setting')` reads user's actual settings, causing tests to fail locally but pass in CI.

**Solution:** Use `config.inspect('setting')?.defaultValue` to read package.json defaults only.

```typescript
// ❌ BAD: Reads user settings (non-deterministic)
const baseUrl = vscode.workspace.getConfiguration('tikbook').get('baseUrl');

// ✅ GOOD: Reads package.json default (deterministic)
const baseUrl = vscode.workspace.getConfiguration('tikbook')
  .inspect('baseUrl')?.defaultValue;
```

**Lesson:** Settings tests must be deterministic. Always inspect defaults unless testing user preference behavior explicitly.

---

**NOT PLANNED:**

- ❌ **Approach 2: Browser automation (Puppeteer)** - Anti-pattern per SARB, webview experimental
- ❌ **Approach 4: Trace-based testing** - Redundant with future Docker approach

**DEFERRED:**

- 🟡 **Approach 3: Mock-based integration** - Research phase, revisit after Priority 0-1
- 🟢 **Approach 5: Docker E2E** - Future feature alignment (dev container + testing)

**Webview Testing:** Minimal (grep-like HTML verification only if needed). Webview is experimental.

### Phase 1: Priority 0 - Extension Contributions

**Location:** `src/test/suite/integration/contributions.test.ts`

**Tests:**

- All 40+ commands register correctly
- Notebook types load for correct file extensions
- Configuration settings have correct defaults
- Extension activation lifecycle

**Run Tests:**

```bash
npm test                # Desktop
npm run test:web        # Browser
```

**CI/CD:** Tests run on every commit, block merge if failing.

### Testing Against Real RouterOS Devices

**Short/Medium Solution: .sarbsettings JSONC Configuration**

Settings matches extension settings structure for consistency. Tests skip by default unless configured.

1. Copy `.sarbsettings.example` to `.sarbsettings` in workspace root:

   ```json
   {
     "tikbook": {
       "baseUrl": "http://192.168.88.1:7080",
       "username": "admin",
       "password": "your-password",
       "apiTimeout": 5000
     },
     "vscode-test": {
       "timeout": 30000,
       "skipLiveTests": false
     }
   }
   ```

2. Tests automatically skip RouterOS connection validation if configured to skip:
   - **Default behavior:** `skipLiveTests: false` - Tests run and fail if device unreachable
   - **For CI/CD without device:** Set `skipLiveTests: true` in `.sarbsettings` to skip tests requiring external resources
   - **Note:** `skipLiveTests` is in `vscode-test` section (test config), not `tikbook` (extension config), since it controls test behavior not extension behavior

3. Use connection validation tests to diagnose issues:
   - **URL reachability test:** Identifies if baseUrl is wrong or device unreachable
   - **REST API endpoint test:** Checks if RouterOS REST API is enabled
   - **Authentication test:** Verifies credentials (401 = auth problem, timeout = URL problem)

**Test Failure Interpretation:**

- `Timeout / ECONNREFUSED / ETIMEDOUT`: URL is invalid or RouterOS unreachable → check baseUrl
- `HTTP 401`: URL is valid but credentials wrong → check username/password
- `HTTP 200`: Connection successful → ready for integration tests

**Long-term Solution: Docker**

Future approach (Approach 5) using Docker dev containers:

- Provides clean RouterOS environment without configuration
- Allows resetting RouterOS state between test runs
- Critical for notebook tests that can modify RouterOS configuration
- Enabled when dev container feature is planned
