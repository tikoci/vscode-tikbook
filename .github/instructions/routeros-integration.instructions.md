```instructions
---
name: 'RouterOS REST API Integration'
description: 'Guidelines for src/**/*.ts files with RouterOS API calls'
applyTo: 'src/**/*.{ts,tsx}'
---

# RouterOS REST API Integration

These guidelines apply to all TypeScript source files that interact with RouterOS. Follow these patterns to write resilient, maintainable REST integration code.

## Before Making API Calls

- Check [docs/routeros-patterns.md](../../docs/routeros-patterns.md) for established patterns
- Verify RouterOS version requirement (minimum 7.10 for REST)
- Consider web/desktop compatibility (`vscode.env.uiKind`)
- Plan error recovery and timeouts

## API Request Patterns

### Use RouterRestClient for All Calls

- Centralized in `src/shared.ts`
- Handles credentials, base URL, timeouts, error mapping
- All network operations go through this

```typescript
// ✅ Good
const result = await client.get('/ip/address/print');

// ❌ Avoid - Direct HTTP calls
const result = await fetch(`${baseUrl}/ip/address/print`);
```

### Validate Responses Before Use

- RouterOS may return unexpected structures
- Always validate array responses and item structure
- Use type guards from `docs/typescript-patterns.md`

```typescript
// ✅ Good - Type guard + structure check
const items = await client.get('/ip/address');
if (!Array.isArray(items)) {
  throw new Error('Expected array response');
}

// ❌ Bad - Cast without validation
const items = await client.get('/ip/address') as RouterOsItem[];
```

### Include .id in Update/Delete Operations

- RouterOS items identified by `.id` field
- Updates without `.id` fail or affect wrong item
- Never use `name` alone for targeting

```typescript
// ✅ Good - .id for targeting
await client.put(`/ip/address/${item['.id']}`, { disabled: true });

// ❌ Bad - Missing .id
await client.put('/ip/address', { name: 'ether1', disabled: true });
```

## Error Handling

### Parse RouterOS Errors

- ErrorOS returns specific error messages (strings, not structured)
- Map to user-friendly messages in constants/error map
- Don't expose raw RouterOS errors to UI

```typescript
// ✅ Good - Parse and map
const error = String(errorFromRouterOS);
if (error.includes('no such item')) {
  ui.showInfo('Item not found on router');
  return null;
}

// ❌ Bad - Raw error to user
throw new Error(String(error)); // User sees "no such item"
```

### Handle Timeouts

- Default 5 second timeout (configurable)
- Network hiccups are transient - use retry + backoff
- Timeout errors should inform, not crash

```typescript
// ✅ Good - Timeout + retry
try {
  return await executeWithRetry(() => client.get(path));
} catch (error) {
  log.error(`Operation failed after retries: ${path}`);
  return fallbackValue; // Or propagate if critical
}
```

### Version-Specific Error Handling

- Route commands by RouterOS version
- Old versions (7.10) lack many commands
- Check version in try/catch, not in error handler

```typescript
// ✅ Good - Version check before call
const version = await getRouterVersion();
if (this.isVersionGreaterOrEqual(version, '7.18')) {
  const board = await client.get('/system/package/update');
  return board[0]?.['built-time'];
}
return null; // Not available in 7.10
```

## Type Safety

### Use Unknown First, Then Narrow

- Assume API responses are `unknown`
- Validate structure with type guards
- Reference patterns in `docs/typescript-patterns.md`

```typescript
// ✅ Good - Type guard
function isValidAddress(obj: unknown): obj is AddressItem {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    '.id' in obj &&
    typeof (obj as any).address === 'string'
  );
}

// Usage
const items = await client.get('/ip/address');
const valid = items.filter(isValidAddress);
```

### RouterOS Types Are Extensible

- RouterOS adds fields in minor releases
- Use `Record<string, unknown>` for forward compatibility
- Avoid `readonly` fields for mutable API objects

```typescript
// ✅ Good - Extensible
interface RouterOsItem extends Record<string, unknown> {
  '.id': string;
  name?: string;
  // Survives if RouterOS adds new fields
}

// ❌ Avoid - Too strict
interface RouterOsItem {
  readonly '.id': string;
  readonly name: string; // Breaks if fields change
}
```

## Credentials & Security

### Use SecretStorage Only

- Never store passwords in settings
- Never log credentials
- Always validate before storing

```typescript
// ✅ Good - SecretStorage
const password = await context.secrets.get('tikbook.password');

// ❌ Bad - Settings (visible)
const password = workspace.getConfiguration().get('password');

// ❌ Bad - Logging (visible in user's logs)
log.info(`Connected with password: ${password}`);
```

### Validate Credentials Early

- Test connection when credentials change
- Fail fast with clear error message
- Don't store invalid credentials

```typescript
// ✅ Good - Validate on set
async function setPassword(password: string): Promise<void> {
  const testClient = new RouterRestClient(url, username, password, 3000);
  try {
    await testClient.get('/system/identity'); // Test
    await context.secrets.set('tikbook.password', password);
  } catch (error) {
    throw new Error('Invalid credentials');
  }
}
```

## Web/Desktop Compatibility

### Use vscode.workspace.fs for FILE I/O

- VS Code for Web doesn't support Node fs module
- Use `vscode.Uri` and `vscode.workspace.fs` everywhere

```typescript
// ✅ Good - Web-compatible
const content = await vscode.workspace.fs.readFile(uri);
const text = new TextDecoder().decode(content);

// ❌ Bad - Web incompatible
const text = fs.readFileSync(path, 'utf8');
```

### Gate Desktop-Only Features

- REST API requires baseUrl (works in web with CORS proxy)
- SSH, native API, local file access are desktop only
- Use explicit gates, not assumptions

```typescript
// ✅ Good - Explicit gate
if (vscode.env.uiKind === vscode.UIKind.Web) {
  ui.showInfo('Feature not available in VS Code for Web');
  return;
}
// Desktop-only code here
```

## Testing

### Test RouterOS Error Scenarios

- Mock error responses (not just success)
- Test version-specific behavior
- Validate timeout handling

```typescript
// ✅ Test error cases
it('handles no-such-item error', async () => {
  client.stub('get', async () => {
    throw new Error('no such item');
  });
  const result = await getAddress('invalid-id');
  expect(result).toBeNull();
});

// ❌ Test only happy path
it('gets address', async () => {
  const result = await getAddress('valid-id');
  expect(result.id).toBe('valid-id');
});
```

## References

- [docs/routeros-patterns.md](../../docs/routeros-patterns.md) - RouterOS integration patterns
- [docs/typescript-patterns.md](../../docs/typescript-patterns.md) - TypeScript + RouterOS types
- [docs/conventions.md](../../docs/conventions.md) - General code patterns
- [docs/sarb/code-review-checklist.md](../../docs/sarb/code-review-checklist.md) - Review guidance

```
