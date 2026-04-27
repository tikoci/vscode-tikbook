# Testing layout

This is the canonical map for **where test files live and why**. Add new tests
into the right slot here; if a slot does not exist, propose extending this doc
*before* scattering files.

Companion docs:

- [test-running-policy.md](test-running-policy.md) — when each suite runs and
  the unit-vs-integration rule
- [integration-testing-strategy.md](integration-testing-strategy.md) — phased
  approach (Approach 1: VS Code Test Framework; Approach 5: Docker, future)
- [test-suite-structure.md](test-suite-structure.md) — historical notes from the
  Feb 2026 reorganization

## At a glance

```text
vscode-tikbook/
├── .vscode-test.mjs            # GUI: VS Code Extension Test Runner config (no reporter)
├── .vscode-test-cli.mjs        # CLI: `npm test` config (custom reporter, unit only)
├── .vscode-test/               # generated test runtime artifacts (git-ignored)
├── .sarbsettings               # local-only RouterOS test creds (git-ignored)
├── .sarbsettings.example       # template, committed
├── test-corpus/                # sample notebooks; doubles as launch.json workspace
│   └── discourse-bookmarks/
└── src/test/
    ├── unit/                   # pure logic + VS Code API only; runs by default
    │   └── *.test.ts
    ├── integration/            # touches external systems; suite.skip by default
    │   └── *.test.ts
    ├── helpers/                # shared test utilities (NOT auto-discovered as tests)
    │   ├── integration-test-config.ts   # loads .sarbsettings
    │   └── rest-mock.ts                 # axios-mock-adapter wrapper
    └── fixtures/               # data files consumed by tests
        └── rest/               # recorded RouterOS REST responses (JSON)
```

## Slot rules

### `src/test/unit/`

- **Runs by default** — `npm test`, CI, GUI Test Explorer.
- May call **VS Code APIs** (`vscode.workspace.openNotebookDocument`, etc.) — the
  test host is a real Code instance.
- **No** AppleScript, UTM, QEMU, CHR, shell, or live RouterOS.
- REST traffic must be stubbed via `helpers/rest-mock.ts`.
- File name: `*.test.ts`.

### `src/test/integration/`

- **Opt-in** — every file uses a top-level `suite.skip` so they do not run by default.
- May talk to live RouterOS (via `.sarbsettings`), shell out, run AppleScript,
  start QEMU, etc.
- Treat as a parking lot for tests that *will* run when the matching backend is
  available (CHR via quickchr, real router for record-replay verification).
- File name: `*.test.ts`.

### `src/test/helpers/`

- **Not test files.** No `.test.ts` suffix, so `vscode-test-cli` will not pick
  them up as tests. They get bundled into whatever test imports them (via
  `bun build`).
- Cross-suite utilities live here: REST mocking, settings loaders, wait-for
  helpers.
- File name: descriptive, no `.test.` infix.

### `src/test/fixtures/`

- Static data, not code: recorded REST responses (JSON), schema snapshots,
  serialized notebooks for round-trip checks.
- Loaded relative to compiled location — see existing patterns in
  `notebook-corpus.test.ts` for `repoRoot` resolution.

### `test-corpus/` (repo root)

- Lives at the **root**, not under `src/test/`, on purpose: it is also a
  workspace folder in `.vscode/launch.json` for the dev extension session, so
  manual testing and automated testing share the same data.
- Subdirectory per source: `discourse-bookmarks/`, etc.
- If a corpus is purely test-internal (no manual-test value), put it in
  `src/test/fixtures/` instead.

## Why `.vscode-test*` files live at repo root

`@vscode/test-cli` and `@vscode/test-electron` both look for their config in the
**workspace root** by default, and the GUI Extension Test Runner extension reads
`.vscode-test.mjs` from the same place. Moving them under `src/test/` would
require passing explicit `--config` paths to every invocation and would break
the GUI runner. So:

| File | Owner | Used by | Note |
|---|---|---|---|
| `.vscode-test.mjs` | required at root | GUI Extension Test Runner | No reporter (GUI parses raw mocha events) |
| `.vscode-test-cli.mjs` | required at root | `npm test`, `npm run test:web`, CI | Custom AI/human reporter, unit-only glob |
| `.vscode-test/` | generated | both runners | git-ignored runtime artifacts |

## Two layers of test confidence

The bar for "build green ⇒ user can use the extension" cannot be cleared with
mocks alone. Both sides of the integration are moving targets:

- **VS Code** ships every few weeks and occasionally breaks extension API
  contracts.
- **RouterOS** ships on multiple channels (stable / testing / development), and
  the REST surface (response shapes, error strings, `/console/inspect`
  behaviour) shifts between minor versions.

A large corpus of static recorded responses cannot catch either. So the
strategy is split:

### Layer 1 — Unit tests with mocks (`axios-mock-adapter`)

Scope: catch regressions in **our** code — request shape, response parsing,
error-string matchers, serializer round-trips. Runs by default in `npm test`,
fast and hermetic.

`helpers/rest-mock.ts` is the seam. Tests live in `src/test/unit/` and exercise
the test bundle's own copy of `RouterRestClient` (see scope note in
`notebook-kernel.test.ts` — bundle isolation means this is not the live
extension instance).

This layer **does not** prove cross-version compatibility. It proves we did
not break our own parsing.

### Layer 2 — Integration tests against real RouterOS (`quickchr`)

Scope: catch RouterOS-side and VS-Code-side drift — the hard, high-value
question. The plan is to use [`@tikoci/quickchr`](https://github.com/tikoci/quickchr)
to spin up a CHR (Cloud Hosted Router) VM in QEMU per CI run, target it from
the extension, and assert real behaviour against real responses.

Why quickchr specifically:

- Aligns with the rest of the tikoci ecosystem (designated QEMU/CHR expert).
- Cross-platform (where tested), deterministic environment, fresh state per
  run.
- Supports targeting specific RouterOS versions/channels — the right shape for
  a future "matrix" run across stable / testing / development.
- Works with the same VS Code extension test harness used today; the host just
  points at the QEMU-hosted CHR instead of `localhost`.

Status today: not wired up. The opt-in integration tests under
`src/test/integration/` are placeholders pending the quickchr swap (Theme 1 in
`ROADMAP.md`). When that lands, those tests stop using `suite.skip` and run
against a freshly-booted CHR.

`src/test/fixtures/` exists for whatever genuinely-static reference data
proves useful (canonical schemas, expected error codes), but **is not the
strategy for cross-version coverage**. Live RouterOS via quickchr is.

## Known misalignment: mocha vs. bun test

The rest of the project prefers `bun test`. This repo uses **mocha** because
`@vscode/test-cli` requires it — the VS Code Extension Test Runner protocol is
mocha-based. Switching is not a small lift and is not currently planned;
treat the mocha tests here as the local exception, not a model to copy
elsewhere in tikoci.

## Adding a new test

1. Decide the slot: `unit/` if it can run without external systems,
   `integration/` if it cannot.
2. If you need shared setup, put helpers in `helpers/`, not next to the test.
3. If you need data files, put them in `fixtures/` (or `test-corpus/` if the
   data is also useful for manual testing).
4. If none of these fit, update this doc *first*.

## Why this structure exists

Earlier rounds put helpers next to tests in `integration/`. That worked only
because the helpers happened not to end in `.test.ts`. The split here makes the
intent visible: helpers and fixtures are supporting code, tests are the
declared unit of work, and the test runner glob (`**/*.test.js`) safely picks
up only the latter.
