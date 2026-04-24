---
name: 'AI Code Editing Best Practices'
description: 'Guidelines for AI agents to safely and accurately edit code files'
applyTo: '**/*.ts,**/*.js,**/*.md'
---

# AI Code Editing Best Practices

These practices prevent code corruption and editing errors when using `replace_string_in_file` and similar tools.

## Root Cause: Ambiguous Context Matching

When editing code with repeating patterns (especially test files with similar structure), the AI tool may match the wrong occurrence if the `oldString` isn't uniquely identifiable.

**Example Problem:**

```typescript
test('test1', () => {
  assert(value1, 'message');
});

test('test2', () => {
  assert(value2, 'message');  // Same structure!
});
```

Both tests end with `});` and contain `assert()` calls. If the oldString context isn't distinctive enough, the tool may replace the wrong test.

## Prevention Protocols

### Protocol 1: Read Full Context Before Editing

**When to apply:** Before any `replace_string_in_file` operation

**Steps:**

1. Read the file section containing the target code + surrounding tests/functions
2. Identify unique markers that distinguish the target from surrounding code
3. Include these unique markers in the oldString context

**Example:**

```typescript
// BAD: Generic context that could match multiple tests
assert(settings.apiTimeout > 0, 'API timeout should be positive');
assert(settings.apiTimeout <= 300, 'API timeout should be reasonable');
});

test('apiTimeout should be reasonable integer', () => {
  // ...
});
```

```typescript
// GOOD: Distinctive context from previous test ending
assert(settings.baseUrl.length > 0, 'baseUrl should have default value');
assert(settings.sshCommand.length > 0, 'sshCommand should have default value');
});

test('getConnectionUrlString formats URL correctly with credentials', () => {
  const urlString = getConnectionUrlString();
  assert(urlString.length > 0, 'Connection URL should not be empty');
```

### Protocol 2: Use Distinctive Start/End Markers

**When to apply:** For edits in files with repeating patterns

**Guidelines:**

- Include at least 5-8 lines of context BEFORE the target
- Include at least 5-8 lines of context AFTER the target
- Ensure the context includes distinctive elements from the surrounding code:
  - Variable names that differ from similar functions
  - Unique assertion messages
  - Different control flow (if, for, etc.)

**Example - Suite/Test Files:**

```typescript
// BEFORE: Includes previous test's ending
assert(settings.username.length > 0, 'username should have default value');
assert(settings.baseUrl.length > 0, 'baseUrl should have default value');
assert(settings.sshCommand.length > 0, 'sshCommand should have default value');
});

test('getConnectionUrlString formats URL correctly with credentials', () => {
  const urlString = getConnectionUrlString();

  assert(urlString.length > 0, 'Connection URL should not be empty');
  assert(urlString.includes('://'), 'URL should include protocol');
});

test('getConnectionUrlString handles baseUrl property', () => {
  // TARGET EDIT AREA
// AFTER: Includes next test's start
```

### Protocol 3: Full File Replacement for Complex Changes

**When to apply:**

- Multiple interdependent edits to the same file
- Test suites with many similar test blocks
- Any file where unique context markers are difficult to identify
- When uncertainty exists about correct matching

**Steps:**

1. Read the entire file (or large representative section)
2. Construct complete corrected content
3. Use single `replace_string_in_file` with full file content as oldString
4. This guarantees structural correctness

**Advantage:** The entire file structure is provided, eliminating ambiguity entirely.

### Protocol 4: Verify Structure After Edits

**When to apply:** After any code edit using `replace_string_in_file`

**Steps:**

1. Run `npm run compile:tsc` to check for TypeScript errors
2. Run `npm test` to execute tests
3. Check for structural issues (mismatched braces, wrong nesting)

**Do NOT rely on Biome --write to repair structural corruption.** Biome can fix formatting but cannot repair nested scopes or AST corruption.

## Edge Case: Test Files

Test files are particularly prone to corruption because:

- Many tests have identical structure: `test('name', () => { ... });`
- Assertions are highly repetitive
- Easy to accidentally include/exclude wrong test blocks

**Special Handling:**

1. Always read the full test suite first (all tests in the suite)
2. Use distinctive assertion messages as context markers
3. When in doubt about context, read the actual compiled `.test.js` output to see what's on disk
4. Include the suite structure in context: `suite('Name', () => { ... });`

## Examples of Corruption Patterns

These patterns indicate the AI tool may have matched ambiguously:

**Pattern 1: Nested Test/Function Calls**

```typescript
// CORRUPTED: test() nested inside another test()
test('test1', () => {
  test('test2', () => {  // ❌ This should be at same level!
    // ...
  });
});
```

**Pattern 2: Missing Closing Braces**

```typescript
// CORRUPTED: Suite missing closing brace
suite('Settings Retrieval', () => {
  test('test1', () => {
    // ...
  });
  // ❌ Missing final });
```

**Pattern 3: String Literal Corruption**

```typescript
// CORRUPTED: oldString didn't account for similar messages
assert(value, 'message');  // Could match WRONG test with same message
```

When you see these patterns in test output or compilation errors:

- Check git diff to see what changed
- Re-read the target file section to understand context
- Reapply the edit with better context markers or full file replacement

## Workflow

When editing code:

1. **Identify target** → "I need to change test X in file Y"
2. **Read context** → Read full test suite or file section
3. **Find unique markers** → What makes this code distinctive?
4. **Construct oldString** → Include enough context (5-8 lines before/after)
5. **Verify structure** → Run `npm run compile:tsc`
6. **Validate changes** → `npm test` or `npm run lint`

## References

- [vscode-extension.instructions.md](./vscode-extension.instructions.md) - Extension code standards
- [testing.instructions.md](./testing.instructions.md) - Test file guidelines
- [eslint-rules.instructions.md](./eslint-rules.instructions.md) - Biome linting expectations
