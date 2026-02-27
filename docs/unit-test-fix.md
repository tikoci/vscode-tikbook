# Unit Test Framework Fix Summary

> **⚠️ CRITICAL: This issue can recur if dependencies are downgraded**
>
> **Symptom**: `npm test` reports "Exit code: 0" but no tests actually run
>
> **Quick Fix**: Verify `package.json` has `"@vscode/test-cli": "^0.0.12"` then run `npm install`

---

## Problem Diagnosed

Your unit tests stopped working with `npm run test` due to a **critical bug in vscode-test-cli's dependencies**:

- **Root Cause**: `@vscode/test-cli` versions **< 0.0.12** use `c8@9.1.0`, which has unsupported glob/minimatch patterns
- **GitHub Issue**: [vscode-test-cli#79](https://github.com/microsoft/vscode-test-cli/issues/79) - "C8 needs upgrade to 10.0+ to address unsupported glob"
- **Deprecated Warning**: `npm warn deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported`

### Why This Is Silent and Dangerous

- Tests appear to "pass" (exit code 0) because the test runner starts successfully
- But glob patterns fail to match any test files, so **zero tests actually execute**
- No error message - just success with no test output
- Can go unnoticed until you realize tests aren't catching bugs

## Diagnosis Steps

**If you suspect tests aren't running:**

1. Check version: `npm list @vscode/test-cli` (must be >= 0.0.12)
1. Add a failing test temporarily: `assert.fail('test is running')`
1. Run `npm test` - if exit code is 0, tests are NOT running
1. Check for warning: `npm warn deprecated glob@7.2.3`

## Fixes Applied

### 1. Upgraded @vscode/test-cli (CRITICAL - DO NOT DOWNGRADE)

- **Minimum Required**: v0.0.12 or higher
- **Broken Versions**: v0.0.6, v0.0.8, v0.0.9, v0.0.10, v0.0.11 (all use old c8)
- **Fixed In**: v0.0.12+ (uses c8@10.1.3 with glob support fixed)
- **Command**: `npm install --save-dev @vscode/test-cli@latest`
- **Verify**: Check `package.json` has `"@vscode/test-cli": "^0.0.12"` or higher

### 2. Converted .vscode-test config to ESM format (RECOMMENDATION)

- **From**: `.vscode-test.js` (CommonJS with require)
- **To**: `.vscode-test.mjs` (ES Modules)
- **Why**: Microsoft's official example uses `.vscode-test.mjs`; often more reliable with vscode-test-cli

### 3. Implemented dual-config pattern (AI-FRIENDLY OUTPUT)

- **Problem**: vscode-test-cli config overrides CLI `--reporter` args, but Extension Test Runner breaks if config has reporter
- **Solution**: Two config files for separate use cases
  - `.vscode-test.mjs` - NO reporter (Extension Test Runner GUI)
  - `.vscode-test-cli.mjs` - custom reporter (writes `.vscode-test/test-output.log`)
- **Benefit**: CLI tests show clear pass/fail with test names (human and AI readable)
- **Usage**: `npm test` uses CLI config automatically

### 4. Updated glob pattern (EXACT MATCH)

- **Pattern**: `'out/test/**/*.test.js'` (explicit `.test.js` suffix, like Microsoft example)
- **Previous**: Various glob patterns including `**/*.js` (too broad)

## Files Changed

1. **package.json** - `@vscode/test-cli` **pinned to ^0.0.12**; test scripts use `.vscode-test-cli.mjs`; added `format` script
1. **.vscode-test.mjs** - GUI config (no reporter, Extension Test Runner compatible)
1. **.vscode-test-cli.mjs** - CLI config (custom reporter writing `.vscode-test/test-output.log`)
1. **mocha-ai-reporter.cjs** - CLI reporter that writes output to `.vscode-test/test-output.log`
1. **.vscode-test.js** - **DELETED** (had literal syntax errors and was being loaded instead of .mjs)
1. **.vscode/launch.json** - Simplified to "Run Extension" and "Run Web Extension"
1. **.vscode/tasks.json** - Single `compile` task (removed watch mode)
1. **src/test/preprocessor.test.ts** - Added `void` operator to fix floating promise error
1. **.github/copilot-instructions.md** - Added critical warning about test-cli version and markdown workflow
1. **.github/instructions/testing.instructions.md** - Added test framework version requirements and verification
1. **.github/instructions/documentation.instructions.md** - Added markdown linting workflow
1. **.markdownlint-agentic.yaml** - Relaxed rules (MD029, MD041) for docs/instructions
1. **.markdownlint-strict.yaml** - Strict defaults for public docs

## Current Status

✅ **Fixed and Cleaned Up**:

- No more ESLint floating promise errors
- Config file properly formatted as ESM (`.vscode-test.mjs`)
- Proper glob pattern aligned with Microsoft's recommendation
- c8 dependency updated to support glob patterns
- launch.json simplified with clear naming
- Both `npm test` and `npm run test:web` confirmed working

**Important Note**: CLI test output is now captured in `.vscode-test/test-output.log` even when stdout is minimal. Use that file as the source of truth for pass/fail details.

## How to Run Tests

- **Desktop Tests**: `npm test` or `npm run test`
- **Web Tests**: `npm run test:web`
- **Debug Extension**: Use "Run Extension" or "Run Web Extension" from VS Code's Run and Debug panel

### GUI Runner Interop Notes

If the VS Code Extension Test Runner shows "Test process exited unexpectedly" for "Run Test" but "Debug Test" works, see [testing-extension-test-runner-interop.md](./testing-extension-test-runner-interop.md) for details, workarounds, and upstream fix ideas.

### Verifying Tests Actually Run

**CRITICAL**: After any changes to `.vscode-test.mjs`, verify BOTH desktop and web tests catch failures:

```bash
# 1. Add a temporary failing test to any test file
# Example: assert.fail('verify test runs')

# 2. Compile and test desktop
npm test  # Should exit with code 1 and show failure

# 3. Test web
npm run test:web  # Should also exit with code 1 and show failure

# 4. Remove the failing test and verify clean run
npm test  # Should exit with code 0
```

If either environment shows exit code 0 with a failing test, the test runner is broken for that environment.

## Troubleshooting If Tests Still Don't Run

If tests refuse to work even after these changes:

1. **Check for duplicate config files**: `ls -la .vscode-test.*` - should only show `.vscode-test.mjs`
   - If `.vscode-test.js` exists, delete it: `rm .vscode-test.js`
   - vscode-test-cli loads .js files first, even if they're broken
1. **Clear node_modules**: `rm -rf node_modules && npm ci`
1. **Rebuild TypeScript**: `npm run compile`
1. **Check vscode version**: `npx vscode-test --version` should show validated version
1. **Verify file paths**: `find out/test -name "*.test.js" -type f` should list all test files

## Key Learning: The Security Issue

Minimatch (glob library) has had **multiple security patches** that sometimes break globbing:

- v8 → v9: Major changes, broke old glob@7
- v9 → v10: Further improvements, fixed c8 coverage issues
- v10 → current: Ongoing security patches

When upgrading vscode-test-cli, c8, and glob packages, version mismatches can cause silent failures where tests "run" (exit 0) but don't actually execute any mocha tests.

## Preventing Recurrence

**This issue can return if:**

- Someone runs `npm install @vscode/test-cli@0.0.8` or similar old version
- `package-lock.json` gets corrupted or regenerated with old versions
- Dependencies are downgraded during merge conflicts

**Prevention checklist:**

1. ✅ `package.json` has `"@vscode/test-cli": "^0.0.12"` (not lower!)
1. ✅ Run `npm list @vscode/test-cli` periodically to verify installed version
1. ✅ Add a failing test before major changes to confirm tests are executing
1. ✅ CI/CD should fail if tests report 0 runs (not just check exit code)

## Recommendations for Future

1. ✅ **DONE**: Document in copilot-instructions.md with version warning
1. ✅ **DONE**: Add critical note to testing.instructions.md
1. **TODO**: Add CI test in GitHub Actions to verify test count > 0
1. **TODO**: Consider pre-commit hook: `npm list @vscode/test-cli | grep -v '@0\.0\.[0-9]"'`
