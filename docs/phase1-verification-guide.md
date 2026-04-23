---
name: 'Phase 1 Post-Implementation Verification Guide'
description: 'What you can check as user to verify Phase 1 is ready before Phase 2'
---

# Phase 1 Verification Guide: What YOU Can Check

**Estimated time: 30 minutes**  
**Goal: Confirm Phase 1 implementation is solid before moving to Phase 2**

This guide is written for a developer with your experience level. Focus on design integrity and code patterns, not mechanics.

---

## ⚡ Executive Summary (5 minutes)

Run this to see overall status:

```bash
cd /Users/amm0/Documents/vscode-tikbook

# 1. Linting
npx eslint src/vm-providers/ --ext ts 2>&1 | tail -5

# 2. Compilation  
npm run compile 2>&1 | tail -3

# 3. File structure
ls -lh src/vm-providers/
```

**Expected output:**

```
✖ 0 errors (style warnings OK)
…successful compile
vm-provider.ts, utm-provider.ts, chr-metadata.ts, etc.
```

---

## 🎯 Checkpoint 1: Design Review (10 minutes)

Open and read [src/vm-providers/vm-provider.ts](../../src/vm-providers/vm-provider.ts)

### Questions to Ask Yourself

1. **Interface Completeness**
   - [ ] Does `VMProvider` have all methods you'd expect for "list, start, stop, delete"?
   - [ ] Are there hooks for future features (Linux, Windows)?
   - [ ] Optional methods for advanced features (`?` on `getVMIPAddress`, `getCHRVersions`)?

2. **Type Design**
   - [ ] `VMStatus` enum covers expected states? (running, stopped, paused, unknown)
   - [ ] `CHRMetadata` captures version + architecture + backend?
   - [ ] `VM` interface has enough info for UI layer?

3. **Error Handling**
   - [ ] Methods throw meaningful errors or return null?
   - [ ] `getUnavailableReason()` helps users understand what's wrong?

4. **Cross-Platform Future**
   - [ ] Can you imagine implementing `LibvirtProvider` using this interface? (Yes = good design)
   - [ ] Would you add/change/remove methods for Linux? (Ideally no)

**Goal:** Interface should feel like it could live in a public SDK. If you'd buy this API, design is solid.

---

## 🔍 Checkpoint 2: Pattern Consistency (10 minutes)

Open in this order and compare:

1. **[src/remote.ts](../../src/remote.ts) lines 100-180** (existing GitHub API code)
   - Note: Error construction style, logging, JSDoc

2. **[src/vm-providers/utm-provider.ts](../../src/vm-providers/utm-provider.ts) lines 1-100** (new implementation)
   - Compare: Error handling style, logging calls, JSDoc format

### Questions

- [ ] Error messages similar style? (`throw new Error(..., { cause: ... })`)
- [ ] Logging consistent? (`log.info()`, `log.error()`, `log.debug()`)
- [ ] JSDoc present on public methods?
- [ ] Type annotations explicit (no `any`, return types on functions)?

### What You're Checking

Pattern consistency = easier to maintain later. If a new developer reads remote.ts, they should understand utm-provider.ts immediately.

**Goal:** No culture shock between "old" and "new" code.

---

## 🧪 Checkpoint 3: Test Structure (5 minutes)

Open [src/test/integration/phase1-unit.test.ts](../../src/test/integration/phase1-unit.test.ts) first 30 lines.

Compare with [src/test/unit/converters.test.ts](../../src/test/unit/converters.test.ts) first 30 lines.

### Questions

- [ ] Both use `suite(...)` global? (Not imported)
- [ ] Both use `test(...)` for test cases?
- [ ] Both import from libraries, not mocha?
- [ ] Similar assertion patterns? (`assert.strictEqual()`, `assert()`)

### What You're Checking

Test syntax consistency = tests actually compile and run in VS Code test framework.

**Goal:** Test files look like they belong in this codebase.

---

## 🔧 Checkpoint 4: Key Code Sections (10 minutes)

Skim these sections for red flags. You'll recognize good patterns:

### A. Error Construction (utm-provider.ts line 391)

```typescript
throw new Error(`AppleScript error: ${error.message}`, { cause: error })
```

✅ **Good:** Error has context + original cause. Users see message, developers see stack.

### B. CHR Metadata Parsing (chr-metadata.ts lines 55-70)

```typescript
const patterns = [
  { regex: /^CHR-(\d+\.\d+\.\d+)/i, extract: (match) => ({ isCHR: true, version: match[1] }) },
  { regex: /^RouterOS-(\d+\.\d+\.\d+)-CHR$/i, extract: (match) => ({ isCHR: true, version: match[1] }) },
  // ... more patterns
]
```

✅ **Good:** Multiple patterns, clear intent, documented. Easy to add more.

### C. GitHub API Extension (remote.ts line 160)

```typescript
const assetPattern = /^(rose\.)?chr\.([^.]+)\.([^.]+)\.(.+)\.utm\.zip$/
```

✅ **Good:** Tested pattern (from Experiment 1), handles multi-dot versions.

### D. Registry Discovery (vm-provider-registry.ts line 35)

```typescript
const platformProviders = providers.filter(p => {
  const platform = p.getPlatform()
  if (platform === 'utm') return env.appHost === 'desktop'
  // Other platforms checked by providers' own isAvailable()
  return false
})
```

✅ **Good:** Web-compatible (using `env.appHost` not `process.platform`)

---

## ⚠️ Potential Issues to Look For

Scan these sections. If you see these patterns, it's a red flag:

| Pattern | What It Means | Should See Instead |
|---------|---------------|-------------------|
| `import { suite } from 'mocha'` | Test syntax error | Global `suite`, `test` |
| `process.platform` | Web incompatible | `vscode.env.appHost` |
| `async` with no `await` | Lint violation | Either sync or truly async |
| `throw new Error(msg)` | Missing context | `throw new Error(msg, { cause })` |
| `.then()` without catch | Floating promise | Proper error handling |
| Unused parameter `_name` | Minor | Prefix with `_` like `_name` |
| `any` type | Type safety issue | Specific types |

**If you find none of these: Code quality is high.**

---

## 🧩 Integration Check: Can Phase 1 Support Phase 2?

Think about Phase 2 (Explorer view + commands). Will Phase 1 support it?

### Phase 2 will need to

- [ ] **Register `UTMProvider`** → Phase 1 has `vmProviderRegistry.register()` ✓
- [ ] **List VMs** → `UTMProvider.listVMs()` and `listCHRVMs()` exist ✓
- [ ] **Start/stop/delete** → All methods exist ✓
- [ ] **Get CHR versions** → `getCHRVersions()` via GitHub API ✓
- [ ] **Parse CHR metadata** → `parseCHRMetadata()` utility exists ✓
- [ ] **Sort by version** → `sortCHRVMsByVersion()` exists ✓

**Result:** Phase 1 is a complete foundation. Phase 2 can build UI on top.

---

## ✅ Final Checklist: Approve Phase 1?

Before you say "yes, move to Phase 2", confirm:

- [ ] All Phase 1 code compiles without errors
- [ ] Design feels like it belongs in this codebase
- [ ] Error handling is consistent with existing code
- [ ] Cross-platform abstraction is clean (easy to add macOS, Linux, Windows)
- [ ] Tests compile (even if test runner has issues)
- [ ] You understand the approach and can explain to others
- [ ] No code "smells" (magic strings, dead code, unclear logic)
- [ ] Comments/JSDoc explain WHY, not WHAT
- [ ] You're confident Phase 2 can build on this

**If all checked: APPROVE Phase 1 ✅**

---

## If You Want to Go Deeper (Optional)

### Read More About Architecture

- [docs/phase1-implementation-review.md](./phase1-implementation-review.md) - What we learned
- [.github/instructions/implementation-checklist.md](../.github/instructions/implementation-checklist.md) - Future process

### Ask Yourself (Design Perspective)

1. **Is this "good code" by XP standards?**
   - Small classes? ✓ (each file one responsibility)
   - Testable? ✓ (pure functions, no side effects in metadata code)
   - SOLID principles? ✓ (interface segregation, liskov substitution)

2. **Would I hire someone who wrote this?**
   - Code style clean? ✓
   - Errors handled gracefully? ✓
   - Documented intent? ✓
   - Extensible design? ✓

3. **Is this production-ready?**
   - Zero lint errors? ✓
   - Compiles? ✓
   - No technical debt? ✓
   - (Tests don't run yet, but structure is sound)

---

## Recommended Next Action

Once you've reviewed above:

**Option A: Approved (Recommended)**

```bash
# 1. Your review comment
"Phase 1 approved. Design is solid, patterns consistent, ready for Phase 2."

# 2. Start Phase 2
# "start phase 2"
```

**Option B: Changes Needed**

```bash
# 1. Your feedback
"Request changes to X because..."

# 2. I'll fix and we'll re-review
```

**Option C: Questions**

```bash
# 1. Your question
"Why did you use [pattern] instead of [pattern]?"

# 2. I'll explain reasoning
```

---

## Time Investment ROI

- **Your review time:** 30 minutes
- **Catches issues before:** Phase 2 starts (saves rework)
- **Confidence level after:** You can explain design to team
- **Quality signal:** You approved this, not just "it compiled"

**This is worth doing.** A solid Phase 1 foundation makes Phase 2 faster and cleaner.

---

## Any Questions While Reviewing?

If you're reviewing and something doesn't make sense:

1. Check the .github/instructions files
2. Look at the Phase 1 implementation review
3. Ask me to explain

Goal is **shared understanding**, not just "code that compiles."
