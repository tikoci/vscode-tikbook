# RouterOS Integration Patterns

This document captures patterns for RouterOS API integration, error handling, versioning, and credential management. Use when working with RouterOS connections and commands.

## REST API Patterns

### Base URL Construction

Always include protocol and port:

```typescript
// ✅ Good - Full URL with explicit port
const baseUrl = 'https://192.168.88.1:443'; // OR http://192.168.88.1:80
const client = new RouterRestClient(baseUrl, username, password);

// ✅ Good - Custom port for testing
const baseUrl = 'http://router.lab:8089'; // Non-standard port

// ⚠️ Incomplete - Missing port
const baseUrl = 'https://router.local'; // May default unexpectedly

// ❌ Bad - No protocol
const baseUrl = '192.168.88.1'; // REST client must assume http/https

// ❌ Bad - Path included
const baseUrl = 'https://router.local/api'; // REST adds /api automatically
```

**Why:** RouterOS REST API requires explicit protocol and port. Ambiguity causes connection failures.

### Response Parsing

Never assume response structure:

```typescript
// ✅ Good - Validate structure
async function getIdentity(): Promise<string> {
  try {
    const response = await client.get('/system/identity');
    
    if (!Array.isArray(response)) {
      throw new Error('Expected array from /system/identity');
    }
    
    const item = response[0];
    if (!item || typeof item.name !== 'string') {
      throw new Error('Identity missing name field');
    }
    
    return item.name;
  } catch (error) {
    log.error(`Failed to fetch identity: ${parseError(error)}`);
    return 'unknown';
  }
}

// ❌ Bad - Assumes structure without checking
async function getIdentity(): Promise<string> {
  return (await client.get('/system/identity'))[0].name;
  // Fails silently if response is unexpected
}
```

**Why:** API changes or errors produce unexpected responses. Validation prevents cascading failures.

### Request/Response Timeouts

Always configure timeouts:

```typescript
// ✅ Good - Explicit timeout with fallback
const client = new RouterRestClient(
  baseUrl,
  username,
  password,
  5000 // timeout in ms
);

async function getStatus(): Promise<ResourceStatus> {
  try {
    return await Promise.race([
      client.get('/system/resource'),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Status timeout')), 3000)
      ),
    ]);
  } catch (error) {
    log.warn(`Status check timed out, using cached value`);
    return this.cachedStatus ?? { uptime: 'unknown' };
  }
}

// ⚠️ Works but no recovery
const response = await client.get('/system/resource'); // May hang

// ❌ Bad - No timeout protection
const response = await fetch(baseUrl + '/system/resource');
```

**Why:** Network operations can hang. Timeouts prevent UI freezing. Caching prevents repeated failures.

## Command Execution Patterns

### Path Parameter Escaping

RouterOS paths with special characters need escaping:

```typescript
// ✅ Good - Escape special characters
function buildPath(base: string, ...parts: string[]): string {
  return [base, ...parts.map(encodeURIComponent)].join('/');
}

async function getInterface(name: string): Promise<RouterOsItem | null> {
  const path = buildPath('/interface', name);
  // Safe: /interface/ether1 or /interface/bridge%201 (with space)
  const results = await client.get(path);
  return results[0] ?? null;
}

// ❌ Bad - No escaping
async function getInterface(name: string): Promise<RouterOsItem | null> {
  const results = await client.get(`/interface/${name}`);
  // Fails if name contains '/' or special characters
}
```

**Why:** RouterOS interface names can contain spaces. Escaping prevents 404 errors and injection.

### Print Operations

Use `.print` suffix for read operations:

```typescript
// ✅ Good - Explicit print operation
async function listAddresses(): Promise<RouterOsItem[]> {
  return client.get('/ip/address/print');
}

async function listFilteredAddresses(interface: string): Promise<RouterOsItem[]> {
  // RouterOS query parameters: ?numbers=0,1 or .query() method
  return client.get(`/ip/address/print?interface=${encodeURIComponent(interface)}`);
}

// ⚠️ Some paths auto-print, but explicit is clearer
async function listAddresses(): Promise<RouterOsItem[]> {
  return client.get('/ip/address'); // Works but ambiguous
}

// ❌ Bad - Assumes data endpoint
async function listAddresses(): Promise<RouterOsItem[]> {
  return client.get('/ip/address/data'); // 404
}
```

**Why:** `.print` is explicit. Makes queries clear to readers and Copilot.

### Add/Update/Remove Operations

Use correct HTTP verbs and endpoints:

```typescript
// ✅ Good - Add new item
async function addAddress(
  address: string,
  interface: string
): Promise<string> {
  const response = await client.post('/ip/address', {
    address,
    interface,
  });
  // RouterOS returns .id of new item
  return response['.id'] ?? 'unknown';
}

// ✅ Good - Update existing item
async function updateAddress(id: string, enabled: boolean): Promise<void> {
  await client.put(`/ip/address/${id}`, { disabled: !enabled });
}

// ✅ Good - Remove item
async function removeAddress(id: string): Promise<void> {
  await client.delete(`/ip/address/${id}`);
}

// ❌ Bad - Wrong HTTP verb
async function addAddress(address: string, interface: string): Promise<void> {
  await client.get('/ip/address', { address, interface }); // GET doesn't modify
}

// ❌ Bad - Missing .id
async function updateAddress(name: string, enabled: boolean): Promise<void> {
  await client.put('/ip/address', { name, disabled: !enabled }); // RouterOS can't match by name
}
```

**Why:** HTTP verbs and `.id` matter. Wrong verb fails silently; missing `.id` causes partial updates.

## Version Compatibility Patterns

### Version Detection

Always check RouterOS version for version-specific features:

```typescript
// ✅ Good - Version-aware feature gate
async function getSystemInfo(): Promise<SystemInfo> {
  const version = await this.getRouterVersion();
  
  const resource = await client.get('/system/resource');
  const info: SystemInfo = {
    uptime: resource[0]?.uptime,
    version,
  };
  
  // Feature available in 7.18+
  if (this.isVersionGreaterOrEqual(version, '7.18')) {
    const board = await client.get('/system/package/update');
    info.buildTime = board[0]?.['built-time'];
  }
  
  return info;
}

// ✅ Good - Version comparison helper
function isVersionGreaterOrEqual(version: string, required: string): boolean {
  const parse = (v: string) => v.split('.').map(Number);
  const [a, b, c] = parse(version);
  const [x, y, z] = parse(required);
  
  if (a !== x) return a > x;
  if (b !== y) return b > y;
  return c >= z;
}

// ⚠️ Works but doesn't handle old RouterOS
async function getSystemInfo(): Promise<SystemInfo> {
  return client.get('/system/resource'); // May be empty in 7.10
}

// ❌ Bad - Crashes on unsupported version
async function getSystemInfo(): Promise<SystemInfo> {
  return client.get('/interface/vlan/print'); // Vlan not in 7.10
}
```

**Why:** RouterOS >= 7.10 doesn't have all commands. Version gates prevent 404 errors and confusing failures.

### Minimum Version Validation

Check minimum version on connect:

```typescript
// ✅ Good - Enforce minimum version
async function connect(): Promise<void> {
  await this.verifyConnection();
  
  const version = await this.getRouterVersion();
  if (!this.isVersionGreaterOrEqual(version, '7.10')) {
    throw new Error(
      `RouterOS 7.10+ required, found ${version}. ` +
      `REST API is not available in earlier versions.`
    );
  }
  
  this.status = 'connected';
  log.info(`Connected to RouterOS ${version}`);
}

// ❌ Bad - Silently fails on old RouterOS
async function connect(): Promise<void> {
  try {
    await client.get('/system/identity');
    this.status = 'connected';
  } catch {
    // No error messaging - user confused
  }
}
```

**Why:** Clear errors help users upgrade. Silent failures waste debugging time.

## Error Handling Patterns

### RouterOS Error Detection

RouterOS returns specific error messages:

```typescript
// ✅ Good - Detect by error message
const ROUTEROS_ERRORS = {
  NO_SUCH_ITEM: 'no such item',
  INVALID_VALUE: 'invalid value for argument',
  BAD_COMMAND: 'bad command',
  SYNTAX_ERROR: 'syntax error',
  OUT_OF_RANGE: 'out of range',
};

function parseRouterError(error: unknown): RouterError {
  const message = String(error);
  
  if (message.includes(ROUTEROS_ERRORS.NO_SUCH_ITEM)) {
    return { type: 'not-found', message };
  }
  
  if (message.includes(ROUTEROS_ERRORS.INVALID_VALUE)) {
    return { type: 'validation', message };
  }
  
  return { type: 'unknown', message };
}

// Usage
try {
  await client.get(`/ip/address/${id}`);
} catch (error) {
  const parsed = parseRouterError(error);
  if (parsed.type === 'not-found') {
    log.warn(`Address ${id} not found on router`);
    return null;
  }
  throw error; // Unknown error, propagate
}

// ❌ Bad - No error parsing
try {
  await client.get(`/ip/address/${id}`);
} catch (error) {
  log.error(String(error)); // Lost context
}
```

**Why:** RouterOS errors are strings. Parsing enables smart error recovery and user messaging.

### Retry Logic

Use exponential backoff for transient failures:

```typescript
// ✅ Good - Retry with backoff
async function executeWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 100
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries - 1) {
        throw error; // Last attempt, propagate
      }
      
      const delay = baseDelay * Math.pow(2, attempt);
      log.debug(`Retry attempt ${attempt + 1} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Retry logic error'); // Unreachable
}

// Usage
const items = await executeWithRetry(() => client.get('/ip/address'));

// ⚠️ No backoff - hammers server
for (let i = 0; i < 3; i++) {
  try {
    return await client.get('/ip/address');
  } catch (error) {
    if (i === 2) throw error;
  }
}

// ❌ Bad - No retry
try {
  return await client.get('/ip/address');
} catch (error) {
  return []; // Silent failure
}
```

**Why:** Network hiccups are transient. Retries prevent false negatives. Backoff prevents overload.

## Credential Management Patterns

### SecretStorage Usage

Always use SecretStorage, never settings:

```typescript
// ✅ Good - SecretStorage for credentials
async function setPassword(password: string): Promise<void> {
  await context.secrets.set('tikbook.password', password);
  log.info('Password stored securely');
}

async function getPassword(): Promise<string | undefined> {
  return context.secrets.get('tikbook.password');
}

// Usage
const password = await this.getPassword();
if (!password) {
  throw new Error('Router password not configured');
}

// ❌ Bad - Settings (visible in settings.json)
async function setPassword(password: string): Promise<void> {
  await vscode.workspace
    .getConfiguration('tikbook')
    .update('password', password);
  // Password is now in plaintext in settings.json!
}

// ❌ Bad - Environment variable (visible in logs)
const password = process.env.ROUTEROS_PASSWORD;
```

**Why:** SecretStorage uses platform keychain (macOS Keychain, Windows Vault, etc.). Settings are plaintext. Environment variables leak in logs.

### Credential Validation

Validate credentials early:

```typescript
// ✅ Good - Validate on configuration
async function setCredentials(
  baseUrl: string,
  username: string,
  password: string
): Promise<void> {
  const testClient = new RouterRestClient(baseUrl, username, password, 3000);
  
  try {
    await testClient.get('/system/identity');
    // Credentials valid, store them
    await context.secrets.set('tikbook.baseUrl', baseUrl);
    await context.secrets.set('tikbook.username', username);
    await context.secrets.set('tikbook.password', password);
  } catch (error) {
    throw new Error(`Invalid credentials: ${parseError(error)}`);
  }
}

// ❌ Bad - Store without validation
async function setCredentials(
  baseUrl: string,
  username: string,
  password: string
): Promise<void> {
  await context.secrets.set('tikbook.baseUrl', baseUrl);
  await context.secrets.set('tikbook.username', username);
  await context.secrets.set('tikbook.password', password);
  // User may enter wrong password, won't know until first use
}
```

**Why:** Validate early so users get immediate feedback. Prevents stored invalid credentials.

## Data Format Patterns

### JSON Serialization

RouterOS can serialize to JSON:

```typescript
// ✅ Good - Request JSON format
async function getAsJson(path: string): Promise<unknown> {
  const response = await client.get(`${path}?format=json`);
  return typeof response === 'string' ? JSON.parse(response) : response;
}

// ✅ Good - Use :serialize for complex output
async function exportScriptOutput(code: string): Promise<string> {
  const result = await client.execute(`
    ${code}
    :put [:serialize to=json $result]
  `);
  return Array.isArray(result) ? (result[0] as string) : '';
}

// ⚠️ Works but not all endpoints support format param
async function getAsJson(path: string): Promise<unknown> {
  return client.get(`${path}?format=json`);
}
```

**Why:** JSON is parseable and type-checkable. Avoids RouterOS syntax parsing in TypeScript.

### CSV Export

RouterOS can export as CSV:

```typescript
// ✅ Good - Export to CSV
async function exportCsv(path: string): Promise<string> {
  const response = await client.get(`${path}?format=csv`);
  return Array.isArray(response) ? response.join('\n') : String(response);
}

// Usage with Data Table Renderers extension
const csv = await exportCsv('/ip/address/print');
// Display in Table Renderer
```

**Why:** CSV is human-friendly and integrates with VS Code extensions.

## Before Making API Calls

1. **Check version requirement** - Is this command available in 7.10+?
2. **Validate parameters** - Do all required fields have values?
3. **Handle errors** - Map RouterOS errors to user-friendly messages
4. **Use correct HTTP verb** - POST for add, PUT for update, DELETE for remove, GET for read
5. **Include `.id` for mutations** - RouterOS needs `.id` to update/delete specific items
6. **Timeout protection** - All requests should have timeouts
7. **Log operations** - Include path, parameters, results for debugging
