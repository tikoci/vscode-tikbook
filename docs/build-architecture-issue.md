# Build Architecture Issue: Web Extension Bundling (RESOLVED)

## ✅ Solution Implemented (2026-02-26)

The web extension bundling issue has been resolved by switching from tsc-only to **Bun for both node and web builds**.

### What Was The Problem

Previous build pipeline created 16 separate `.js` files, and when vscode.dev tried to load the web extension, it failed with: "Cannot load module './codelens'" because the web extension host cannot resolve relative requires across multiple files.

### File Structure Problem

Current `out/` contains:

- `extension.js` (2.5 KB) - has requires to 16 other files
- `codelens.js` (5.3 KB) - separate file
- `commands.js` (7.4 KB) - separate file
- ... 13 more separate files ...

For web extensions, needs:

- `extension-web.js` (single file, ~500+ KB) - contains all code bundled together

## Solution Requirements

Build tooling must:

1. **Bundle all 16 modules** into a single `extension-web.js` file
2. **Resolve relative requires** (e.g., `require("./codelens")` → inline the actual code)
3. **Include dependencies** (`luxon`, `axios`, etc.) in the bundle
4. **Generate source maps** for debugging
5. **Work for both dev and packaging** - single source, single build pipeline
6. **Support all test runners** - `npm test` (desktop) and `npm run test:web` (browser)

## Evaluated Options

### Option 1: Bun (Preferred - Previous Success)

- **Pros**: Built-in bundling, fast, single unified build, previously worked for this project
- **Cons**: Requires learning/migration
- **Status**: User mentioned Bun worked well before and was less worse than webpack

### Option 2: esbuild (Microsoft Alternative)

- **Pros**: Simpler than webpack, fast, modern, good VS Code support
- **Cons**: New tool to learn
- **Status**: VS Code recommends as webpack alternative

### Option 3: webpack (Microsoft Official)

- **Pros**: Official VS Code documentation, mature
- **Cons**: Complex configuration, verbose, user previously chose Bun over this
- **Status**: Rejected in previous release

### Option 4: Continue without bundling

- **Cons**: Web extensions will not work
- **Status**: Not viable

## References

- [VS Code Web Extensions - Bundling](https://code.visualstudio.com/api/extension-guides/web-extensions#bundling-extension)
- esbuild: <https://esbuild.github.io/>
- Bun: <https://bun.sh/>

## Decision Pending

User guidance needed on:

1. Should we attempt Bun bundling given it worked before?
2. Or use esbuild as lighter-weight alternative?
3. How to align development and packaging builds?
