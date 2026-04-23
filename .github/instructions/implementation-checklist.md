---
name: 'Implementation Checklist (XP-Inspired)'
description: 'Systematic workflow for implementation phases - use before starting any new module'
---

# Implementation Checklist for Phase-Based Development

Use this checklist for EVERY new implementation phase. Follows XP principles adapted for AI-assisted development.

---

## Pre-Implementation (Design Phase)

- [ ] **Read existing similar code** (2-3 files in same category)
  - Look for: patterns, error handling, logging, type conventions
  - Example: Before writing UTM provider, read remote.ts (GitHub API)
  - Time: 15-20 minutes

- [ ] **Design interfaces/types FIRST** (not implementations)
  - Share interface design before coding
  - Get approval on completeness
  - Document in JSDoc
  - Time: 30 minutes

- [ ] **Identify which files to create/modify**
  - New files (each with single responsibility)
  - Existing files to extend
  - Test files needed
  - Time: 10 minutes

- [ ] **Review ESLint rules for your file type**
  - Extension code: [.github/instructions/vscode-extension.instructions.md](../../.github/instructions/vscode-extension.instructions.md)
  - Common issues: no `any`, `override` keywords, error causes
  - Time: 5 minutes

---

## Implementation (File-by-File)

For each file you create:

### Step 1: Study the Pattern (5 min)

- [ ] Open 1 similar existing file
- [ ] Read first 50 lines
- [ ] Note: imports, JSDoc style, error handling
- [ ] Copy structure (don't innovate on syntax)

### Step 2: Create File (30-60 min)

- [ ] Write complete interfaces/types
- [ ] Add JSDoc comments
- [ ] Implement each method
- [ ] Include error handling with `{ cause: error }`
- [ ] Use proper return type annotations (`Promise<T>`)
- [ ] Avoid `any` types

### Step 3: Lint Immediately (2-5 min)

```bash
npx eslint src/path/to/new-file.ts --fix
```

- [ ] Fix any errors (not warnings)
- [ ] Verify no new errors introduced
- [ ] **Do NOT move to next file if linting fails**

### Step 4: Verify Imports (2 min)

- [ ] Does code import what it uses?
- [ ] Are relative paths correct (count `../` carefully)?
- [ ] No circular imports?

### Step 5: Move to Next File

- [ ] Mark file as "DONE" and tested
- [ ] Repeat Steps 1-4 for next file

---

## Test Writing (After All Files Created)

- [ ] **Copy test structure** from existing test file
  - Use: [src/test/unit/converters.test.ts](../../src/test/unit/converters.test.ts)
  - Or: [src/test/integration/phase1-unit.test.ts](../../src/test/integration/phase1-unit.test.ts)
  - Do NOT innovate on test syntax

---

## Pre-User-Testing Verification (MANDATORY)

**CRITICAL**: User relies on GUI Test Runner ("Testing" view) and "Run Extension" (F5) to test.
Both are blocked if `npm run compile` fails. Always verify BEFORE asking user to test.

- [ ] **Run full compile**

  ```bash
  npm run compile
  ```

  - Must exit with code 0 (success)
  - Warnings OK, but zero errors required
  - If errors exist: Fix them, don't ask user to test yet

- [ ] **Check out/ directory exists**

  ```bash
  ls -l out/extension.js
  ```

  - File should be recent (not stale from previous build)
  - Size should be >500KB (typical for bundled extension)

- [ ] **Run compile:test for GUI Test Runner**

  ```bash
  npm run compile:test
  ```

  - Builds out/test/**/*.test.js files
  - Required for tests to appear in VS Code Testing sidebar
  - If this fails, user can't use GUI test runner

### Why This Matters

- User workflow: Press F5 → "Run Extension" window opens → Test feature
- If compile fails: F5 doesn't work, testing view is empty, user is blocked
- Asking user to test without verifying compile = wasting their time
- **Fix all compile errors FIRST, then ask user to test**

### Common F5 Launch Issues

**"Could not find the task 'compile'" error:**

- Launch.json references `preLaunchTask: "compile"`
- But tasks.json needs explicit `"label": "compile"` on the npm task
- Without explicit label, VS Code auto-names it "npm: compile" (mismatch)
- **Fix:** Add `"label": "compile"` to the npm compile task in .vscode/tasks.json

**Example correct tasks.json:**

```json
{
  "label": "compile",
  "type": "npm",
  "script": "compile",
  ...
}
```

---

## Post-Implementation Communication

### What to Report in Chat (Not Docs)

- [ ] Brief summary: "Phase X complete. [Key results]. Ready for next phase."
- [ ] Verification you completed: "Compilation clean, tests pass, lint errors fixed."
- [ ] If NO UI: Just move forward
- [ ] If UI EXISTS: **Ask user to review visual/UX aspects**

### When to Ask User for Verification

**YES - Ask review for:**

- UI/visual changes (you can't see colors, layout, spacing)
- Workflow/behavior validation ("Does this match your expectations?")
- Manual testing steps ("Can you test VM creation flow?")

**NO - Don't ask review for:**

- Compilation (you verified)
- Test results (you ran them)
- Lint status (you checked)
- Code patterns (you compared examples)

### Documentation Decision

- [ ] Does this need a doc or just chat message?
  - Future reference value? → Create doc
  - Process report? → Chat summary
  - See: [docs/agentic-collaboration-patterns.md](../../docs/agentic-collaboration-patterns.md) Pattern 4

- [ ] **For each core function, write one test**
  - Import: types/functions to test
  - Arrange: create test data
  - Act: call function
  - Assert: check results
  - Time: 5 min per test

- [ ] **Use global `suite` and `test`** (not imports)

  ```typescript
  // ✅ CORRECT
  suite('Feature Name', () => {
    test('should do X', () => {
      assert.strictEqual(result, expected)
    })
  })

  // ❌ WRONG (don't import suite/test)
  import { suite, test } from 'mocha'
  ```

- [ ] **Test compilation** (not runtime)

  ```bash
  npm run compile:test
  ls -la out/test/**/your-test.test.js
  # File should exist (~XXX KB)
  ```

---

## Post-Implementation Verification

### Quick Verification (5 min)

```bash
# 1. Lint your new module
npx eslint src/your-module/ --ext ts
# Expected: 0+ errors (errors = BAD, fix before moving on)

# 2. Verify files exist
ls -la src/your-module/
# Look for all expected files

# 3. Check tests compile
npm run compile:test
# Expected: success, no import errors
```

### Medium Verification (15 min)

- [ ] **Open each new file** and scan for:
  - JSDoc present on public methods?
  - Error handling has `{ cause: error }`?
  - Return types explicit (not `any`)?
  - No `console.log` (use `log.info()` instead)?

- [ ] **Check interface completeness:**
  - All required methods implemented?
  - Types exported for users?
  - Documentation complete?

### Full Compilation Check

```bash
npm run compile
# Expected: success (may have warnings elsewhere)
```

- [ ] No new errors in src/your-module/
- [ ] Existing errors unchanged (pre-existing)

---

## Checkpoint: Ready for Code Review?

Before calling code "DONE":

- [ ] All files created and tested for compilation
- [ ] Zero ESLint errors in new code (warnings OK)
- [ ] All imports verify (run compile)
- [ ] Tests compile (not necessarily passing, but valid syntax)
- [ ] JSDoc present on public APIs
- [ ] Error messages are user-friendly
- [ ] Able to explain each design decision

---

## Code Review Readiness Checklist (For User/PM)

**What the user can check in 30 minutes:**

```bash
# 1. Lint passes
npx eslint src/your-module/ --ext ts

# 2. Compiles
npm run compile

# 3. Files structure
ls -la src/your-module/

# 4. Read interfaces (5 min)
# Open and review main interface/types for design

# 5. Spot-check implementation (10 min)
# Open main implementation file
# Scan for: error handling, logging, types

# Questions to ask:
# - Does this follow existing TikBook patterns?
# - Can I understand the design intent?
# - Are errors user-friendly?
# - Is it testable? (functions are pure/isolated)
```

If all above pass, code is review-ready.

---

## Anti-Patterns to Avoid

### ❌ Async Mistakes

```typescript
// BAD: async function with no await
async getSettings(): Promise<Settings> {
  return defaultSettings  // <- should be sync
}

// BAD: async without await in body
async loadFile(path: string): Promise<string> {
  const content = fs.readFileSync(path)  // <- should await or be sync
  return content
}

// GOOD: sync return with Promise constructor
getSettings(): Promise<Settings> {
  return Promise.resolve(defaultSettings)
}

// GOOD: truly async with await
async loadFile(path: string): Promise<string> {
  const content = await fs.promises.readFile(path)
  return content
}
```

### ❌ ESLint Violations

```typescript
// BAD: unused parameter (no underscore)
function processVM(name, config) { ... }

// GOOD: prefix unused params with underscore
function processVM(name, _config) { ... }

// BAD: no return type
export function validateInput(data) { ... }

// GOOD: explicit return type
export function validateInput(data): boolean { ... }

// BAD: error without cause
throw new Error('Something failed')

// GOOD: error with cause
throw new Error('Something failed', { cause: originalError })
```

### ❌ Web Extension Issues

```typescript
// BAD: process.platform (Node only, breaks on vscode.dev)
if (process.platform === 'darwin') { ... }

// GOOD: use VS Code API
import { env } from 'vscode'
if (env.appHost === 'desktop') { ... }
```

### ❌ Test Syntax

```typescript
// BAD: importing suite/test
import { suite, test } from 'mocha'
suite('Name', () => { ... })

// GOOD: use globals (already defined by Mocha)
suite('Name', () => {  // <- suite is global
  test('behavior', () => { ... })  // <- test is global
})
```

---

## Helpful Commands Reference

| Command | Purpose | When |
|---------|---------|------|
| `npx eslint src/path/file.ts --fix` | Fix one file | After creating each file |
| `npx eslint src/folder/ --ext ts` | Check folder | Before final compile |
| `npm run compile` | Full build | After all files + tests |
| `npm run compile:test` | Build tests only | To verify test syntax |
| `npm run lint` | Run all linters | Full suite check |
| `ls -la src/folder/` | Verify files exist | Quick spot-check |
| `head -50 src/file.ts` | Read first 50 lines | Pattern review |

---

## Time Estimates

| Phase | Task | Time |
|-------|------|------|
| Design | Read patterns + design interfaces | 1 hour |
| Implementation | Create N files (5-30 min each) | 2-3 hours |
| Testing | Write tests (5 min per test) | 30 min |
| Verification | Lint + compile + spot-check | 30 min |
| Review | User reads code | 30 min |
| **TOTAL** | **One complete phase** | **~5-6 hours** |

---

## Example: How This Was Applied in Phase 1

### ✅ Pre-Implementation

- Read [src/remote.ts](../../src/remote.ts) to understand GitHub API pattern
- Designed [src/vm-providers/vm-provider.ts](../../src/vm-providers/vm-provider.ts) interface first
- Got approval on design

### ✅ Implementation

- Created files one at a time
- Fixed ESLint errors immediately after each file
- Discovered async/await issues early

### ✅ Testing  

- Wrote [src/test/integration/phase1-unit.test.ts](../../src/test/integration/phase1-unit.test.ts) following existing patterns
- Focused on compile (not runtime) at this stage

### ✅ Verification

- `npx eslint src/vm-providers/ --ext ts` → 0 errors
- `npm run compile` → success
- Spot-checked interfaces and error handling

---

## Questions to Ask Yourself While Implementing

1. **"Have I seen this pattern before?"** → Look for existing code
2. **"Does this function need to be async?"** → Check for actual `await`
3. **"Will this work on vscode.dev?"** → No Node APIs
4. **"Does my error message help users?"** → Is language clear?
5. **"Can I write a test for this?"** → Pure function? Easy to mock?
6. **"Did I check ESLint yet?"** → Run it NOW, not at the end

---

## Success Criteria

A phase is complete when:

✅ All files lint without errors  
✅ `npm run compile` succeeds  
✅ Tests compile (even if not running)  
✅ You can explain each file's purpose  
✅ Design follows existing patterns  
✅ User can verify in 30 minutes  

When all above are true: **READY FOR REVIEW**
