# TikBook Development Guide

Welcome to TikBook development! This guide helps contributors and AI assistants navigate the codebase, understand conventions, and implement features effectively.

## Quick Start for Contributors

### Prerequisites

- Node.js 18+
- VS Code 1.78.2+
- Basic understanding of TypeScript and VS Code extension APIs

### Setup

```bash
# Clone and install dependencies
git clone https://github.com/tikoci/vscode-tikbook.git
cd vscode-tikbook
npm install

# Compile and watch for changes
npm run compile

# Run tests
npm test
npm run test:web
```

### Development Workflow

1. Read relevant [conventions](docs/conventions.md) and [architecture](docs/architecture.md)
2. Check [feature specs](docs/specs/README.md) if working on new features
3. Make changes, ensuring lint passes: `npm run lint`
4. Test your changes (see [Testing](#testing))
5. Follow [code review checklist](docs/sarb/code-review-checklist.md)

---

## Build System

### TypeScript Build (Current)

- The extension builds with `tsc` to `out/extension.js`.
- A post-build step copies the output to `out/extension-web.js` for VS Code web targets.
- This tsc-based build has not shipped in a public release yet; validate by building VSIX packages locally.
- **Source maps included**: The VSIX includes `.map` files for better error reporting.

### Build Output Size

- Compiled JavaScript: ~225 KB
- With source maps: ~340 KB total
- **No bundling needed**: The size is negligible; bundling adds unnecessary complexity.

### Why `npm clean` is Required

- **tsc does not clean the output directory** - it only overwrites files it actively compiles.
- **Risk**: If you rename/delete a TypeScript file, the old JavaScript file remains in `out/`.
- **Solution**: `npm run compile` includes `npm run clean` to ensure a fresh build.
- This is a standard safety practice for TypeScript projects.

### Bun History (Fallback Only)

- Earlier releases used `bun build` for bundling and dual targets.
- We moved away from bun to keep the build simpler and more agent-friendly.
- If bundling becomes necessary again, bun is the preferred fallback, but should write to a separate output folder (e.g., `dist/`).

### Package File Control (.vscodeignore)

**IMPORTANT: Review `.vscodeignore` when adding new directories or before releases.**

The `.vscodeignore` file controls what goes into the VSIX package:

- **Included**: `out/**/*.js` (all modules), `out/**/*.map` (source maps), runtime assets
- **Excluded**: Source code (`src/`), tests, docs, build configs, development tools

**Before releasing:**

1. Review `.vscodeignore` for any new directories added since last release
2. Verify no sensitive files (credentials, scratch work) are included
3. Test the packaged VSIX locally with `npm run vsix:install`

**When adding new runtime dependencies:**

- Media files: Ensure they're not excluded (check `media/` patterns)
- Web assets: Verify they're accessible via `extensionUri`
- Schema files: Ensure they're in `out/` after compilation

### Markdown Linting

- **Public docs (strict)**: `npm run markdown:lint:public` (README.md, CHANGELOG.md)
- **Internal docs (relaxed)**: `npm run markdown:lint:agentic` (docs/ and Copilot instructions)
  - Internal rules disable MD036 (emphasis vs heading) and MD040 (language tags) to avoid false positives
  - No manual cleanup needed for internal docs in normal workflow
- **Auto-fix**: `npm run markdown:fix:all` applies fixes to both public and internal files (run at session end if needed)

## Documentation Structure

### Core Development Docs

- **[Architecture Overview](docs/architecture.md)** - Component structure, design decisions, data flow
- **[Code Conventions](docs/conventions.md)** - TypeScript patterns, naming, style guide
- **[Testing Strategy](docs/integration-testing-strategy.md)** - Test structure, approaches, coverage

### Pattern Guides

- **[TypeScript Patterns](docs/typescript-patterns.md)** - Generics, type narrowing, extensible records
- **[RouterOS Patterns](docs/routeros-patterns.md)** - REST API usage, version compatibility, error handling
- **[Versioning Patterns](docs/versioning-patterns.md)** - VS Code API gates, runtime fallbacks

### AI Assistant Instructions

Located in `.github/instructions/`:

- **[ai-editing-best-practices.md](.github/instructions/ai-editing-best-practices.md)** - ⚠️ **READ FIRST** before editing code
- **[vscode-extension.instructions.md](.github/instructions/vscode-extension.instructions.md)** - Extension code standards
- **[testing.instructions.md](.github/instructions/testing.instructions.md)** - Test and experimental code guidelines
- **[documentation.instructions.md](.github/instructions/documentation.instructions.md)** - Docs organization
- **[eslint-rules.instructions.md](.github/instructions/eslint-rules.instructions.md)** - Linting expectations
- **[routeros-integration.instructions.md](.github/instructions/routeros-integration.instructions.md)** - RouterOS REST API patterns

### Planning & Roadmap

- **[Feature Specs](docs/specs/README.md)** - Detailed designs for upcoming features (incremental, user-editable)
- **[Research & Findings](docs/research/README.md)** - Investigations and decision context
- **[LLM TODOs](docs/llm-todos.md)** - Quick action items from LLM sessions
- **[Future Features](docs/future-features.md)** - Long-term feature ideas and dependencies
- **[SARB Decision Log](docs/sarb/decision-log.md)** - Architectural decisions and rationale

---

## Feature Development Workflow

### For New Features

1. **Check if spec exists:** Look in [docs/specs/](docs/specs/README.md)
   - If exists and status is `ready-for-implementation` → proceed
   - If exists but status is `draft` or `under-review` → wait for completion
   - If doesn't exist → create one using [template](docs/specs/_TEMPLATE.md)

2. **Research required?** Check spec's "Related" section
   - If linked research exists, read it for context
   - If research is in-progress, wait for completion before starting
   - If no research but decisions unclear, request research first

3. **Implement incrementally:**
   - Start with unit tests (if applicable)
   - Implement core functionality
   - Add integration tests
   - Update documentation

4. **Follow conventions:**
   - No `console.log` - use output channels
   - Desktop-only features: gate with `vscode.env.uiKind`
   - Secrets: use SecretStorage, never settings
   - Prefer `vscode.workspace.fs` over Node `fs`

5. **Before PR:**
   - Run `npm run lint`
   - Run `npm test` and `npm run test:web`
   - Update CHANGELOG.md
   - Check [code review checklist](docs/sarb/code-review-checklist.md)
   - **Update spec status** to `implemented` and move to specs/implemented/

### For Bug Fixes

1. **Reproduce the issue** in development
2. **Add test** that fails (if possible)
3. **Fix the issue**
4. **Verify test passes**
5. **Check for regressions** with full test suite

---

## Testing

### Unit Tests

Fast tests that don't require VS Code:

```bash
npm test
```

Located in `src/test/**/*.test.ts`

### Integration Tests  

Tests requiring VS Code Extension Host:

```bash
npm test                    # Desktop tests
npm run test:web            # Web extension tests
```

Located in `src/test/suite/integration/*.test.ts`

### Manual Testing

Some features require manual testing with real RouterOS:

- Virtual filesystem mounting
- REST API operations
- Certificate management
- Remote scenarios (SSH, containers, WSL)

See [integration-testing-strategy.md](docs/integration-testing-strategy.md) for detailed testing approach.

### Testing with VS Code for Web

For testing the web target with github.dev or vscode.dev locally, see [testing-vscode-web-local.md](docs/testing-vscode-web-local.md).

**Quick reference:**

- Local web testing: `npm run test:web` (recommended - avoids CORS/HTTPS issues)
- Desktop VSIX install: `npm run vsix:install`
- vscode.dev testing: `npm run vsix:serve` (requires mkcert setup)

---

## Security

### Dependency Auditing

**Development:** `npm audit` reports are informational during development. Focus on fixing critical issues when convenient.

**CI/CD:** GitHub Actions runs `npm audit --audit-level=low` with zero tolerance. Any vulnerability (low, moderate, high, or critical) will fail the build. This ensures published extensions have no known vulnerabilities.

**Pre-publish:** `vscode:prepublish` script runs `npm audit --audit-level=critical` before packaging. This catches critical issues before creating VSIX files.

**Rationale:** Running strict audit checks during active development can be distracting when working on unrelated problems. CI/CD enforcement ensures security without disrupting development flow.

---

## Working with RouterOS

### Connection Setup

TikBook requires RouterOS 7.10+ (recommended 7.20.2+):

1. Configure RouterOS REST API (enabled by default on 7.10+)
2. Set VS Code settings:
   - `routeros.baseUrl` - Router URL (e.g., `http://192.168.88.1`)
   - `routeros.username` - Router username
   - `routeros.password` - Stored in SecretStorage (use command palette)

### REST API Conventions

- All REST calls via `RouterRestClient` (shared.ts)
- Target v7.20.2+ but maintain compatibility to v7.10
- Document version-specific features in code comments
- Keep types open for new RouterOS attributes (extensible records)

See [routeros-patterns.md](docs/routeros-patterns.md) for detailed API usage patterns.

---

## Code Organization

### Source Structure

```
src/
├── extension.ts           # Main extension entry point
├── notebook.ts            # Notebook kernel, serializers
├── commands.ts            # Command implementations
├── menus.ts              # Menu contributions
├── config.ts             # Settings and configuration
├── routeros.ts           # RouterOS REST client
├── scriptfs.ts           # Virtual filesystem (/system/script)
├── virtualdocs.ts        # Virtual read-only documents (rscena:)
├── watchdog.ts           # Connection status monitoring
├── converters.ts         # Data format converters (CSV, JSON, etc.)
├── codelens.ts           # CodeLens providers
├── shared.ts             # Shared utilities, REST client
├── vscode-compat.ts      # VS Code version compatibility
└── test/
    ├── suite/
    │   └── integration/  # Integration tests
    └── *.test.ts         # Unit tests
```

### Key Components

**Notebook Kernel** (`notebook.ts`)

- Handles .tikbook and .rscmd formats
- Cell execution via RouterOS REST API
- Serialization/deserialization

**Virtual Filesystems**

- `scriptfs.ts` - Read-write FS for `/system/script` (experimental)
- `virtualdocs.ts` - Read-only virtual docs (rscena: protocol)

**RouterOS Integration**

- `routeros.ts` / `shared.ts` - REST client
- `watchdog.ts` - Connection monitoring
- `converters.ts` - Data format conversion

---

## Common Tasks

### Adding a New Command

1. Add to `package.json` contributions.commands
2. Implement in `commands.ts`
3. Register in `extension.ts` activate()
4. Add integration test in `src/test/suite/integration/contributions.test.ts`
5. Add to `menus.ts` if UI integration needed

### Adding a New Setting

1. Add to `package.json` contributions.configuration
2. Access via `vscode.workspace.getConfiguration('routeros')`
3. Add to `config.ts` if helper needed
4. Add test in `src/test/suite/integration/config.test.ts`

### Adding Experimental Feature

See [docs/specs/experimental-features.md](docs/specs/experimental-features.md) for the feature gating system.

### Updating Documentation

- Markdown linting (public): `npm run markdown:lint:public`
- Markdown linting (internal): `npm run markdown:lint:agentic`
- Manual fixes: `npm run markdown:fix:all` (run separately, not during compile)
- Follow [documentation guidelines](.github/instructions/documentation.instructions.md)

---

## Publishing

Publishing is automated via GitHub Actions:

- **Never run `vsce publish` manually**
- Workflow: `.github/workflows/build.yaml`
- Version bumps: Update `package.json` version in PR

---

## Troubleshooting

### Tests Not Running

See [docs/unit-test-fix.md](docs/unit-test-fix.md) - DO NOT downgrade `@vscode/test-cli` below v0.0.12

### Compilation Errors

```bash
npm run compile   # Check for TypeScript errors
npm run lint      # Check for linting issues
```

### Extension Not Loading

Check VS Code's Output panel:

- "Extension Host" - Extension activation logs
- "TikBook" - Extension runtime logs

### RouterOS Connection Issues

- Verify REST API enabled: `/ip/service/print`
- Check RouterOS version: 7.10 minimum
- Test connection: Use "Test Connection" command in VS Code

---

## Getting Help

- **Issues:** [GitHub Issues](https://github.com/tikoci/vscode-tikbook/issues)
- **Forum:** [MikroTik Forum Thread](https://forum.mikrotik.com/t/tikbook-notebook-and-tools-for-visual-studio-code-including-routeros-lsp/263305/3)
- **Discussions:** GitHub Discussions (for questions)

---

## For AI Assistants

### Before Making Changes

1. **ALWAYS read** [ai-editing-best-practices.md](.github/instructions/ai-editing-best-practices.md) first
2. Check relevant context-specific instructions in `.github/instructions/`
3. Review [architecture.md](docs/architecture.md) and [conventions.md](docs/conventions.md)
4. Check [llm-todos.md](docs/llm-todos.md) for active constraints

### Working with Feature Specs

- Check [docs/specs/README.md](docs/specs/README.md) for spec index
- Only implement specs marked `ready-for-implementation`
- Draft specs need user input before implementation
- Update spec status when implementation complete
- See [system-design.md](docs/specs/system-design.md) for system details

### Research & Investigation Workflow

When you need to investigate a topic:

1. **User requests research:**

   ```
   Create research/findings-on-[topic].md investigating:
   - [Question 1]
   - [Question 2]
   For use in [spec-name].md
   ```

2. **You create:** `docs/research/findings-on-[topic].md`
   - Structured findings with sources
   - Clear answers to questions
   - Implications for design
   - Flagged uncertainties

3. **User reads findings** and updates spec with decisions
4. **Research doc kept** for future reference

See [docs/research/README.md](docs/research/README.md) for structure and examples.

### Key Constraints

- This is a VS Code extension - avoid Node-only APIs for web compatibility
- No `console.log` - use output logging helpers
- RouterOS support: 7.20.2+ target (min 7.10)
- Gate desktop-only features with `vscode.env.uiKind`
- Use SecretStorage for credentials, never settings

See [.github/copilot-instructions.md](.github/copilot-instructions.md) for complete guidance.
