# Manual Testing Web Extensions & Verification Guide

This guide covers critical manual testing that AI/automated tools cannot detect for web extensions and build system changes.

## Why Manual Testing is Essential

Automated testing and CI/CD catch **most issues**, but **web extension testing requires human verification** because:

- **Browser CSP & CORS** - JS errors might be silently swallowed by Content Security Policy
- **Extension activation** - GUI menu/command visibility confirms the extension actually loaded
- **Real vscode.dev environment** - The simulated test runner (`npm run test:web`) runs with `node_modules` available; real vscode.dev only has packaged VSIX
- **Test runner integration** - GUI test discovery is independent from CLI test discovery

These are the **two critical manual tests** after any build system changes:

---

## Test 1: Web Extension Loading on VS Code for Web (vscode.dev/github.dev)

**Purpose:** Verify the web VSIX packaging and bundling works correctly; confirm extension loads and commands appear.

**Note:** vscode.dev and github.dev share the same web extension host and CSP behavior. For build and testing purposes, treat them as equivalent. Differences are mostly authentication, repo context, and entry point UI, not extension loading or runtime behavior.

**Prerequisite:** Must have run `npm run vsix:serve` (or `npm run vsix:package:web` to create the VSIX)

### Quick Steps

1. **Open VS Code for Web**
   ```
   https://vscode.dev
   ```

2. **Open command palette** 
   - `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P`

3. **Install extension from location**
   - Type: "Developer: Install Extension From Location..."
   - Press Enter

4. **Enter localhost URL**
   - `https://localhost:5000` (or the port shown in `npm run vsix:serve` output)
   - Press Enter
   - Wait 5-10 seconds for installation

5. **Trigger extension activation**
   - Press `Option+Shift+M` (or `Alt+Shift+M` on Windows/Linux)
   - **Expected:** Quick menu appears with options like:
     - "Show TikBook Menu" 
     - "New TikBook Notebook"
     - etc.

6. **Verify no errors**
   - Open browser **web inspector** (F12 or Cmd+Option+I)
   - **Console tab:** Look for error messages (not just red badges—actually click and read)
   - **Check "Extension Host (Worker)" output:** If visible in Web Inspector, look for "Activating extension..." messages
   - Filter console to show "All levels" (not just Errors)

### What You're Verifying

✅ **Pass conditions:**
- Menu appears after `Option+Shift+M`
- Commands are visible and clickable
- No "Cannot load module" errors in console
- No "Activating extension failed" messages

⚠️ **Known Issues (Expected):**
- RouterOS LSP not activating ("Language client is not ready") - LSP is Node-only, can't work in web sandbox
- Icon doesn't display (CORS issue from ibb.co) - cosmetic only, not a build issue
- "package.nls.json 404" - expected for extensions without translation files

❌ **Fail conditions (build system issue):**
- Menu doesn't appear or throws error
- Console errors mention "Cannot resolve" or module loading
- Extension doesn't load/activate at all

### Diagnostic Console Logs to Check

**Good signs** (Extension host):
```
[12:34:56] Activating extension TIKOCI.tikbook
[12:34:56] TIKOCI.tikbook (EXTENSION) ✓ Activation succeeded
[12:34:56] [TikBook] Starting TikBook for RouterOS
```

**Bad signs** (Something is broken in build):
```
[12:34:56] Cannot load module './codelens'
[12:34:56] Activating extension 'TIKOCI.tikbook' failed
[12:34:56] Error: ENOTFOUND
```

---

## Test 2: VS Code Extension Test Runner GUI

**Purpose:** Verify the test runner GUI can discover and run tests; ensures test infrastructure still works.

**Note:** The GUI test runner is **independent from CLI testing** (`npm test`). They have different discovery mechanisms.

### Prerequisites

1. **Tests must be compiled first** (GUI runner doesn't auto-compile)
   ```bash
   npm run compile:test
   ```
   
   Or to compile everything:
   ```bash
   npm run compile && npm run compile:test
   ```

2. **Open the test sidebar**
   - Click **Testing icon** in VS Code activity bar (beaker icon)
   - Should see "Extension Tests" view

### Verification Steps

1. **Check test discovery**
   - In the test sidebar, expand "Extension Tests"
   - **Expected:** See test suites:
     - Priority 0: Extension Contributions (33 tests)
     - Priority 1: Configuration & Settings (45 tests)
     - RouterOS Connection Validation (4 tests)
     - etc.

2. **Run a single test**
   - Click the **Play icon** ▶️ next to a test name
   - Tests should execute in about 30 seconds
   - Results appear with ✓ (pass) or ✗ (fail)

3. **Debug a test**
   - Click the **Debug icon** 🐛 next to a test name
   - A new VS Code window opens with debugger attached
   - Can set breakpoints and step through code

4. **Run all tests**
   - Click Play icon at top level to run entire suite
   - Should show "91 tests passed" or similar

### What You're Verifying

✅ **Pass conditions:**
- Tests appear in sidebar after compile
- Can run individual tests successfully
- Debug mode opens debugger window
- All 91 tests pass

❌ **Fail conditions (test infrastructure broken):**
- Tests don't appear (usually means `out/test/` not compiled)
- Run fails with "No tests found" despite compiling
- Test results show failures that don't match CLI results

### If Tests Don't Appear

**Common cause:** Tests not compiled. Run:

```bash
npm run compile:test
```

Then reload VS Code sidebar (click refresh icon in test panel).

**Alternative:** Use the "Debug Tests" launch configuration:
- Open Run view (Cmd+Shift+D)
- Select "Debug Tests" from dropdown
- Click **Play** button
- This will compile tests first, then run

---

## Test 3: Verify VSIX Size & Contents (Sanity Check)

After packaging, especially after build system changes, verify the VSIX isn't bloated:

```bash
# After npm run vsix:package:web
ls -lh tikbook-web.vsix
# Should be 2-3 MB

# Check what's inside
npx @vscode/vsce ls --tree tikbook-web.vsix | head -30
# Should show:
# ✓ dist/extension.js (bundled web code)
# ✓ node_modules/ (runtime deps)
# ✓ media/ (icons, SVGs)
# ✗ Should NOT show: out/, tests/, src/, docs/, package-lock.json-save-*
```

---

## Testing After Build System Changes

**Always verify both tests when:**
- Changing build tools (tsc, Bun, esbuild, etc.)
- Modifying webpack/bundle config
- Updating source map generation
- Changing entry points or output directories
- Adding/removing dependencies

**Testing checklist:**

- [ ] `npm run compile` produces output without errors
- [ ] `npm run compile:web` produces output without errors  
- [ ] `npm test` runs and passes (91 tests)
- [ ] `npm run test:web` runs in browser without errors
- [ ] VS Code Test GUI shows tests (after `npm run compile:test`)
- [ ] Web extension menu appears on vscode.dev with `Option+Shift+M`
- [ ] No "Cannot load module" errors in browser console
- [ ] VSIX file is reasonable size (2-3 MB for web, similar for node)
- [ ] VSIX doesn't contain backup files or unwanted directories

---

## Debugging Web Extension Loading Issues

If the menu doesn't appear on vscode.dev:

### 1. Check VSIX contents
```bash
npx @vscode/vsce ls --tree tikbook-web.vsix | grep extension.js
# Should show: dist/extension.js in output
```

### 2. Check npx serve output
Look at terminal where `npm run vsix:serve` is running:
```
HTTP  GET /package.json      → 200 ✓
HTTP  GET /dist/extension.js → 200 ✓  (should be large, ~800KB)
HTTP  GET /icon.png          → 304 ✓  (cached)
```

If you see **404** for extension.js, the build output doesn't exist.

### 3. Check browser console (F12)
- Go to **Console** tab
- Make sure all message levels shown (don't filter to only Errors)
- Look for module loading errors or activation failures

### 4. Check "Extension Host (Worker)" in DevTools
- Some errors only appear in the extension worker context
- Look for anything mentioning "Activating extension" or module failures

### 5. Verify compile step
```bash
ls -lh dist/extension.js out/extension.js
# Both should exist and be >600KB
```

---

## CORS Issues (Reference Only)

**⚠️ Note:** CORS issues when **using TikBook features** (like connecting to RouterOS) are **NOT build issues**. The build system is working correctly if the menu appears.

**CORS is a separate architectural issue** requiring:
- Reverse proxy between vscode.dev and RouterOS device
- Certificate trust configuration on all parties
- This is beyond scope of build system testing

**For build verification, it's sufficient to confirm:**
- Extension loads and registers commands
- Menu appears when triggered
- No "Cannot load module" errors

If the menu works but RouterOS connection fails, that's a CORS/networking config issue, not a build issue.

---

## Summary: Quick Manual Test

**5-minute verification after any build changes:**

```bash
# 1. Compile everything
npm run compile && npm run compile:test

# 2. Terminal 1: Start server
npm run vsix:serve

# 3. Terminal 2: Go to https://vscode.dev, install from https://localhost:5000, press Option+Shift+M
# 4. Check: Does menu appear? No errors in console?

# 5. Back in VS Code: Open test sidebar, expand "Extension Tests"
# 6. Check: Do test suites appear? Can you run a test?

# ✅ If menu appears AND tests show in GUI: Build system working correctly
# ❌ If either fails: Likely build/bundling issue requiring investigation
```

