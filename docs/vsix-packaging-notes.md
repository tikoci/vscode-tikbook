# VSIX Packaging Notes & Build Output Cleanup

## Current Status

After Bun build system transition, the web VSIX (.target web) is being packaged with both:
- ✅ `dist/extension.js` (2.1 MB) - correct web bundle
- ✅ `node_modules/` (7.2 MB) - OK for runtime dependencies
- ⚠️ `out/` (1.76 MB) - **unnecessary, only needed for node target**

This adds ~1.76 MB of waste to the web VSIX without providing functionality.

## Root Cause

When `vsix:package:web` runs:

```bash
npm run compile:web  # Creates dist/
npm run compile      # Creates out/ during vscode:prepublish
```

The `compile` script (run via vscode:prepublish) compiles the node target to `out/`, and vsce includes it even with `--target web` because both `main` and `browser` entry points are present in package.json:

```json
"main": "./out/extension.js",        // Node entry point
"browser": "./dist/extension.js",    // Web entry point
```

## Solutions (in order of preference)

### Option A: Explicit cleanup before packaging (RECOMMENDED)

Add cleanup step right before vsce package:

```bash
"vsix:package:web": "rm -f *-web.vsix && npm run clean && npm run lint && npm run compile:web && rm -rf out && npx @vscode/vsce package --target web ..."
```

**Pros:**
- Simple, explicit, works regardless of .vscodeignore quirks
- Ensures out/ is gone when vsce runs

**Cons:**
- Slightly fragile (depends on timing)

### Option B: Use .vscodeignore pattern more explicitly

Currently .vscodeignore doesn't explicitly exclude `out/`. While vsce should be smart about only including needed paths, adding explicit exclusion could help:

```ignore
# Build outputs - only include what the entry point needs
out/**         # Node build output - not needed for web package
```

**Note:** This needs careful testing as glob patterns interact with the build system.

### Option C: Conditional compilation (Future)

Create separate compile scripts that don't pollute each other:

```bash
"compile:node:only": "bun build src/extension.ts ... --outdir=./out-node"
"compile:web:only": "bun build src/extension.ts ... --outdir=./out-web"
"vsix:package:web": "... npm run compile:web:only"
```

**Pros:**
- Clean separation, no cleanup needed

**Cons:**
- Requires refactoring all related scripts (test:web, vscode:prepublish, etc.)
- More complex

---

## Recommended Action

**Today:** Use Option A - add `&& rm -rf out` before vsce package in web build

```json
"vsix:package:web": "rm -f *-web.vsix && npm run clean && npm run lint && npm run compile:web && rm -rf out && npx @vscode/vsce package --target web ..."
```

**Future:** Consider Option C if web/node builds need to be fully isolated

---

## Verification

After implementing cleanup:

```bash
npm run vsix:package:web
npx @vscode/vsce ls --tree tikbook-web.vsix | grep "out/"
# Should show nothing
```

Expected output:
```
tikbook-web.vsix
├─ dist/extension.js
├─ node_modules/
├─ media/
└─ (other runtime files)

# Should NOT show: out/
```

---

## File Size Reference

**Current web VSIX:**
- Total: 2.72 MB
  - dist/ (bundled code): 2.14 MB ✓
  - node_modules/: 7.22 MB (necessary)
  - media/ (icons): 21.72 KB ✓
  - out/ (node output): 1.76 MB ✗ unnecessary

**After cleanup:**
- Expected: ~2.8 MB (slight increase due to node_modules, but no duplicate output)
- out/ directory gone
- Web VSIX size more predictable

