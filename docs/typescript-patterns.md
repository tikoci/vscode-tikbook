# TypeScript Patterns for TikBook

This document captures TypeScript patterns specific to RouterOS integration and VS Code extension development. Use these patterns to write type-safe code that Copilot can follow.

## RouterOS API Response Types

### Extensible Record Types

RouterOS adds attributes over time. Use `Record<string, unknown>` and spreads for forward compatibility:

```typescript
// ✅ Good - Extensible; survives RouterOS API changes
interface RouterOsItem extends Record<string, unknown> {
  '.id': string;
  name?: string;
  enabled?: boolean;
}

// ❌ Avoid - Too strict; breaks when RouterOS adds attributes
interface RouterOsItem {
  readonly '.id': string;
  readonly name: string;
  readonly enabled: boolean;
}
```

**Why:** RouterOS adds fields in minor releases. Strict interfaces cause type errors when new attributes appear. Use spreads to accept unknown properties.

### Array vs Single Item Response

RouterOS REST API returns `[]` for `/command/print` (always array):

```typescript
// ✅ Good
async function getAddresses(): Promise<RouterOsItem[]> {
  const response = await client.get('/ip/address');
  return Array.isArray(response) ? response : [];
}

// ⚠️ Defensive but verbose
const items = (await client.get('/ip/address')) as RouterOsItem[];

// ❌ Bad - Assumes structure without checking
const items = await client.get('/ip/address') as RouterOsItem[];
```

**Why:** REST can return unexpected types. Always validate structure before casting.

### Error Response Shapes

RouterOS returns errors as strings (`"no such item"`) not structured objects:

```typescript
// ✅ Good
interface ApiResponse {
  success: boolean;
  result?: unknown;
  error?: string; // RouterOS returns plain text
}

function parseError(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  return 'Unknown error';
}

// ❌ Bad - Assumes error is object
const message = (error as ApiError).code; // Error: code is undefined
```

**Why:** RouterOS error responses are unpredictable. Always treat as `unknown` first, then narrow.

## Type Narrowing Patterns

### RouterOS Item Identification

The `.id` field uniquely identifies RouterOS items. Always preserve it:

```typescript
// ✅ Good - Type guards for .id
function isValidItem(item: unknown): item is RouterOsItem {
  return (
    typeof item === 'object' &&
    item !== null &&
    '.id' in item &&
    typeof (item as any)['.id'] === 'string'
  );
}

async function updateItem(item: RouterOsItem): Promise<void> {
  if (!item['.id']) throw new Error('Item missing .id');
  await client.put(`/ip/address/${item['.id']}`, item);
}

// ❌ Bad - Assumes .id exists
const id = item['.id']; // May be undefined
```

**Why:** RouterOS operations require `.id`. Validate before use to prevent silent failures.

### Version-Specific Types

RouterOS versions have different commands/attributes. Use discriminated unions:

```typescript
// ✅ Good - Version-aware typing
type RouterOsVersion = '7.10' | '7.18' | '7.20.2' | '7.22';

interface VersionedCommand {
  version: RouterOsVersion;
  command: string;
  deprecated?: RouterOsVersion; // Removed in version
}

async function executeCommand(cmd: VersionedCommand): Promise<unknown> {
  const current = await getRouterVersion();
  if (cmd.deprecated && current >= cmd.deprecated) {
    throw new Error(`Command deprecated in ${cmd.deprecated}, running ${current}`);
  }
  return client.execute(cmd.command);
}

// ❌ Bad - Ignores version differences
async function executeCommand(cmd: string): Promise<unknown> {
  return client.execute(cmd); // May fail on older RouterOS
}
```

**Why:** RouterOS features vary by version. Make version requirements explicit in types.

## Async/Promise Patterns

### Explicit Generic Types

Always include generic type for async functions:

```typescript
// ✅ Good - Return type explicit
async function getRouterIdentity(): Promise<string> {
  const result = await client.get('/system/identity');
  return result[0]?.name ?? 'unknown';
}

async function listAddresses(): Promise<RouterOsItem[]> {
  return client.get('/ip/address');
}

// ⚠️ ESLint will flag this - implicit Promise
async function getRouterIdentity() {
  const result = await client.get('/system/identity');
  return result[0]?.name ?? 'unknown';
}

// ❌ Bad - Floating promise (no await)
function updateRouter(name: string): void {
  client.post('/system/identity/set', { name }); // Promise ignored!
}
```

**Why:** Explicit types help Copilot understand intent. Floating promises cause silent failures.

### Error Boundaries

Async errors should be caught at layer that handles them:

```typescript
// ✅ Good - Error caught where it's handled
try {
  const items = await client.get('/ip/address');
  return items;
} catch (error) {
  log.error(`Failed to fetch addresses: ${parseError(error)}`);
  return []; // Graceful fallback
}

// ✅ Good - Propagate to caller's try/catch
async function getAddresses(): Promise<RouterOsItem[]> {
  return client.get('/ip/address'); // Let caller handle
}

// ❌ Bad - Error swallowed and ignored
client.get('/ip/address').catch(() => {}); // Silent failure
```

**Why:** Errors should be visible. Catch where you can handle them, propagate otherwise.

## Async Safety Patterns

### Await Before Building UI State

A common race condition occurs when async operations complete after UI construction. Always `await` async provider methods **before** building UI strings, objects, or state.

**Problem (Race Condition):**

```typescript
// ❌ Bad - Race condition
class VMExplorer {
  async getUnavailableReason(): Promise<string | undefined> {
    // This may take 100ms...
    return this.provider.getUnavailableReason();
  }

  async makeTreeItem(): Promise<TreeItem> {
    // Build tooltip text immediately (before async completes)
    const reason = this.getUnavailableReason(); // No await!
    const tooltip = `VM: ${this.vm.name}. Status: ${reason}`; // reason is Promise, not string!
    
    // This tooltip is built with stale/incomplete data
    return new TreeItem(this.vm.name, TreeItemCollapsibleState.None, {
      tooltip, // Contains Promise placeholder, not actual reason
    });
  }
}
```

**Solution (Await First):**

```typescript
// ✅ Good - Await before building UI
class VMExplorer {
  async getUnavailableReason(): Promise<string | undefined> {
    return this.provider.getUnavailableReason();
  }

  async makeTreeItem(): Promise<TreeItem> {
    // Await the async call FIRST
    const reason = await this.getUnavailableReason();
    
    // Now build tooltip with resolved data
    const tooltip = reason 
      ? `VM: ${this.vm.name}. Status: ${reason}` 
      : `VM: ${this.vm.name}. (Available)`;
    
    return new TreeItem(this.vm.name, TreeItemCollapsibleState.None, {
      tooltip, // Contains actual string, not Promise
    });
  }
}
```

**Why This Matters:**

- UI frameworks may render before async completes, causing stale or placeholder text
- Users see confusing tooltips like "undefined" or "Promise { <pending> }"
- Hard to debug because it's not a crash—just silent data staleness

**Pattern:**

1. **Identify async dependencies** - What does your UI state depend on?
2. **Await at the boundary** - Get real data before constructing UI objects
3. **Build UI with resolved data** - Pass strings/values, never Promises

**When to Use:**

- **Tree view items** - Tooltips, descriptions, icons depend on async provider methods
- **Diagnostics/status bars** - Text that shows connection status, availability, etc.
- **Any UI construction** - if it depends on async operations

## Generic Patterns

### Flexible REST Client

Use generics for REST operations to adapt to any path:

```typescript
// ✅ Good - Generic method
async function get<T = unknown>(path: string): Promise<T[]> {
  const response = await this.request('GET', path);
  return Array.isArray(response) ? response : [response];
}

// Usage
const addresses = await client.get<RouterOsItem>('/ip/address');
const rules = await client.get<FirewallRule>('/ip/firewall/nat');

// ⚠️ Works but less flexible
async function get(path: string): Promise<unknown[]> {
  // ... returns any
}

// ❌ Bad - Hardcoded type
async function getAddresses(): Promise<Address[]> {
  // Can't reuse for other paths
}
```

**Why:** Generics let REST client serve multiple entity types. Reduces code duplication for agentic reuse.

### Optional Config

Extend configuration safely:

```typescript
// ✅ Good - Partial<T> for optional overrides
interface ClientConfig {
  baseUrl: string;
  username: string;
  timeout: number;
  retries: number;
}

class RouterRestClient {
  constructor(config: Partial<ClientConfig> = {}) {
    this.config = {
      timeout: 5000,
      retries: 3,
      ...config, // Override defaults
    };
  }
}

// Usage
const client = new RouterRestClient({
  baseUrl: 'https://router.local',
  timeout: 10000, // Override default
});

// ❌ Bad - Requires all fields
class RouterRestClient {
  constructor(config: ClientConfig) {} // User must provide everything
}
```

**Why:** Partial types allow flexible initialization. Useful for testing and multiple scenarios.

## Class Method Patterns

### Explicit Return Types

All public methods must have explicit return types:

```typescript
// ✅ Good - Every public method has explicit type
class RouterOsManager {
  async connect(): Promise<void> {
    // Verify connection
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  async executeScript(code: string): Promise<string> {
    return this.client.execute(code);
  }
}

// ❌ ESLint error - No return type on public method
class RouterOsManager {
  async connect() {
    // ...
  }
}
```

**Why:** Explicit types help Copilot understand intent and enable better completions.

### Private vs Public

Mark internal helpers clearly:

```typescript
// ✅ Good - Clear distinction
class Client {
  async request(method: string, path: string): Promise<unknown> {
    // Public API
    return this.#executeRequest(method, path);
  }

  #executeRequest(method: string, path: string): Promise<unknown> {
    // Internal only - can't be called externally
  }

  #validatePath(path: string): boolean {
    // Helper
  }
}

// ⚠️ Works but less clear
class Client {
  async request(method: string, path: string): Promise<unknown> {}
  private executeRequest(method: string, path: string): Promise<unknown> {}
}
```

**Why:** Private fields (`#`) prevent external access. Makes intent clearer to Copilot and readers.

## Type Guard Patterns

### RouterOS-Specific Guards

Always validate RouterOS responses:

```typescript
// ✅ Good - Type guard for RouterOS item
function isRouterOsItem(obj: unknown): obj is RouterOsItem {
  if (typeof obj !== 'object' || obj === null) return false;
  
  const item = obj as Record<string, unknown>;
  return (
    typeof item['.id'] === 'string' &&
    (typeof item.name === 'string' || item.name === undefined)
  );
}

// Usage
const items = await client.get('/ip/address');
const validItems = items.filter(isRouterOsItem);

// ❌ Bad - No validation
const items = await client.get('/ip/address') as RouterOsItem[];
// If API changes, silently fails
```

**Why:** Type guards prevent runtime errors when API responses diverge from expectations.

### Array Item Guards

Safely extract single items:

```typescript
// ✅ Good - Explicit check
function getFirst<T>(items: T[]): T | undefined {
  return items[0];
}

async function getRouterName(): Promise<string> {
  const result = await client.get<IdentityItem>('/system/identity');
  const identity = getFirst(result);
  if (!identity?.name) {
    throw new Error('Router identity not found');
  }
  return identity.name;
}

// ❌ Bad - Assumes existence
async function getRouterName(): Promise<string> {
  const result = await client.get('/system/identity');
  return result[0].name; // May throw if result[0] is undefined
}
```

**Why:** RouterOS responses can be empty. Explicit checks prevent crashes.

## Readonly Patterns

### When to Use Readonly

Use sparingly; only for truly immutable data:

```typescript
// ✅ Good - Config is not modified after init
interface ClientConfig {
  readonly baseUrl: string;
  readonly timeout: number;
}

// ✅ Good - Constants
const DEFAULT_TIMEOUT: readonly number[] = [3000, 5000, 10000];

// ❌ Avoid - RouterOS items change (enable/disable, modify properties)
interface RouterOsItem extends Record<string, unknown> {
  readonly '.id': string; // ← Don't freeze API items
  readonly name?: string;
}

// ❌ Avoid - Mutable state shouldn't be readonly
class Manager {
  readonly items: Item[] = []; // ← Items can be added/removed
}
```

**Why:** RouterOS items are mutable. Use `readonly` for config/constants only, not domain objects. Copilot should know which data can change.

## Before Writing Code

1. **Check if type already exists** - Look in `shared.ts`, `types.d.ts`, or related files
2. **Use `Record<string, unknown>` by default** for RouterOS responses
3. **Add explicit return types** to all functions
4. **Add type guards** for API responses before using them
5. **Avoid `any`** - Use `unknown` and narrow with guards instead
