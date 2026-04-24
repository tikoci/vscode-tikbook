# System Architecture Review Board (SARB)

This document captures the expectations SARB uses when reviewing agentic work for this VS Code extension. Treat these as must-follow unless they conflict with user intent.

When the owner says "SARB," it refers to the agentic AI instructions and LLM toolchain guidance documented in this file and related docs.

## Context and scope

- This is a VS Code extension. The runtime is the VS Code extension host, not Node.js. Some Node APIs are unavailable, especially in web.
- The extension integrates with MikroTik RouterOS and adds tools for RouterOS admins, including notebooks and virtual files.
- The RouterOS LSP extension is a separate project. TikBook fills in VS Code-specific features. If a task belongs in the LSP instead, suggest it.
- SARB reviews work using guidance in this file and files under docs.
- Minimum supported RouterOS is 7.10 (REST API). Target is 7.20.2+ (v7 LTS).
- If unsure about a VS Code API, check for proposed vs stable APIs: <https://code.visualstudio.com/api/advanced-topics/using-proposed-api>

## Reference sources

- VS Code docs: <https://code.visualstudio.com/api>
  - Extension API: <https://code.visualstudio.com/api/references/vscode-api>
  - Contribution points: <https://code.visualstudio.com/api/references/contribution-points>
  - Commands: <https://code.visualstudio.com/api/references/commands>
  - Activation events: <https://code.visualstudio.com/api/references/activation-events>
  - Manifest: <https://code.visualstudio.com/api/references/extension-manifest>
- Extension samples: <https://github.com/microsoft/vscode-extension-samples>
  - Test example: <https://github.com/microsoft/vscode-extension-samples/tree/main/helloworld-test-cli-sample>
- VS Code source: <https://github.com/microsoft/vscode>
- MikroTik docs: <https://help.mikrotik.com>
- MikroTik forum: <https://forum.mikrotik.com>
  - Pay attention to posts by user "Amm0" and release threads.

## Before starting a task

- Review existing todos, README, and CHANGELOG to align with current direction.
- Always scan docs/llm-todos.md and docs/future-features.md for decision points and active constraints.
- Follow SARB guidance and validate that the plan meets project goals.
- Confirm RouterOS behavior with official docs or forum release threads.
- Ensure local package.json version is newer than any published version.
- Repository instructions in `.github/copilot-instructions.md` are automatically applied in Copilot Chat; no setup required.

## While writing or editing code

- Do not use console.log. Use the existing output logging pattern (e.g., log.info()).
- Run Biome (`npm run lint`) and pay attention to warnings.
- Add tests when behavior is uncertain. Use llm-experiments.test.js for one-off checks.
- Validate RouterOS commands against current v7 schema. Use RouterOS LSP to verify syntax where possible.
- Avoid Node-specific APIs in extension code. Tools scripts may use Node, but prefer portable options.
- Keep types open to new attributes; RouterOS adds fields over time.
- Treat features marked experimental in docs/llm-todos.md or docs/future-features.md as gated by settings.
- Check for any relevent `docs/*-patterns.md` when implementing code.

## While writing or editing markdown (Copilot/LLM)

**Public docs (README.md, CHANGELOG.md):**

- Keep docs GitHub-friendly; `npm run markdown:lint:public` must pass
- Use fenced code blocks with language tags
- Add blank lines around blocks you add or edit
- Before finalizing, fix all violations reported by `npm run markdown:lint:public`

**Human/internal docs (`ROADMAP.md`, `DEVELOPMENT.md`, `docs/**/*.md`):**

- Keep docs readable and GitHub-friendly, but don't chase cosmetic lint noise
- `npm run markdown:lint:agentic` should pass for those docs
- Only fix issues that affect structure, links, fragments, tables, or other real readability/rendering problems

**LLM instruction files (`CLAUDE.md`, `AGENTS.md`, `.github/instructions/**`, `.github/copilot-instructions.md`):**

- These are intentionally excluded from CLI markdown linting via `.markdownlint-cli2.yaml`
- Do not reshape prompt/instruction content around generic markdownlint preferences

### Codify patterns as lint rules

- **If you catch yourself making a mistake:** Check `biome.json` to see if Biome can enforce it. If not, consider a small `scripts/lint-sanity.ts` audit and use `tools/eslint/vscode-sanity.mjs` as archived prior art.
- **If you discover a useful pattern:** Document it in `docs/conventions.md` and consider if a lint rule would prevent the anti-pattern.
- **When adding a lint rule:** Prefer Biome rules first. If Biome cannot express the check, document the gap and consider a dedicated audit script; add an entry to `./sarb/decision-log.md` explaining why the check catches a common mistake.
- **Link new rules to patterns:** Reference the specific pattern in `docs/conventions.md` that the rule enforces.

## After finishing a solution

- Optimize for readability for both humans and future LLMs.
- Consider adding Biome rules or a focused lint-sanity audit to codify lessons.
- Re-check changes in context: TikBook is a VS Code extension using REST via axios for RouterOS management.
- Capture new learnings in docs/tools so future agents do not repeat mistakes.
- Look for test coverage gaps and add tests when feasible.
- Provide a summary for the Kilo extension using a free LLM. If its review conflicts, ask the user.
- Verify package.json version and review CHANGELOG.md for current version context.
- If work touches decision points from docs/future-features.md (REPL, video player, output persistence, transports), document the choice and reasoning in ./sarb/decision-log.md.

### Run validation checks

**Required before completing work:**

- `npm run compile` - TypeScript compilation must succeed
- `npm run lint` - Biome passes with no errors (warnings acceptable if documented)
- `npm test` - Unit tests pass (if tests exist for changed code)
- `npm audit` - No high/critical security vulnerabilities

**When changes affect web compatibility:**

- `npm test:web` - Browser mode tests pass
- Verify no Node-only APIs used without gates

**Additional checks:**

- **Package.json sync**: If adding commands/menus/settings, verify package.json contributions match code
- **Markdown links**: If moving/renaming files, check internal links aren't broken
- **Public markdown**: If touching README.md or CHANGELOG.md, run `npm run markdown:lint:public`
- **Pre-publish validation**: `npm run vscode:prepublish` runs audit → lint → compile (final check before release)

**Note on tooling**: Pylance MCP tools are available in this workspace but are Python-specific. This is a TypeScript project; use standard TypeScript/Biome validation instead.

## Release and publishing

- Verify package.json version follows the versioning scheme.
- Publishing is via GitHub Actions in .github/workflows/build.yaml only. Do not publish directly.
- There should always be a CHANGELOG.md entry for each published build, or whenever the package version changes.
- **Review .vscodeignore before release** - ensure new directories are appropriately included/excluded.
  - Check that runtime assets (media/, out/) are included
  - Verify dev-only files (docs/, tools/, .vscode-test/) are excluded
  - Test locally with `npm run vsix:install` before triggering CI  

## Versioning scheme

- Version should be newer than any published release or pre-release unless it is a patch.
- Major version stays at 0 for now.
- Minor version use a scheme where even number build are "release"/stable builds.  Test builds use an odd number version to indicate the `--pre-release` flag is used.  This allow end-users of TikBook to "try" a new version, but downgrade.  
- If you find a security issue, please suggest creating a patch for the previous stable version (e.g. an even number build).  
- Never change package.json version without asking the user.

## Unit testing strategy

**CRITICAL: Do NOT mock vscode.* APIs**

- **Anti-pattern:** Using mocking libraries (sinon, jest mocks) for vscode.* objects
- **Why it's bad:** Maintenance burden, doesn't catch real API changes, false confidence
- **Preferred approach:** Tests run in VS Code extension host via @vscode/test-cli → use real APIs
- **Only mock:** External services (RouterOS REST, file systems outside workspace, network calls)

**Test as you develop:**

- Tests run in VS Code extension host → provides real vscode.* API context (no mocks needed)
- Use tests to explore uncertain API behavior (real APIs reveal actual constraints)
- Write failing test first, implement until green (TDD)

**When tests are required:**

- **New features:** Test happy path + edge cases before considering work complete
- **Bug fixes:** Add regression test that would have caught the bug (test should fail on old code, pass on fix)
- **API integrations:** Use real VS Code APIs; mock only external dependencies (REST, network)
- **Refactoring:** Ensure existing tests still pass; add tests for newly exposed behavior

**Web + Desktop compatibility testing:**

- **Test both modes:** Run `npm test` (desktop) AND `npm run test:web` (browser) before completing work
- **Platform detection:** Use `vscode.env.uiKind === vscode.UIKind.Desktop` to check mode in runtime code
- **Avoid Node APIs:** Don't use `fs`, `path`, `os` directly; use vscode.workspace.fs + vscode.Uri instead
- **Gate desktop-only features:** If feature requires desktop (e.g., terminal commands), skip test in web mode
- **Test platform-specific behavior:** If code has conditional logic for web vs desktop, verify both paths

**Test types:**

- **Feature tests:** `src/test/unit/*.test.ts` and `src/test/integration/*.test.ts` → compile to `out/test/**/*.test.js`
- **Experiments:** `src/test/llm-experiments.test.ts` for one-off validation during development
- **Integration tests:** Test with real VS Code APIs when mocking is too complex (preferred over mocks)

**VS Code test context benefits:**

- Access to vscode.workspace, vscode.window, vscode.commands during test execution (NO MOCKING)
- Validate extension activation and deactivation behavior
- Test notebook providers, virtual documents, language clients in realistic environment
- Catch web vs desktop incompatibilities early (run `npm run test:web`)
- Real API usage reveals version incompatibilities and missing features

**Example: Testing without mocks (PREFERRED)**

```typescript
import * as vscode from 'vscode';
import * as assert from 'assert';

suite('Virtual Document Provider', () => {
    test('should register rtsc scheme', async () => {
        // Real vscode.workspace API - no mocking
        const doc = await vscode.workspace.openTextDocument(
            vscode.Uri.parse('rtsc://device/config')
        );
        assert.ok(doc);
        assert.strictEqual(doc.uri.scheme, 'rtsc');
    });

    test('should work in web mode', async function() {
        if (vscode.env.uiKind !== vscode.UIKind.Web) {
            this.skip(); // Skip in desktop mode
        }
        // Test web-specific behavior
        const uri = vscode.Uri.parse('vscode-vfs://router/config.rtsc');
        const result = await someWebCompatibleFunction(uri);
        assert.ok(result);
    });
});
```

**Example: When to mock (external services ONLY)**

```typescript
import * as sinon from 'sinon';
import axios from 'axios';

suite('RouterOS REST Client', () => {
    let axiosStub: sinon.SinonStub;

    setup(() => {
        // Mock external REST API, NOT vscode
        axiosStub = sinon.stub(axios, 'get');
    });

    teardown(() => {
        axiosStub.restore();
    });

    test('should handle network errors', async () => {
        axiosStub.rejects(new Error('Connection refused'));
        
        // vscode.window.showErrorMessage is real API - no mock needed
        const client = new RouterOSClient();
        await assert.rejects(client.fetchData());
        
        // Verify error was shown to user (real VS Code API)
        // Note: In real tests, you might check error handler was called
    });
});
```

**When NOT to test:**

- Pure UI interactions that require manual verification (consider integration test instead)
- Code that directly wraps VS Code APIs without logic (test the caller instead)
- One-time migration scripts (though llm-experiments.test.js can validate logic)

**Web compatibility checklist:**

- [ ] Test passes in both `npm test` and `npm run test:web`
- [ ] No Node API usage (fs, path, os, child_process) without vscode.env.uiKind gates
- [ ] URI handling uses vscode.Uri.parse/file, not string concatenation
- [ ] File I/O uses vscode.workspace.fs, not Node fs module
- [ ] Desktop-only features are gated and tests skip appropriately
