---
name: 'Phase Scope Verification Workflow'
description: 'Verify feature scope before suggesting user testing'
applyTo: 'Coding tasks, feature implementation'
---

# Phase Scope Verification Workflow

## Problem

AI agent asked user to test CHR VM creation, but code was clearly deferred to Phase 3.

**Root cause:** Agent didn't verify feature scope before testing suggestion.

**Impact:** Wasted user time testing unimplemented features.

## Solution

Before suggesting user test a feature, verify scope in this order:

### Step 1: Check Code for Scope Markers

Look for these red flags in the implementation:

```typescript
// RED FLAG: Deferred implementation
log.warn(`<UTMProvider.createVM> NOT YET IMPLEMENTED`)
throw new Error('Creation not yet implemented. Phase 2 scope... Phase 3 will add...')
```

**Bad indicators:**

- Says "NOT YET IMPLEMENTED"
- Error mentions "Phase X" or "future"
- Comments say "TODO: Implement after..."
- Function body is stub/empty

**If found:** ❌ STOP - Feature is out-of-scope

### Step 2: Check Spec Document

Open `docs/specs/chr-test-environment.md` (or relevant spec).

Find Phase sections:

```markdown
### Phase 1: Core Provider
- listVMs(), getStatus(), startVM(), stopVM()

### Phase 1b: UI Integration
- Add CHR by version (version selection) ← IN SCOPE

### Phase 3: Windows Support
- (future work)
```

**Look for:**

- Is feature listed in your Phase?
- Is it marked "Deferred to Phase N"?
- Is it listed under current deliverable?

**If deferred:** ❌ STOP - Feature is future work

### Step 3: Check Todos

Open `docs/llm-todos.md` and `docs/future-features.md`.

Search for feature name. Look for completion status:

```markdown
### CHR VM Management (Phase 1-1b: Complete, Phase 3: Deferred)

**Phase 1-1b COMPLETE:**
- ✅ listVMs, startVM, stopVM
- ✅ Explorer view
- ❌ Create VM (deferred to Phase 3)
```

**If not complete or deferred:** ❌ STOP

### Summary: Three-Step Check

| Step | Check | If Found |
|------|-------|----------|
| 1 | Code says "NOT YET IMPLEMENTED" | Stop - deferred |
| 2 | Spec: Feature in later Phase | Stop - future work |
| 3 | Todo: Feature marked incomplete/deferred | Stop - not ready |

**Result:** If ANY step shows deferral → Do NOT suggest user test

## Real Example: CHR VM Create Command

**Code Check:**

```typescript
async createVM(options: { name: string; chrVersion: string; downloadUrl: string }): Promise<VM> {
  log.warn(`<UTMProvider.createVM> NOT YET IMPLEMENTED`)
  throw new Error('Phase 3 will add VM creation')
}
```

✗ RED FLAG: Stub with Phase 3 deferral

**Spec Check:**

```markdown
### Phase 1b: UI Integration
- Add CHR by version
  - QuickPick menu (Version selection) ← Phase 1b scope
  - After selection: Create VM ← DEFERRED
```

✗ Only UI part (version picking) is Phase 1b

**Todo Check:**

```markdown
### CHR VM Management
- ✅ Phase 1-1b: Get versions, display UI
- ❌ Phase 3: Actually create VMs
```

✗ Create is marked Phase 3

**Conclusion:** ❌ Do NOT test Create command

Instead: Test version selection works, but expect error about Phase 3.

## What TO Test (Same Feature, Different Parts)

```markdown
✅ Test: Version selection UI (Phase 1b scope)
  - "Can I pick a CHR version from QuickPick?"
  
❌ Test: VM creation itself (Phase 3, not implemented)
  - "Does it create the VM?" → No, stub throws error (correct!)
```

## Workflow Template

**Before suggesting user tests a feature:**

```zsh
DO:
1. Find implementation in src/
2. Search for "NOT YET IMPLEMENTED", "Phase 3", "TODO"
3. If found → STOP, note deferred
4. Open docs/specs/[feature].md
5. Search for feature in Phase sections
6. If deferred → STOP, note deferral
7. Check docs/llm-todos.md for status
8. If incomplete → STOP
9. ONLY THEN suggest testing

TIME: 5 minutes to prevent hours of debugging
```

## Red Flags (Auto-Detect)

Any of these patterns = feature is out-of-scope:

- Code: `NOT YET IMPLEMENTED`
- Code: `throw new Error('... Phase 3 ...')`
- Code: `// TODO: Implement after Feature X`
- Spec: Feature listed in Phase 2/3 sections
- Todo: Feature marked with `/3` or future phase
- Todos: Feature marked incomplete/deferred

## Documentation References

- [Logging Best Practices](.github/instructions/logging-ui-context.md) - UI context in logs
- [AI Code Editing](.github/instructions/ai-editing-best-practices.md) - Safe edits
- [Feature Specs](./docs/specs/README.md) - Complete specifications
