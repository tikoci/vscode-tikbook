# TikBook Code Conventions & Patterns

This document captures recurring patterns, naming conventions, and style guidance specific to TikBook. Use this to write code that fits the project naturally.

## Logging & Output

### No console.log in Extension Code

- Use `log.info()`, `log.warn()`, `log.error()` from the output logging helper
- These are provided as imports in most files
- Reason: console output is invisible to users; only OutputChannel is visible in VS Code

**Example:**

```typescript
// ✅ Good
log.info('Connected to RouterOS');

// ❌ Bad
console.log('Connected'); // user won't see this
```

### Output Channels

- Create channels sparingly (one per major feature area)
- Current: "TikBook" (main), "RouterOS LSP" (coordination)
- Avoid duplicates: schema-mapper.ts and scriptfs.ts both use "RouterOS Virtual FileSystem"

## File I/O

### Prefer vscode.workspace.fs over Node fs

- Use `vscode.Uri` and `vscode.workspace.fs` for file operations
- Reason: Works in both desktop and web extension hosts

**Example:**

```typescript
// ✅ Good (web-compatible)
const content = await vscode.workspace.fs.readFile(uri);

// ❌ Avoid in extension code
import * as fs from 'fs'; // Not available in web
fs.readFileSync(path);
```

### Web-Only Gating

Gate desktop-only features behind `vscode.env.uiKind`:

```typescript
if (vscode.env.uiKind === vscode.UIKind.Web) {
  // Skip feature in web
  return;
}
// Feature code for desktop only
```

## Credentials & Secrets

### Use SecretStorage for Sensitive Data

- Passwords always go in SecretStorage, never in settings
- SecretStorage uses platform keychain (macOS, Windows, Linux)
- Settings are visible in settings.json (not safe)

**Example:**

```typescript
// ✅ Good
const password = await context.secrets.get('tikbook.password');

// ❌ Bad
const password = workspace.getConfiguration('tikbook').get('password');
```

## Router API Calls

### REST Client Pattern

- All REST calls go through `RouterRestClient` (shared.ts)
- Client handles:
  - Base URL, credentials, timeout
  - Error mapping
  - Retry logic (future)

**Example:**

```typescript
const client = new RouterRestClient(baseUrl, username, password, timeout);
const data = await client.get('/ip/address');
// Errors thrown as RouterError with message already formatted
```

### Error Handling

- RouterOS REST API returns errors in specific formats
- Use `RouterError` for consistency
- Map HTTP 401 to auth failure, 404 to not found, etc.

## Types & Interfaces

### Keep Types Open

- RouterOS adds attributes over time
- Use `Record<string, unknown>` or spreads for extensibility
- Avoid overly strict interfaces with readonly fields unless required

**Example:**

```typescript
// ✅ Good - extensible
interface RouterOsItem extends Record<string, unknown> {
  '.id': string;
  name?: string;
}

// ❌ Avoid - too strict
interface RouterOsItem {
  readonly id: string;
  readonly name: string; // What if RouterOS adds 'name-alt'?
}
```

### Explicit Return Types

- All functions should have explicit return types
- Helps LLM agents understand intent
- Enforced by ESLint

**Example:**

```typescript
// ✅ Good
async function getRouterName(): Promise<string> {
  // ...
}

// ⚠️ Flagged by lint
async function getRouterName() {
  // ...
}
```

## Async/Promises

### Await All Promises

- Using promises without await is a common bug
- ESLint enforces `@typescript-eslint/no-floating-promises`
- Event handlers are implicitly async (can return Promise)

**Example:**

```typescript
// ✅ Good
await client.post('/system/identity/set', { name: 'newname' });

// ❌ ESLint error
client.post('/system/identity/set', { name: 'newname' }); // floating promise
```

## Variable Scope & Initialization

### Prefer const; Use let When Reassigning

- ESLint enforces `prefer-const`
- Helps LLMs avoid accidental mutation

**Example:**

```typescript
// ✅ Good
const items = await client.get('/ip/address');

let current = items[0];
current = items[1]; // needs let because reassigned

// ❌ ESLint: prefer-const
let items = await client.get('/ip/address'); // never reassigned, use const
```

### Avoid Variable Shadowing

- ESLint warns on shadowing (common LLM mistake)
- Keep scope clear for readers

**Example:**

```typescript
// ❌ ESLint warns
function outer() {
  const x = 1;
  function inner() {
    const x = 2; // shadows outer x
  }
}

// ✅ Good
function outer() {
  const x = 1;
  function inner() {
    const innerX = 2; // clear name
  }
}
```

## Naming

### Commands & Events

- Commands: `tikbook.command.name` format (kebab-case)
- Events: PascalCase for event names
- Example: `tikbook.welcome.open.scriptfs` (command)

### Variables & Functions

- camelCase for variables, functions, methods
- PascalCase for classes, interfaces, types
- UPPER_SNAKE_CASE for constants (if truly immutable)

**Example:**

```typescript
const baseUrl = 'http://192.168.88.1'; // variable
function connectRouter(): Promise<boolean> { } // function
class RouterRestClient { } // class
interface RouterOsItem { } // interface
enum ConnectionStatus { } // enum
```

## Dependencies & Imports

### Organize Imports

- Use `@typescript-eslint/consistent-type-imports` to separate type imports
- Group: vscode, external packages, local imports

**Example:**

```typescript
import * as vscode from 'vscode';
import type { TextDocument } from 'vscode';
import axios from 'axios';
import type { AxiosError } from 'axios';
import { log } from './logging';
import type { RouterOsItem } from './types';
```

### Node Built-ins in Extension Code

- Avoid in general (not web-compatible)
- Allowed (with allowlist) in: routeros.ts (https), virtualdocs.ts (path), scriptfs.ts (util)
- ESLint enforces `no-restricted-imports`

## Testing

### Unit Tests

- Use `llm-experiments.test.js` for one-off validation tests
- Test uncertain behavior and edge cases
- Validate assumptions about RouterOS API before committing

**Example:**

```typescript
// In llm-experiments.test.js
it('should parse RouterOS error message', () => {
  const error = '... invalid value for argument ...';
  expect(isRouterOsError(error)).toBe(true);
});
```

## Comments & Documentation

### Explain Why, Not What

- Code should be self-explanatory (what)
- Comments explain reasoning (why)
- Flag non-obvious patterns with `// Note:` or `// Design:`

**Example:**

```typescript
// ✅ Good
// Skip metadata parsing for now; enable when metadata support is added (see notebook.ts#269)
// commitPending('markdown', rawMetadataParsed.groups?.[3]);

// ⚠️ Not helpful
// uncommenting this line breaks metadata
// commitPending('markdown', rawMetadataParsed.groups?.[3]);
```

### Document Quirks

- RouterOS-specific behavior
- Browser/platform differences
- Workarounds and their expiration date

**Example:**

```typescript
// RouterOS /console/inspect requires SSH; REST API cannot execute inspection commands
// Workaround: serialize output as JSON in RouterOS, then parse in VS Code
```

## Common Patterns

### Creating Virtual Documents

```typescript
const uri = vscode.Uri.parse(`rscena:${key}`);
const doc = await vscode.workspace.openTextDocument(uri);
await vscode.window.showTextDocument(doc);
```

### Executing Commands

```typescript
await vscode.commands.executeCommand('command.id', args);
```

### Settings & Configuration

```typescript
const config = vscode.workspace.getConfiguration('tikbook');
const baseUrl = config.get<string>('baseUrl');
```

## RouterOS Version Compatibility

- Minimum: RouterOS 7.10 (REST API added)
- Target: RouterOS 7.20.2+ (v7 LTS)
- Commands must exist in v7 schema
- Use routing documentation or forum release notes to validate

## Before Opening a PR

1. Run `npm run lint` - fix all ESLint errors
2. Check web/desktop implications
3. Add tests for uncertain behavior
4. Validate RouterOS commands with v7 schema
5. Review [sarb/code-review-checklist.md](./sarb/code-review-checklist.md)
6. Update this document if you discover new patterns
