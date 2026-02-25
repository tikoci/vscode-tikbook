# Code Review Checklist

This checklist guides reviewers in assessing TikBook changes for quality, consistency, and architectural alignment. Use in PR reviews and when finalizing work.

## Pre-Review

- [ ] Understand the PR intent - What problem does it solve?
- [ ] Check related docs - Are llm-todos, future-features, decision-log relevant?
- [ ] Identify components changed - Does it span extension/LSP boundary, web/desktop, etc.?
- [ ] Note architectural concerns - New patterns? Version compatibility? Credential handling?

## Code Quality

### TypeScript & Typing

- [ ] All functions have explicit return types (ESLint enforces this)
- [ ] No `any` types (use `unknown` + type guards)
- [ ] RouterOS response types use `Record<string, unknown>` (extensible)
- [ ] Type guards added for API responses before use
- [ ] No implicit `undefined` in return paths (handle null/empty explicitly)

**Question:** If RouterOS adds a new field, will this code break?

### Async/Promises

- [ ] All promises are awaited (no floating promises)
- [ ] Error handling in try/catch (not `.catch()` alone)
- [ ] Errors caught at appropriate layer (where handled or propagated cleanly)
- [ ] Timeout protection on network calls (5 second default)
- [ ] No `.catch(() => {})` silencing errors without logging

**Question:** What happens if RouterOS returns unexpectedly? Does the code fail gracefully?

### Logging & Debugging

- [ ] Uses `log.info()`, `log.warn()`, `log.error()` (not `console.log`)
- [ ] Error messages include context (what was attempted, why it failed)
- [ ] Sensitive data (passwords, tokens) not logged
- [ ] Log level appropriate (info for normal, warn for degradation, error for failures)

**Question:** Can someone debug this code from log output alone?

### Parameter Validation

- [ ] URLs/paths properly escaped (use `encodeURIComponent`)
- [ ] Required fields validated before use
- [ ] Array/object structure validated (not just cast)
- [ ] Version-specific features gated (not assumed)

**Question:** What happens if this function receives wrong-type arguments?

## RouterOS Integration

### API Calls

- [ ] Correct HTTP verb used (GET/POST/PUT/DELETE semantics)
- [ ] Paths match RouterOS v7.10+ schema (checked against docs/forum)
- [ ] `.id` included for updates/deletes (not just `name` or other fields)
- [ ] Response structure validated (not assumed)
- [ ] Error messages mapped to user-friendly messages

**Question:** Does this code work on RouterOS 7.10, 7.18, and 7.22+?

### Error Handling

- [ ] RouterOS errors detected and parsed (no generic "error")
- [ ] Version-incompatible errors caught early (not silent failures)
- [ ] Timeout errors handled (network hiccup vs. real failure)
- [ ] Retry logic with backoff for transient failures
- [ ] User notification clear (not technical jargon)

**Question:** What specific RouterOS error messages are caught? Are they tested?

### Credentials & Secrets

- [ ] Passwords use SecretStorage (not settings)
- [ ] No credentials in logs or error messages
- [ ] Credentials validated before storage
- [ ] Credential scope correct (per-user, per-workspace)

**Question:** Could this change leak a password?

## Architecture & Design

### Component Boundaries

- [ ] Change stays in TikBook (not needed in LSP)
- [ ] Or explicitly moved to LSP if appropriate
- [ ] Cross-extension coordination documented (if LSP affects code)
- [ ] Web/Desktop gating correct (if applicable)

**Question:** Where does this feature truly belong? Extension or LSP?

### Extension-Specific

- [ ] Web/Desktop implications considered (`vscode.env.uiKind` checks)
- [ ] No desktop-only Node APIs in main path (gated or documented)
- [ ] Settings schema matches package.json (if new settings added)
- [ ] Commands registered in package.json match code (if new commands)
- [ ] Menu entries match actual commands (if new menus)

**Question:** Will this break in VS Code for Web?

### Version Compatibility

- [ ] RouterOS version checks present (if version-dependent)
- [ ] Minimum supported version clear (7.10, 7.18, etc.)
- [ ] Future version changes planned (decision-log entry?)
- [ ] No hardcoded assumptions about RouterOS attributes

**Question:** What's the oldest RouterOS version this supports?

## Testing & Validation

### Test Coverage

- [ ] Tests added for new public functions
- [ ] Edge cases covered (empty array, null, timeout, wrong version)
- [ ] RouterOS errors tested (not just happy path)
- [ ] Integration tests pass (if touching LSP)

**Question:** What happens if RouterOS returns an error? Is that tested?

### Build Validation

- [ ] TypeScript compiles: `npm run compile` (no errors)
- [ ] Linting passes: `npm run lint` (no errors, warnings documented)
- [ ] Unit tests pass: `npm test` (all tests green)
- [ ] Security check: `npm audit` (no high/critical vulnerabilities)
- [ ] Web compatibility: `npm test:web` (if web-relevant changes)

**Question:** Did you run all validation commands?

### Integration Validation

- [ ] Commands in package.json match registered commands in code
- [ ] Settings schema in package.json matches code usage
- [ ] Menu contributions point to valid commands
- [ ] Activation events cover all entry points
- [ ] Internal markdown links not broken (if files moved)

**Question:** Is package.json in sync with code changes?

### Pre-Release Check

- [ ] `npm run vscode:prepublish` succeeds (runs: audit → lint → compile)
- [ ] No commented-out code left (unless documented in conventions.md)
- [ ] CHANGELOG.md updated (if user-facing change)
- [ ] Version bumped correctly (if preparing release)

**Question:** Is this ready to ship?

## Documentation & Learning

### Code Comments

- [ ] Comments explain *why*, not *what* (code is self-explanatory)
- [ ] Complex RouterOS-specific behavior documented
- [ ] Non-obvious patterns explained
- [ ] Links to conventions.md or architecture.md where relevant

**Question:** Why did the author choose this approach over alternatives?

### Knowledge Update

- [ ] New pattern discovered → Update docs/conventions.md?
- [ ] Mistake pattern found → New ESLint rule needed?
- [ ] Architectural decision made → Update decision-log.md?
- [ ] Version compatibility quirk found → Document in architecture.md?

**Question:** What did this code teach us for next time?

## Common Red Flags

- 🚩 **API call without error handling** → Will crash silently on network error
- 🚩 **Response assumed without validation** → Will fail if RouterOS API changes
- 🚩 **Hardcoded version behavior** → Won't work on different RouterOS versions
- 🚩 **Password in logging** → Security breach
- 🚩 **No `.id` in update** → Will silently update wrong item
- 🚩 **Floating promise** → Memory leak or silent failure
- 🚩 **Credentials in settings** → Visible in settings.json
- 🚩 **Direct fs access in extension** → Breaks in VS Code for Web
- 🚩 **Type assertions without guards** → Runtime errors on unexpected API response
- 🚩 **Retry loop without backoff** → DDoS on RouterOS
- 🚩 **No timeout on network** → UI hang
- 🚩 **New lint rule added but decision-log empty** → Future maintainers confused

## Approval Criteria

✅ **Approve if:**
- All type checks pass
- Proper error handling for all failure modes
- RouterOS compatibility clear and tested
- No security/credential leaks
- Architectural boundaries respected
- Code comments explain intent
- Tests cover main paths + edge cases
- Lint passes
- Related documentation updated

❌ **Request changes if:**
- Any red flags present
- Type checking issues
- Missing error handling
- Credentials handled unsafely
- Version compatibility unclear
- No tests for new public functions
- Lint warnings ignored
- Documentation out of sync

⚠️ **Discuss if:**
- Major architectural change (should have decision-log entry)
- Cross-extension implications
- Significant performance impact
- Web/Desktop compatibility concerns
