# /console/inspect API Patterns & Learnings

**Purpose:** Document /console/inspect usage patterns and implementation strategies observed in tikoci/lsp-routeros-ts project for ScriptFS and future RouterOS integrations.

**Status:** Complete (2026-02-27)

---

## Overview

RouterOS `/console/inspect` API provides schema discovery for:
- Syntax highlighting (tokens, colors)
- Code completion (suggestions, help text)
- Syntax information (descriptions, value types, ranges)
- Child paths (hierarchy discovery)

**Critical constraint:** `/console/inspect` requires **live RouterOS connection** - cannot work offline.

---

## API Request Types

### 1. request=highlight
**Purpose:** Syntax highlighting and token generation  
**Input:** RouterOS script text  
**Output:** Comma-separated token list  
**Usage in LSP:** Generate semantic tokens for VS Code colorization  
**Example:**
```
POST /console/inspect
{
  "request": "highlight",
  "input": "put [/system/identity get name]"
}
```
**Response:** `[token1,token2,...]` format

**Learning:** Cached by LSP per document - if document unchanged, reuse cached tokens. Reduces API calls significantly.

---

### 2. request=completion
**Purpose:** Code completion suggestions  
**Input:** Partial command/path  
**Output:** Array of completion items with metadata  
**Usage in LSP:** Provide autocomplete suggestions with icons, help text  
**Example:**
```
POST /console/inspect
{
  "request": "completion",
  "input": "/system/script"
}
```
**Response:**
```json
[
  {
    "completion": "add",
    "type": "command",
    "text": "Create a new item"
  },
  {
    "completion": "print",
    "type": "command",
    "text": "Print values of item properties"
  }
]
```

**Learning:** Need trailing space or `=` to get specific data - "tricks" required for context-sensitive results.

---

### 3. request=syntax
**Purpose:** Detailed syntax information and descriptions  
**Input:** Path or command with optional trailing symbols  
**Output:** Detailed metadata including TEXT field (descriptions, value ranges)  
**Example:**
```
POST /console/inspect
{
  "request": "syntax",
  "input": "/ip/route add check-gateway="
}
```
**Response:**
```json
[
  {
    "type": "syntax",
    "symbol": "CheckGateway",
    "symbol-type": "definition",
    "text": "arp | none | ping"
  }
]
```

**Learning:** TEXT field format is inconsistent - parsing varies by type. Requires custom parsing per symbol-type.

---

### 4. request=child
**Purpose:** Discover child paths and attributes  
**Input:** Path  
**Output:** List of child items with node types  
**Usage:** Dynamic path discovery for hierarchies  
**Example:**
```
POST /console/inspect
{
  "request": "child",
  "input": "/system"
}
```

---

## Key Implementation Patterns

### Caching Strategy
**From LSP:** Cache `/console/inspect` results per document lifecycle
- Cache invalidation: when document content changes
- Does NOT cache per-request - caches per document
- Benefit: Significant reduction in API calls

**Implication for ScriptFS:**
- Cache directory listings (file structure) at mount time
- Cache per RouterOS connection, invalidate on reconnect
- For frequently accessed paths, consider time-based cache invalidation

### Character Encoding Handling
**Critical Issue:** RouterOS uses Windows-1252 internally, VS Code uses UTF-16  
**LSP Solution:** Replace non-ASCII with underscores during `/console/inspect` queries
- Non-ASCII can only appear in comments/strings (not syntax elements)
- Safe to replace with `_` for schema discovery
- Original file content never modified

**Implication for ScriptFS:**
- Apply same encoding handling when querying path/attribute names
- Handle non-ASCII in attribute values (script content) differently than schema elements

### Request Size Limits
**From LSP code:** 32KB limit on input (`substring(0, 32767)`)
```typescripton
// Line 555 in model.ts
const highlightInspectResponse = await RouterRestClient.default.inspectHighligh(
  text.substring(0, 32767)  // 32KB limit
)
```

**Implication for ScriptFS:**
- Large scripts may need chunking for validation
- Stat/query operations on small paths are safe
- Monitor for timeout issues with large files

### Error Handling Patterns
**From LSP:** Use axios interceptors for consistent error handling
```typescript
client.interceptors.response.use(
  resp => pipelineResponseSuccess(resp),
  error => pipelineResponseError(error)
)
```

**Best Practices:**
- Log all API calls with timestamps
- Capture HTTP status codes and error details
- Grace degradation on transient failures
- Distinguish RouterOS errors from network errors

---

## Data Model Insights

### Path vs Path Array
Some REST calls accept `path` as string or array:
```json
{
  "request": "syntax",
  "input": "/system/script",
  "path": "/system/script"        // single path
  // or
  "path": ["/system/script", "..."]  // path hierarchy
}
```

**Implication for ScriptFS:**
- May need to query hierarchy differently depending on operation
- Some operations may return nested attributes

### ID Fields Consistency
**From LSP README:**
- Attributes often have `.id` field (internal identifier)
- Display names (like `name`, `interface`, `host`) may differ per resource type
- Some resources are singleton (no .id, like `/system/identity`)

**Implication for ScriptFS:**
- Must handle both ID and display-name variations
- Query schema to determine which identifier to use per path
- Plan for singleton resources (like `/system/routerboard`)

---

## Version Compatibility Considerations

**From restraml research:** RouterOS attribute/path schema changes between versions  
**From LSP behavior:** Schema always queried live from connected device

**Best Practices:**
- Never hardcode path/attribute assumptions
- Query `/console/inspect` at mount to validate schema
- Handle add/property failures gracefully (version difference)
- Document per-RouterOS-version behaviors and workarounds

---

## Testing Strategy

**Critical experiments before implementation:**

1. **Query /console/inspect for ScriptFS schema paths (5 min)**
   - `/system/script` - what attributes exist?
   - `/system/scheduler` - what attributes exist?
   - `/tool/netwatch` - what attributes exist?
   - Verify our schema entries match RouterOS reality

2. **Test add operations (5 min)**
   - Try adding to `/system/script` with just "name" - succeeds or fails?
   - Try adding to `/system/scheduler` - what's required?
   - Document required attributes per path

3. **Encoding test (2 min)**
   - Try create/update with non-ASCII in attribute names or values
   - Verify round-trip handling

4. **Large file handling (3 min)**
   - Write 32KB+ script to `/system/script`
   - Verify read/write correctness

---

## VS Code FileSystemProvider Requirements

### FileStat Interface (CRITICAL)
Every stat() call must return:
```typescript
interface FileStat {
  type: FileType,        // File | Directory | SymbolicLink
  ctime: number,         // Creation time (ms since epoch)
  mtime: number,         // Modification time (ms since epoch) - MUST ADVANCE
  size: number,          // File size in bytes
  permissions?: FilePermission  // Optional
}
```

**CRITICAL:** If file changes, mtime MUST advance from previous value. VS Code optimizations depend on mtime changes to detect content updates.

### Provider Registration
```typescript
workspace.registerFileSystemProvider('rscfile', provider, {
  isCaseSensitive: true,  // RouterOS CLI is case-sensitive
  isReadonly: false       // We support write
})
```

### Required Method Implementations
- `stat(uri)` - Return FileStat (mtime critical!)
- `readDirectory(uri)` - Return [name, FileType][] array
- `readFile(uri)` - Return Uint8Array
- `writeFile(uri, content, options)` - Sync to RouterOS
- `delete(uri, options)` - Remove from RouterOS
- `createDirectory(uri)` - Create folder (if needed)
- `watch(uri, options)` - Emit onDidChangeFile events

### Optional Optimizations
- `rename()`, `copy()` - Currently not in schema requirements
- Caching strategy for directory listings
- Batch operations for performance

---

## Integration Checklist

- [ ] Query `/console/inspect` for each schema path at mount
- [ ] Implement robust error handling with axios interceptors
- [ ] Handle character encoding per specification
- [ ] Update mtime on every write (non-obvious, easy to miss)
- [ ] Cache directory listings with invalidation on reconnect
- [ ] Test add operations to validate required attributes
- [ ] Log all `/console/inspect` queries with timestamps
- [ ] Handle concurrent edits (conflict detection for future)
- [ ] Gate large file handling (32KB+ consideration)

---

## References

- tikoci/lsp-routeros-ts: `/console/inspect` usage patterns
- VS Code FileSystemProvider API: stat(), mtime requirements
- RouterOS REST API: /console/inspect endpoint
- restraml project: Schema version differences
