# Linting Migration Audit (ESLint → Biome)

**Context:** Commit `4a141ec` (chore: migrate linter from eslint to biome)
migrated the repo from `eslint` + `typescript-eslint` + `@stylistic` + a local
`vscode-sanity` plugin to Biome 2.x. `bun test` and `npm run lint` both pass,
but the migration disabled or softened several rules and dropped the custom
plugin. This doc tracks what was lost and what to reconsider, so disabled
rules are a conscious choice and not silent coverage loss.

> **Goal here is tracking, not fixing.** Each section ends with concrete
> action items. None of them are urgent; this is radar material.

## Summary

- Biome recommended is **on**, plus a short list of extras explicitly enabled
  (`noExplicitAny`, `noDoubleEquals`, `useConst`, `useImportType`, etc.).
- Two recommended rules are globally **off**:
  `complexity.noForEach` and `suspicious.useIterableCallbackReturn`.
- Test-file overrides soften `noConsole`, `noExplicitAny`, and
  `noNonNullAssertion` (fine; tests aren't shipped).
- The custom `tools/eslint/vscode-sanity.mjs` plugin is archived only — no
  current equivalent runs.
- Biome has **no type-aware lint rules**. All of typescript-eslint's
  type-aware checks (no-floating-promises, no-misused-promises, etc.) are
  simply gone; nothing in Biome replaces them.
- `npm run lint` currently reports ~20 warnings that never surfaced under
  ESLint. Most are low-signal but two clusters are worth scanning.

## Biome rules disabled in `biome.json` — assessment

### Keep off

| Rule | Reason to keep off |
|---|---|
| `complexity.noForEach` | Project-wide style choice. Converting all `.forEach` to `for…of` would churn a lot of code with no correctness gain. |
| `suspicious.useIterableCallbackReturn` | Pairs with `noForEach`; mostly complains about intentionally-void forEach bodies. |
| `suspicious.noConsole` (scripts/tests) | Scripts and tests don't run in the extension host — `console.*` is the right output there. |
| `style.noNonNullAssertion` (tests) | Test fixtures frequently assert on known-present data. |
| `suspicious.noExplicitAny` (tests → warn) | Test mocks and VS Code compat shims occasionally need `any`. Warn keeps visibility. |

### Reconsider

None of these are currently disabled, but it's worth noting they're
demoted to `warn` only and firing warnings today (see next section).

## Current lint warnings — are they noise or signal?

`npm run lint` exits 0 but reports ~20 warnings. Breakdown:

### `suspicious.noTemplateCurlyInString` — 17 hits

- `src/scriptfs-schema.ts` (15): intentional — schema strings document
  RouterOS `${name}`-style placeholders inside single-quoted strings. These
  are documentation strings consumed by the schema, **not** accidentally-dead
  template literals.
- `src/scriptfs.ts:102` and two `src/test/integration/*.experiment.test.ts`
  files: same pattern — example strings or RouterOS snippets.

**Verdict:** Low signal here. Two reasonable options:

1. Add narrow `biome-ignore` comments on the schema entries (clearest).
2. Override the rule off for `src/scriptfs-schema.ts` specifically (less
   fine-grained but one change).

**Action item: [LMA-1]** add per-entry `biome-ignore` comments in
`scriptfs-schema.ts` and the two experiment tests, or scope the rule off for
those files. Don't globally disable — the rule does catch real bugs in
template-literal-heavy code.

### `style.noNonNullAssertion` — 2 hits

- `src/virtualdocs.ts:330`, `:333`: `this.keyToValue.get(key)!` after a
  `has(key)` check.

**Verdict:** Real, minor. The `has/get` pattern is a known TypeScript
narrowing gap. Could be rewritten as a single `get` + truthy check. Low
priority.

**Action item: [LMA-2]** clean up the two non-null assertions in
`virtualdocs.ts` next time that file is touched. Not worth a dedicated PR.

### `complexity.noUselessConstructor` — 1 hit

- `src/vm-explorer.ts:131` — introduced by the migration itself. The old
  code was `constructor(private context: ExtensionContext) {}` (TS
  parameter property). Biome flagged `context` as unused (correct — it
  isn't used) and the migration renamed it to `_context`, leaving an empty
  constructor.

**Verdict:** Cosmetic artifact of the migration. Either drop the
constructor entirely (the class has no other constructor logic) or restore
the parameter property if the intent was to hang onto the context.

**Action item: [LMA-3]** delete the empty constructor in
`CHRVMExplorerProvider` (vm-explorer.ts:131) — it's pure noise now.

## Lost: custom `vscode-sanity` ESLint plugin

`tools/eslint/vscode-sanity.mjs` implemented four rules specifically for
VS Code extension correctness. Biome does not support plugins, so none of
them run today. The file is kept as archived reference.

### `no-node-builtins-web` — **replaceable in Biome**

Forbade `import * as fs from 'fs'` etc. in web-extension-safe code, with
per-file allowlists for `src/routeros.ts` (https), `src/virtualdocs.ts`
(path), and `src/scriptfs.ts` (util).

**Biome has `style.noRestrictedImports` (stable).** The old ESLint
`no-restricted-imports` block is almost a 1:1 port; add per-file overrides
for the three allowlisted modules. This is the single highest-value
replacement in this audit.

**Action item: [LMA-4]** port the old `no-restricted-imports` block from
`eslint.config.mjs` (git log `4a141ec^:eslint.config.mjs` lines ~155-180)
into `biome.json` as `style.noRestrictedImports` + per-file overrides. Also
port the `no-restricted-globals: process` check if Biome has an equivalent
(`noGlobalIsNan`/similar — needs a look).

### `require-eventemitter-dispose` — **not directly replaceable**

Scanned for `new EventEmitter()` that's never added to a disposables array
or returned from a `dispose()` method. This is a lifecycle check — Biome's
static analysis can't do it and it's not type-aware-dependent either, it's
AST-pattern-based.

**Replacement options:**

1. A tiny audit script (`scripts/lint-disposables.ts`) using the TS
   compiler API or `ts-morph` to walk `src/**/*.ts` and report
   `new EventEmitter()` sites that aren't handed to a `Disposable[]` or
   returned. Runs in CI alongside `bun test`.
2. A unit test that parses the source and reports. Less ideal — testing
   source layout from tests is awkward.
3. Leave as-is. Known risk: undisposed emitters leak across extension
   deactivate/reactivate cycles, which shows up as memory growth during
   dev reload loops, not as user-visible bugs.

**Action item: [LMA-5]** decide whether to build a `scripts/lint-sanity.ts`
audit (option 1 above) or accept the loss. Recommendation: build it. The
pattern is small (file < 100 lines of AST walking) and the other two lost
rules below can live in the same script.

### `no-floating-disposable` — **not directly replaceable**

Flagged `vscode.commands.registerCommand(...)` and similar `Disposable`-
returning calls whose result wasn't stored or returned. Same shape of
problem and same replacement strategy as above — fold into the single
sanity-audit script.

### `vscode-api-version-compat` — **not directly replaceable**

Data-driven: checked usage of VS Code APIs against `engines.vscode`
minimum version. Needs a version map to be useful, which the archived
plugin hardcoded. This is the lowest-value of the four since
`package.json` engines is rarely bumped and the minimum version is `1.78.2`
(old). Could either live in the sanity-audit script or be dropped.

**Action item: [LMA-5a]** if the sanity-audit script is built, include
the VS Code API version map. If not, drop this rule from the radar — the
value-to-effort ratio is the lowest of the four.

## Lost: typescript-eslint type-aware rules

The old ESLint config was type-aware (`parserOptions.project`). Biome has
no equivalent today (type-aware lint is on their roadmap but not stable).
All of these rules are gone with no direct replacement:

| ESLint rule | What it caught | Relevance here |
|---|---|---|
| `@typescript-eslint/no-floating-promises` | Missing `await` / `void` on promise expressions | **High.** VS Code commands and event handlers are async-heavy; silent unhandled rejections are a known footgun. |
| `@typescript-eslint/no-misused-promises` | Passing `async () => {…}` where a sync callback is expected (e.g. event handlers expecting `void`) | **High.** VS Code API has several `void`-returning handler slots. |
| `@typescript-eslint/await-thenable` | `await` on non-promises | Low. Mostly catches typos. |
| `@typescript-eslint/return-await` | Correct placement of `await` in try/catch | Low–medium. |
| `@typescript-eslint/prefer-nullish-coalescing` | `\|\|` that should be `??` | Medium. Real bugs when left-side is `0`/`""`/`false`. |
| `@typescript-eslint/no-unnecessary-type-assertion` | Redundant `as T` | Low. |
| `@typescript-eslint/switch-exhaustiveness-check` | Missing cases on discriminated unions | **High** if/when we add more union-typed state machines (ScriptFS schema, VM status). |
| `@typescript-eslint/require-await` | `async` functions that never `await` | Low–medium. |

The two high-impact losses are **`no-floating-promises`** and
**`no-misused-promises`**. An untracked rejection from a forgotten
`await` inside a registered command is exactly the class of bug these
rules catch, and TikBook has a lot of command handlers.

**Replacement options:**

1. Wait for Biome's type-aware lint to stabilize. Timeline unclear; on
   their roadmap.
2. Run `tsc --noEmit` with `strict` already — doesn't catch these.
3. Re-introduce `typescript-eslint` as a **secondary** lint step focused
   only on type-aware rules, running behind Biome. Costs: adds
   `eslint` + `typescript-eslint` + config back to devDeps, and a slower
   CI step (type-aware lint needs a TS project parse). Benefit: the two
   high-value rules above come back.
4. Build these into the `scripts/lint-sanity.ts` from [LMA-5]. Doable
   with the TS compiler API but non-trivial (needs a real type checker
   instance); probably more effort than option 3.

**Action item: [LMA-6]** decide between (1) wait, or (3) re-add ESLint
as a type-aware-only pass. Recommendation: option 3, scoped to 3–4 rules:
`no-floating-promises`, `no-misused-promises`, `switch-exhaustiveness-check`,
`prefer-nullish-coalescing`. Everything else stays in Biome. This is the
single highest-correctness-impact item in this audit.

## Stale doc references to ESLint

Not a lint issue but surfaced while auditing:

- `docs/conventions.md` still has 7 references to ESLint by name (lines
  ~140, 213, 222, 230, 242, 248, 254, 299, 317, 408). The rules it
  references are mostly valid under Biome too, just with different rule
  names.
- `.github/instructions/eslint-rules.instructions.md` is titled "Biome
  Linting" internally but lives at the ESLint-era filename. Rename to
  `.github/instructions/biome-rules.instructions.md` for consistency.

**Action item: [LMA-7]** sweep `docs/conventions.md` and rename the
`eslint-rules.instructions.md` file. Pure docs cleanup.

## Summary of action items

| ID | Effort | Value | Description |
|---|---|---|---|
| **LMA-1** | S | Low | Scope `noTemplateCurlyInString` off for `scriptfs-schema.ts` (or add per-entry ignores). |
| **LMA-2** | S | Low | Clean up 2 non-null assertions in `virtualdocs.ts`. |
| **LMA-3** | XS | Cosmetic | Delete empty constructor in `vm-explorer.ts:131`. Migration artifact. |
| **LMA-4** | S | **High** | Port `no-restricted-imports` from old ESLint config to Biome `noRestrictedImports` (replaces most of `vscode-sanity/no-node-builtins-web`). |
| **LMA-5** | M | Medium | Build `scripts/lint-sanity.ts` to replace the three remaining `vscode-sanity` rules (dispose / floating-disposable / api-version-compat). |
| **LMA-6** | M | **High** | Re-add ESLint as a type-aware-only pass for `no-floating-promises`, `no-misused-promises`, `switch-exhaustiveness-check`, `prefer-nullish-coalescing`. Biome keeps everything else. |
| **LMA-7** | S | Low | Sweep stale ESLint references in `docs/conventions.md`; rename `eslint-rules.instructions.md` → `biome-rules.instructions.md`. |

**Recommended order:** LMA-3 (trivial) → LMA-4 (quick correctness win) →
LMA-6 (biggest correctness win) → LMA-5 (last; fills remaining gaps) →
LMA-1, LMA-2, LMA-7 (cleanup).

Do **not** attempt all of these in a single PR. LMA-4 and LMA-6 each
deserve their own branch so any new failures they surface are reviewable
in isolation.
