# Running ScriptFS Integration Tests on RouterOS

This guide explains how to run the new ScriptFS path structure tests against a live RouterOS instance to verify the bug fix.

## What Was Fixed

Removed 3 special-case code blocks that were bypassing schema-driven logic:
- **readDirectory**: Items now correctly appear as DIRECTORIES (not files)
- **readFile**: Uses schema-driven logic consistently
- **writeFile**: Create/update operations now use schema-driven multiFilePerItem

## Prerequisites

1. A running RouterOS instance (v7.10+)
2. Access to RouterOS REST API (typically `http://192.168.88.1`)
3. Valid credentials (default: `admin` with no password, or custom)

## Setup

### 1. Configure Test Settings

Create `.sarbsettings` file in workspace root:

```jsonc
{
  "baseUrl": "http://192.168.88.1",
  "username": "admin",
  "password": "your-password-here",  // Leave empty if no password
  "apiTimeout": 5000,
  "testTimeout": 30000,
  "skipLiveTests": false  // Set to true to skip RouterOS tests
}
```

### 2. Verify RouterOS Connection

Run connection validation test first:

```bash
npm test -- --grep "RouterOS Connection Validation"
```

Expected output:
```
✓ URL is reachable: http://192.168.88.1 (status: 401)
✓ REST API endpoint is accessible (/rest)
✓ Authentication works (username/password correct)
```

## Run ScriptFS Tests

Run all ScriptFS path structure tests:

```bash
npm test -- --grep "ScriptFS Path Structure"
```

Or run individual tests:

```bash
# Test that scripts appear as directories
npm test -- --grep "lists items as DIRECTORIES"

# Test that /source file exists inside
npm test -- --grep "contains source file"

# Test read operations
npm test -- --grep "can be read"

# Test write/update operations
npm test -- --grep "can be written"

# Verify schema-driven logic (no special-cases)
npm test -- --grep "Schema-driven"
```

## Expected Test Results

### ✅ Test 1: Lists items as DIRECTORIES
**Result:** `/system/script/my-script` appears as a DIRECTORY (FileType=2)
**Before bug:** Would appear as FILE (FileType=1) ❌
**After fix:** Correctly appears as DIRECTORY ✅

### ✅ Test 2: Contains source file
**Result:** `/system/script/my-script/` folder contains `source` file
**Verification:** `source` attribute appears as FILE inside the script folder

### ✅ Test 3: Can be read
**Result:** Reading `/system/script/my-script/source` returns script content
**Verification:** Content length > 0 and matches RouterOS data

### ✅ Test 4: Can be written/updated
**Result:** Writing to `/system/script/my-script/source` updates RouterOS
**Verification:** 
1. Writes test update comment
2. Verifies update persisted
3. Restores original content

### ✅ Test 5: Schema-driven logic
**Result:** All items are directories (not files with extensions)
**Verification:** Confirms multiFilePerItem: true is active, not special-case code

## Test Setup Flow

1. **beforeAll:** 
   - Connects to RouterOS
   - Uses first existing script OR creates `tikbook-test-<timestamp>`
   - Records script name for all tests

2. **Each Test:**
   - Uses same script name across all tests
   - Tests different aspects of path hierarchy
   - Logs detailed output

3. **afterAll:**
   - Cleans up test script if created
   - Restores any modified data

## Troubleshooting

### Tests are skipped
```
✗ skipLiveTests: true in .sarbsettings
```
**Fix:** Set `skipLiveTests: false` in `.sarbsettings`

### Connection failed
```
URL is NOT reachable: http://192.168.88.1
Error: ECONNREFUSED
```
**Fix:** 
- Verify RouterOS device is running
- Check IP address in baseUrl
- Verify network connectivity

### Authentication failed
```
REST API responded with 401
```
**Fix:**
- Check username in `.sarbsettings`
- Verify password is correct
- Try empty password if default admin has no password

### Script folder shows as FILE instead of DIRECTORY
```
Script "my-script" should be a DIRECTORY (FileType=2), not a file (FileType=1)
✗ FAILED
```
**Status:** Bug NOT fixed - special-case code still active
**Action:** Verify code was updated: `src/scriptfs.ts` should NOT contain `/system/script special-case` blocks

## Manual Testing in VS Code

### Mount ScriptFS in File Explorer

1. Open Command Palette (⌘⇧P)
2. Run: `> ScriptFS: Mount Filesystem`
3. Enter RouterOS URL: `rscfile://192.168.88.1/system/script`
4. Open in File Explorer (⌘⇧E)

### Verify Path Structure

In File Explorer, you should see:

```
rscfile:// (root)
└── 192.168.88.1 (authority)
    └── system
        └── script
            ├── my-script/           ← FOLDER (not file!)
            │   ├── source           ← File inside
            │   ├── comment          ← Metadata file
            │   ├── owner            ← Metadata file
            │   └── ...
            ├── another-script/      ← FOLDER
            │   ├── source
            │   └── ...
            └── ...
```

### Edit Script via New Path

1. Navigate to `/system/script/my-script/source`
2. Edit the source file in VS Code
3. Press Ctrl+S to save
4. Changes sync back to RouterOS in real-time

## Expected Behavior After Fix

**Before (Bug):**
- Scripts showed as files: `my-script.rsc` or just `my-script`
- Couldn't expand to see attributes
- UI was confusing for multi-attribute items

**After (Fixed):**
- Scripts show as folders: `my-script/`
- Can expand to see all attributes: `source`, `comment`, `owner`, etc.
- Each attribute is a separate file
- Matches RouterOS CLI hierarchy

## Validation Checklist

- [ ] All 5 integration tests pass
- [ ] Scripts appear as folders (not files)
- [ ] Each folder contains `/source` file
- [ ] Reading /source returns script content
- [ ] Writing /source updates RouterOS
- [ ] No console errors in test output
- [ ] Manual testing in VS Code matches expected structure

---

**Integration Test File:** `src/test/suite/integration/scriptfs-path-structure.test.ts`  
**Schema Definition:** `src/scriptfs-schema.ts` lines 60-80 (multiFilePerItem: true)  
**Fixed Code:** `src/scriptfs.ts` (readDirectory, readFile, writeFile methods)
