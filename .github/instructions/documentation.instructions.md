---
name: 'Documentation Standards'
description: 'Guidelines for docs/**/*.md'
applyTo: 'docs/**/*.md'
---

# Documentation Standards

These guidelines apply to all documentation files in `docs/`.

## Organization

- `docs/sarb-instructions.md` - Detailed SARB expectations and references (canonical source)
- `docs/llm-todos.md` - Task tracking and constraints for LLM agents
- `docs/future-features.md` - Future capabilities and decision points
- `docs/copilot-setup.md` - Copilot setup instructions and recommended settings
- `docs/architecture.md` - Component relationships and design decisions
- `docs/conventions.md` - Code patterns and naming conventions

## Markdown Linting Workflow

**Linting strategy:** Human docs use a shared `.markdownlint.yaml` rule set. CLI
linting excludes LLM instruction/prompt files via `.markdownlint-cli2.yaml` so
those files are not shaped around generic markdownlint busywork.

- **During development**: `npm run compile` does not run markdownlint
- **Public docs validation**: `npm run markdown:lint:public` (`README.md`, `CHANGELOG.md`)
- **Human/internal docs validation**: `npm run markdown:lint:agentic` (`ROADMAP.md`, `DEVELOPMENT.md`, `docs/**/*.md`)
- **Instruction files**: excluded from CLI lint by `.markdownlint-cli2.yaml`
- **Manual cleanup** (if needed): `npm run markdown:fix:all` applies auto-fixes to the docs those scripts cover
- **All-in-one format**: `npm run format` runs all linters with --fix

**For agentic workflow:** Focus on content quality. Keep human docs GitHub-friendly,
but do not rewrite LLM instruction files just to appease generic markdownlint
preferences.

## Links

- Use relative paths for internal links: `[file](./path/to/file.md)`
- Link to source code when helpful: `[notebook.ts](../src/notebook.ts#L560)`
- Keep links updated when files move

## For Decision Points

- Include clear decision options (Keep, Remove, Improve, etc.)
- Document considerations and trade-offs
- Link to affected code locations
- When decided, update [docs/sarb/decision-log.md](../../docs/sarb/decision-log.md) with rationale

## Synchronizing docs/, conventions, and decision-log

### When to update what

- **Update `docs/conventions.md`** when you discover a pattern worth codifying or a mistake to prevent
  - Example: "RouterOS types are extensible; use Record<string, unknown> or spreads"
  - Always include the *why* (context, consequence if not followed)

- **Update `docs/architecture.md`** when components or relationships change
  - Example: Moving cell execution to RouterOS LSP changes the architecture
  - Link to related decision-log entries

- **Update `docs/sarb/decision-log.md`** when making architectural choice or codifying a new rule
  - Append only; record *why* the choice was made, not just *what*
  - Example: "2026-02-25: Added no-floating-promises rule - caught async bugs in production"

- **Update `docs/sarb/code-review-checklist.md`** when review process itself changes
  - Example: "Check web/desktop implications" → became important after webview refactor
  - Rare updates; only when *how we review* changes

### Example workflow

1. During work: Discover that forgetting `.get<T>()` on workspace config causes type errors
2. Add to `docs/conventions.md`: "Always use `.get<T>()` for type-safe config access"
3. Propose lint rule in `tools/eslint/vscode-sanity.mjs` to catch untyped `.get()`
4. Add decision-log entry: "2026-02-25: Added config-type-safety rule - prevents silent type errors"
5. Update code-review-checklist.md if this is a new category of verification

## For Task Tracking and Deferral

### When to Add to `docs/llm-todos.md`

**Use llm-todos.md for actionable tasks that can be delegated to an agent:**

- Clear, specific work items ("Rename X to Y", "Add test for Z", "Fix type error in...")
- Tasks you could start with "Please handle this" and expect completion
- Items with clear file locations and scope
- Deferred cleanup, refactoring, or small enhancements

**When you realize:**

- "This should be fixed, but not right now"
- "Let's put this on the list for later"
- "Good idea, but out of scope for this change"

**Add with:** File paths, priority (🔴 high / 🟡 medium / 🟢 low), clear description of what needs doing

**Example:**

```markdown
### Fix Type Assertion in routeros.ts

**Files affected:** src/routeros.ts line 45
**Reason:** Using `as` instead of type guard; breaks if API changes
**Priority:** 🟡 Medium - Works now but fragile
```

### When to Add to `docs/future-features.md`

**Use future-features.md for vague, complex, or architectural ideas:**

- Features requiring design decisions ("Should we support SSH transport?")
- Architectural changes spanning multiple components
- Ideas that need investigation or validation
- Capabilities blocked by external dependencies (RouterOS versions, VS Code APIs)
- "Nice to have" enhancements without clear implementation path

**When you realize:**

- "This is interesting but complex"
- "We should consider this in the future"
- "This might require major refactoring"
- "Not sure if this is a good idea yet"

**Add with:** Context on why it's deferred, decision points, considerations, external blockers

**Example:**

```markdown
### SSH Transport Support

**Context:** Currently REST-only; some users prefer SSH API
**Decision Needed:** Support SSH natively or rely on RouterOS LSP?
**Considerations:**
- LSP already has SSH support; might duplicate effort
- Different error handling model
- Authentication complexity (keys vs passwords)
**Blockers:** Need to validate if RouterOS LSP covers use cases
```

### Decision Flow for Copilot

When Copilot suggests "we could do X later" or "this might be a future feature":

1. **Is it actionable with clear scope?** → Add to `llm-todos.md`
2. **Is it vague or requires design?** → Add to `future-features.md`
3. **Is it a mistake to prevent?** → Add to `conventions.md` + consider lint rule
4. **Is it an architectural choice?** → Add to `decision-log.md` if decided, or `future-features.md` if deferred

### Examples

| Suggestion | Where to Add | Why |
|------------|--------------|-----|
| "Extract this duplicated code into shared.ts" | llm-todos.md | Clear task, specific file |
| "Consider supporting WebSocket transport" | future-features.md | Vague, needs design, blocked |
| "Fix undefined check on line 45" | llm-todos.md | Specific, actionable |
| "Should we move cell execution to LSP?" | future-features.md | Architectural, needs decision |
| "Add test for timeout handling" | llm-todos.md | Clear task |
| "Explore integration with Data Table Renderer" | future-features.md | Vague, needs investigation |
