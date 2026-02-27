# Testing VS Code Web Extensions Locally

This guide covers testing the TikBook extension with VS Code for Web ([vscode.dev](https://vscode.dev) and [github.dev](https://github.dev)), or local VS Code for Web.

**Key Insight:** VS Code for Web (vscode.dev and github.dev) **requires `https://localhost` with trusted certificates**. It blocks both `http://localhost` and external services like ngrok due to Content Security Policy (CSP).

## vscode.dev vs github.dev

Both are the same VS Code for Web host from an extension/runtime perspective. For TikBook build and testing, treat them as equivalent. Differences are mostly around GitHub authentication, repo context, and UI entry points, not extension loading or CSP behavior.

## Quick Start

### Desktop VS Code (Fastest)

```bash
npm run vsix:install
```

Packages and installs directly to desktop VS Code. Fastest feedback loop.

### Local Browser Testing (Recommended for web target validation)

```bash
npm run test:web
```

Runs the full test suite in a local Chromium-based VS Code for Web instance. This is the **official VS Code testing approach** and avoids HTTPS/CSP issues entirely.

### vscode.dev Testing (Final validation before publishing)

VS Code for Web cannot read VSIX files (ZIP archives) directly and requires HTTPS from `localhost` with trusted certificates.

**One-time setup** (install mkcert):

```bash
# macOS
brew install mkcert

# Then create trusted localhost certificates
mkdir -p $HOME/certs
cd $HOME/certs
mkcert -install
mkcert localhost
```

**For each test session:**

```bash
npm run vsix:serve
```

This command:

1. Builds **only** the web VSIX (`tikbook-web.vsix`) - no need for node version when testing vscode.dev
2. Extracts it to `.vsix-serve/extension/` (VSIX is a ZIP; vscode.dev needs directory access)
3. Serves via HTTPS on `https://localhost:5000` with your mkcert certificates

**Then in vscode.dev:**

1. Open <https://vscode.dev>
2. Press `Cmd+Shift+P` (or `Ctrl+Shift+P`)
3. Run: **Developer: Install Extension From Location...**
4. Enter: `https://localhost:5000` (no trailing slash)
5. Click **Install**

VS Code will fetch `package.json` and `dist/extension.js` from that URL. Check browser console (F12) for logs/errors.

**Status:** The web extension now properly bundles using Bun (as of 2026-02-26). Both code and commands load correctly on vscode.dev.

## Why mkcert + localhost?

**Content Security Policy (CSP) Whitelist:** vscode.dev only allows extensions from specific trusted sources. Both `http://localhost` and external tunnels like ngrok are **blocked by CSP**. Only `https://localhost` with a **trusted certificate** works.

**Official VS Code Approach:** The [VS Code Web Extensions guide](https://code.visualstudio.com/api/extension-guides/web-extensions#test-your-web-extension-in-vscodev) explicitly documents this mkcert approach as the official way to test on vscode.dev.

**VSIX Extraction:** A VSIX is a ZIP archive. VS Code for Web needs direct HTTP access to paths like `/package.json` and `/dist/extension.js`—it cannot read inside ZIP files. Desktop VS Code handles VSIX directly, but web requires extraction.

## Why vscode.dev Testing is Critical

**`npm run test:web` does NOT catch all issues.** The test runner creates a simulated environment with `node_modules` available, but **real vscode.dev loads from the packaged VSIX** which may be missing dependencies.

**Critical issues only caught by vscode.dev testing:**

- **Missing runtime dependencies** - If packaging excludes `node_modules` (via `--no-dependencies` flag), extensions will fail with "Cannot find module" errors in vscode.dev but work fine in test runner
- **CSP violations** - Content Security Policy restrictions only apply in real vscode.dev, not test environment  
- **Virtual file system paths** - Real URI handling vs test mocks
- **Extension activation sequence** - How extensions load in production vs test

**Real-world example:** This extension previously used `--no-dependencies` in packaging, which excluded `luxon` and `axios` from VSIX. `npm run test:web` passed (dependencies available in test), but vscode.dev failed with "Cannot find module 'luxon'" when loading the actual VSIX.

**Testing strategy:**

1. **During development:** Use `npm run test:web` for quick feedback
2. **Before committing:** Test with `npm run vsix:serve` + vscode.dev to validate packaging
3. **Before publishing:** Always validate in actual vscode.dev environment

## Difference Between Node and Web VSIX

Both packages contain the same extension code, but:

- **`tikbook-node.vsix`**: Uses `out/extension.js` (Bun bundled for Node.js runtime). Runs only on desktop VS Code.
- **`tikbook-web.vsix`**: Uses `dist/extension.js` (Bun bundled for browser/webworker runtime). Runs on vscode.dev, github.dev, and desktop.

The difference is in `package.json` manifest: node VSIX uses `"main"` entry, web VSIX uses `"browser"` entry.

## Testing Workflow

1. **Desktop testing (preferred):** `npm run vsix:install` - Fastest, full debugging
2. **Web target validation:** `npm run test:web` - Official approach, simulated environment  
3. **Final vscode.dev check:** `npm run vsix:serve` (after mkcert setup) - Real vscode.dev environment

**GUI Test Runner Note:** If tests do not appear in the Testing sidebar, run `npm run compile:test`. `npm run compile` does not build `out/test/**/*.test.js`.

**Recommendation:** Use `npm run test:web` for regular web extension testing. Only use `npm run vsix:serve` + vscode.dev for final validation before publishing or to test specific vscode.dev behavior.

**For CI/CD:** The test suite (`npm test` and `npm run test:web`) covers both desktop and web scenarios automatically.

## Package.json Scripts Reference

| Script | Purpose |
|--------|---------|
| `npm run compile` | Build node target with Bun (out/extension.js) |
| `npm run compile:web` | Build web target with Bun (dist/extension.js) |
| `npm run compile:test` | Build test artifacts for GUI/CLI (out/test/**/*.test.js) |
| `npm run vsix:package` | Create node and web VSIX files (with dependencies) |
| `npm run vsix:package:web` | Create only web VSIX (faster for vscode.dev testing) |
| `npm run vsix:install` | Package and install to desktop VS Code |
| `npm run test:web` | Run tests in local VS Code for Web (browser) |
| `npm run vsix:serve` | Package web VSIX, extract, serve via HTTPS on localhost:5000 |
| `npm run clean:all` | Remove all build artifacts, VSIX files, and .vsix-serve directory |
