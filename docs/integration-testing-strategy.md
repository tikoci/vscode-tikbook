# Integration Testing for TikBook VS Code Extension

**Date:** February 2026  
**Status:** Strategy finalized. Phase 1-3 plan: Approach 1 (VS Code Test Framework) only.

---

## Strategic Decisions

### Testing Approaches: What We're Doing and Why

| Approach | Status | Rationale |
|----------|--------|-----------|
| **1: VS Code Test Framework** | ✅ **IMPLEMENT** | Already have infrastructure. Fast (<5sec). Covers 80% of needs. |
| **2: Browser Automation (Puppeteer)** | ❌ **NOT PLANNED** | Anti-pattern per SARB. Webview is experimental. Heavy infrastructure. |
| **3: Mock-Based Testing** | 🟡 **DEFERRED** | Requires more research. Decision after Priority 0-1 tests. |
| **4: Trace-Based Testing** | ❌ **NOT PLANNED** | Redundant with Approach 5 (Docker). |
| **5: Docker-Based E2E + Dev Container** | 🟢 **FUTURE** | Aligns with planned end-user feature. Deferred pending Docker work. |

### Webview Testing Strategy

**Decision:** Minimal webview testing. Basic HTML verification via `grep` only if needed.

**Rationale:**

- Webview is experimental (video player only)
- VS Code native UI APIs are preferred (SARB recommendation)
- Users rarely interact with webviews in extensions
- Cost/benefit not justified for experimental features

### Why These Decisions

1. **Focus on what users see first:** Extension contributions (commands, menus, notebook types)
2. **Unblock feature development:** Integration tests built into CI/CD before Phase 2
3. **Align with roadmap:** Docker feature provides better E2E solution than traces
4. **Pragmatic:** Mocks and browser automation deferred until patterns emerge

---

## Phase 1: Priority 0 - Extension Contributions (Weeks 1-2)

**Goal:** Test that all commands, menus, notebook types, and settings register correctly

### Why Priority 0 First?

- **Highest impact:** If commands don't register, extension is unusable
- **Fastest to build:** Straightforward API checks
- **Foundation:** Unblocks team confidence for later development
- **CI/CD ready:** Easy to integrate immediately

### What Gets Tested

**Manifest Surface Area (package.json):**

- 40+ commands across all categories
- 10+ menu locations with `when` conditions
- 3 notebook types (tikbook, markdown-routeros, routeros)
- 3 custom editors (*.md,*.rsc, *.rscmd)
- 7 configuration settings with correct defaults
- 1 keybinding registration
- 1 viewsWelcome entry

### Deliverables

**Files to Create:**

1. `src/test/suite/integration/contributions.test.ts` - 40+ tests
2. `.github/workflows/test.yml` update - CI/CD integration
3. `.github/instructions/testing.instructions.md` - Update with Approach 1 strategy

**Test Structure:**

```typescript
suite('Extension Contributions', () => {
  // All 40+ commands register
  test('all registered commands exist', ...)
  
  // Notebook types load correctly
  test('notebook type tikbook loads for .tikbook', ...)
  test('notebook type markdown-routeros loads for .rscmd', ...)
  
  // Settings have correct defaults
  test('settings have correct defaults', ...)
  
  // When conditions work
  test('when conditions respect context', ...)
})
```

---

## Phase 1: Priority 0 - Extension Contributions ✅ COMPLETE

**Goal:** Test that all commands, menus, notebook types, and settings register correctly

**Status:** ✅ Complete (66 tests passing)

### Why Priority 0 First?

- **Highest impact:** If commands don't register, extension is unusable
- **Fastest to build:** Straightforward API checks
- **Foundation:** Unblocks team confidence for later development
- **CI/CD ready:** Easy to integrate immediately

### What Gets Tested

**Manifest Surface Area (package.json):**

- 40+ commands across all categories
- 10+ menu locations with `when` conditions
- 3 notebook types (tikbook, markdown-routeros, routeros)
- 3 custom editors (*.md,*.rsc, *.rscmd)
- 7 configuration settings with correct defaults
- 1 keybinding registration
- 1 viewsWelcome entry

### Deliverables ✅

**Files Created:**

1. ✅ `src/test/suite/integration/contributions.test.ts` - 66 tests
2. ✅ `.vscode-test-cli.mjs` - CLI test config with custom reporter
3. ✅ `.vscode-test.mjs` - GUI test config (Extension Test Runner compatible)
4. ✅ `tools/mocha-ai-reporter.cjs` - Custom reporter writing to `.vscode-test/test-output.log`

**Test Coverage:**

- ✅ All 33+ commands register and are discoverable
- ✅ Notebook types load correctly for `.tikbook`, `.rscmd`, `.rsc`
- ✅ Settings have correct defaults from package.json
- ✅ Extension activates successfully

---

## Phase 1: Priority 1 - Notebook Kernel & Core APIs ✅ COMPLETE

**Goal:** Test notebook controllers, serializers, configuration, and VS Code compatibility utilities

**Status:** ✅ Complete (45 tests passing)

**Decision:** Continued with Approach 1 (VS Code Test Framework) - no mocks needed

### What Gets Tested

**Notebook Kernel (`src/test/suite/integration/notebook-kernel.test.ts` - 17 tests):**

- ✅ Notebook controller registration (tested via `vscode.workspace.openNotebookDocument`)
- ✅ ScriptSerializer: Deserialization (4 cell structure), serialization, round-trip
- ✅ MarkdownSerializer: Deserialization, cell kinds, content preservation
- ✅ Notebook creation with all supported formats

**Configuration (`src/test/suite/integration/config.test.ts` - 13 tests):**

- ✅ Settings retrieval (baseUrl, username, password, apiTimeout)
- ✅ Configuration detection (baseUrl, sshCommand, checkCertificates)
- ✅ URL formatting (http/https, credentials inclusion)
- ✅ Default values match package.json

**VS Code Compatibility (`src/test/suite/integration/vscode-compat.test.ts` - 19 tests):**

- ✅ Version parsing and comparison (`parseVersion`, `meetsMinimumVersion`)
- ✅ API availability checks (`hasAPI`)
- ✅ Safe call wrapper (`safeCall` with fallback)
- ✅ Notebook detection in different VS Code contexts

### Key Learnings

**1. Don't Instantiate Extension-Registered Objects**

- ❌ `new TikbookController()` → Fails (already registered)
- ✅ `vscode.workspace.openNotebookDocument('tikbook', data)` → Tests real behavior

**2. Script Format Creates 4 Cells:**

- Comment line before markdown → Code cell
- Markdown section → Markup cell
- Code sections → Code cells

**3. Use `config.inspect().defaultValue` for Deterministic Tests**

- Avoids reading user's personal settings
- Tests package.json defaults only

### Integration Test Config

**Files Created:**

- ✅ `.env.example` - Template for RouterOS test device configuration
- ✅ `src/test/suite/integration-test-config.ts` - Helper to load `.env` via dotenv
- ✅ Updated `.gitignore` - Added `.env` and `.env.local`
- ✅ Updated `eslint.config.mjs` - Allowed Node APIs in test files

**Usage:**

```typescript
import { getRouterOSTestConfig, hasRouterOSTestConfig } from './integration-test-config';

if (hasRouterOSTestConfig()) {
  const config = getRouterOSTestConfig();
  // Test with real RouterOS device
}
```

---

## Phase 2: Priority 2 - Low-Hanging Fruit Candidates (Future)

**Decision Point:** Continue with Approach 1 for additional coverage

### Identified Candidates

**Remote & SSH (`src/remote.ts`):**

- Terminal command execution (`exec()`)
- SSH connection management
- Error handling for connection failures
- **Complexity:** Requires SSH setup or mocking
- **Priority:** 🟡 Medium (used for SSH-based file editing)

**CodeLens (`src/codelens.ts`):**

- CodeLens provider registration
- Range calculation for inline hints
- Command invocation from lens
- **Complexity:** Low (purely API-based)
- **Priority:** 🟢 Low (nice-to-have UI feature)

**Status Watchdog (`src/watchdog.ts`):**

- Background status monitoring
- Status bar updates
- Error state detection
- **Complexity:** Medium (async timing, state management)
- **Priority:** 🟡 Medium (user-visible feature)

**Menu Handlers (`src/menus.ts`):**

- Menu command registration
- Context menu availability (`when` clauses)
- Command execution from menus
- **Complexity:** Low (similar to contributions.test.ts)
- **Priority:** 🟢 Low (already covered by command tests)

**Custom Editors:**

- Editor registration for `.rsc`, `.rscmd`
- File opening and syntax highlighting
- **Complexity:** Low (registration only)
- **Priority:** 🟢 Low (covered by notebook type tests)

### Not Prioritized (Complex, Separate Strategy Needed)

**Virtual Document Providers (`src/virtualdocs.ts`, `src/scriptfs.ts`):**

- ❌ **Reason:** 25+ API methods, complex state management, file watching
- ❌ **Strategy:** Requires separate planning document
- ❌ **Blocker:** May need Approach 3 (mocks) or Approach 5 (Docker)

**Video Playback (`src/video.ts`):**

- ❌ **Reason:** Webview-based, experimental feature
- ❌ **Strategy:** Manual testing only (per SARB guidance)

---

## Phase 2: Priority 1-2 - Notebook Kernel & Virtual FS (Weeks 3-4)

**Decision Point:** After Phase 1, review approach:

- Continue with Approach 1 tests
- Revisit Approach 3 if mock patterns needed
- Or defer for later phases

---

## Phase 3+: Future - Add Approach 5 (TBD)

**Trigger:** When Docker dev container feature is planned

**Will Enable:**

- End-user features: RouterOS testing environment
- Testing benefits: E2E validation, multi-version compat

---

## Current Testing State (February 2026)

**Total Tests: 115 (all passing)**

**Priority 0 (66 tests):**

- `src/test/suite/integration/contributions.test.ts`

**Priority 1 (45 tests):**

- `src/test/suite/integration/notebook-kernel.test.ts` (17 tests)
- `src/test/suite/integration/config.test.ts` (13 tests)
- `src/test/suite/integration/vscode-compat.test.ts` (19 tests - was 18, corrected hasAPI test to valid pattern)

**RouterOS Connection Validation (4 tests):**

- `src/test/suite/integration/connection-validation.test.ts` (4 tests)
- Tests HTTP connectivity, REST API availability, and authentication with real RouterOS device
- Uses `.sarbsettings` JSONC configuration file (see below)

**Existing Unit Tests:**

- `converters.test.ts` - String utilities
- `schema-mapper.test.ts` - Schema logic

**Test Infrastructure:**

- ✅ Dual-config pattern (`.vscode-test.mjs` for GUI, `.vscode-test-cli.mjs` for CLI)
- ✅ Custom reporter (`mocha-ai-reporter.cjs`) with AI/human-friendly output
- ✅ `.sarbsettings` (JSONC) support for RouterOS device testing
- ✅ Integration test helper (`integration-test-config.ts`) with JSONC comment parser

**Current Gap:** Virtual FS, SSH, CodeLens, Watchdog (deferred to Phase 2)

---

## Implementation Plan

### Step 1: Create Test Directory Structure

```bash
mkdir -p src/test/suite/integration
```

### Step 2: Implement Priority 0 Tests

See example test structure above. Use CLI test configuration (`.vscode-test-cli.mjs` for verbose output).

**Running tests:**

```bash
npm test                 # Desktop - shows spec output (test names + pass/fail)
npm run test:web         # Browser - shows spec output
```

**VS Code GUI (Extension Test Runner):**

- Uses `.vscode-test.mjs` (no reporter, GUI compatible)
- Click \"Run Test\" or \"Debug Test\" in test explorer

**Note:** Dual-config pattern enables both verbose CLI output (AI/human friendly) and GUI compatibility.

### Step 3: Add to CI/CD

Update GitHub Actions to run tests on every commit:

```bash
npm test
```

### Step 4: Update Documentation

Update `.github/instructions/testing.instructions.md` with:

- Approach 1 focus
- Priority 0 test location
- How to run tests locally
- CI/CD integration notes

---

## Tools

**No new dependencies needed.** Using existing:

- `vscode-test-cli@^0.0.12` ✅
- `mocha` ✅
- `@vscode/test-electron` (if needed)

**Optional later (for Phase 2):**

- `sinon` - Mocking
- `nock` - HTTP mocking

---

## Success Criteria

✅ All commands discoverable via `vscode.commands.getCommands(true)`  
✅ Notebook types load for correct file extensions  
✅ Settings accessible and have correct defaults  
✅ Tests run in CI/CD < 5 seconds  
✅ Tests fail if manifest is broken  

---

## Testing Against Real RouterOS Devices

### .sarbsettings Configuration (JSONC)

For tests that interact with actual RouterOS devices, use `.sarbsettings` file (JSONC format, not committed):

1. Copy `.sarbsettings.example` to `.sarbsettings`
2. Fill in your RouterOS device details:

   ```jsonc
   {
     "tikbook": {
       "baseUrl": "http://192.168.74.1:7080",
       "username": "admin",
       "password": "your-password-here",
       "apiTimeout": 5000
     },
     "vscode-test": {
       "timeout": 30000,
       "skipLiveTests": false
     }
   }
   ```

3. Tests will use `src/test/suite/integration-test-config.ts` helper:

   ```typescript
   import { getRouterOSTestConfig } from './integration-test-config';
   
   const config = getRouterOSTestConfig();
   // Tests skip or use defaults if .sarbsettings not present
   ```

**Security:** `.sarbsettings` is in `.gitignore` - credentials never committed.

**JSONC Parsing Note:** The comment parser in `integration-test-config.ts` uses a state machine to track string contexts, ensuring URLs like `http://` aren't mistaken for comment syntax.

### Settings Isolation Issue

**Problem Identified:** VS Code Extension Test Runner uses the user's actual VS Code settings, not package.json defaults. This causes test non-determinism:

- **Example:** User had `tikbook.baseUrl = 'http://192.168.74.1:7080'` in their settings
- **Result:** Settings test failed in GUI but passed in CLI (clean environment)

**Fix Applied:** Use `config.inspect().defaultValue` instead of `config.get()`:

```typescript
// ❌ BAD: Reads user settings
const baseUrl = config.get('baseUrl');

// ✅ GOOD: Reads package.json defaultValue
const baseUrl = config.inspect('baseUrl')?.defaultValue;
```

**Why This Matters:**

- Tests must be deterministic and reproducible
- CI/CD environment has no user settings (always passes)
- Local dev has user settings (may fail unexpectedly)
- Docker approach (Approach 5) solves this naturally with clean containers

### Why Docker Approach (Approach 5) Helps

**Settings Isolation Advantages:**

1. **Clean Environment:** Container has no user settings, only package.json defaults
2. **Reproducible:** Same environment for all developers and CI/CD
3. **Multi-Version Testing:** Test against VS Code Insiders, Stable, older versions
4. **RouterOS Integration:** Bundle RouterOS container for E2E tests with real API

**Current Workaround vs Future:**

- **Now:** Use `config.inspect().defaultValue` + `.env` for custom test devices
- **Future (Approach 5):** Docker dev container provides both clean settings + bundled RouterOS

**Decision Log:** Settings isolation issue discovered 2026-02, documented as additional rationale for Approach 5 when Docker dev container feature is planned.

---

## Not Planned (But Reconsidered Anytime)

- ❌ Browser/webview testing (Approach 2)
- ❌ Trace replay testing (Approach 4)
- 🟡 Mock-based integration (Approach 3) - future research

**Why**: Cost/ROI not justified. Can revisit if blockers emerge.
