---
name: 'Logging Best Practices for UI-Dependent Code'
description: 'Guidelines for logging with UI context awareness'
applyTo: 'src/**/*.ts,src/test/**/*.ts'
---

# Logging Best Practices for UI-Dependent Code

## Problem

When logging data that flows through UI filters, blind logging is incomplete.

**Example:** User sees 1 CHR VM displayed, but logs say `found 5 VMs`.
This misleads debugging: Did filtering work? Are VMs dropped?

## Solution

Log before AND after filtering to show what the UI displays.

### Pattern: Show Filtered State

```typescript
// Query system
const allVMs = await provider.listVMs()
log.debug(`<UTMProvider.listVMs> Repository returned ${allVMs.length} total`)

// Filter for display
const chrVMs = allVMs.filter(vm => vm.chrMetadata?.isCHR)
log.info(`<UTMProvider.listVMs> Found ${chrVMs.length}/${allVMs.length} CHR VMs`)

// Show what's displayed
if (chrVMs.length > 0) {
  chrVMs.forEach((vm, i) => {
    log.debug(`<UTMProvider.listVMs>   [${i}] "${vm.name}"`)
  })
}
```

**Why:** User sees 1 VM on screen, logs explain: "1 CHR out of 5 total". Clear!

## Key Rules

- **For filters:** Log "X total, Y after filter"
  - Example: `Found 1 CHR VM(s) out of 5 total`
- **For transformations:** Log input and output counts
  - Example: `Created 30 QuickPick items from 30 versions`
- **For empty results:** Always explain what existed
  - Example: `No CHR VMs found (searched 12 total VMs)`

## When to Apply

Apply to any code that:

- Filters a collection (VMs, versions, assets)
- Transforms data before UI display (QuickPick, tree nodes)
- Shows/hides UI elements based on conditions

Do NOT apply to:

- Simple reads without filtering
- Internal helper functions not affecting UI
- Tight loops (avoid verbose logging)

## Real Examples from TikBook

### VM Listing

```typescript
const allVMs = result
log.debug(`<UTMProvider.listVMs> AppleScript returned ${allVMs.length} total VMs`)

const chrVMs = allVMs.filter(vm => vm.chrMetadata?.isCHR)
log.info(`<UTMProvider.listVMs> Found ${chrVMs.length}/${allVMs.length} CHR VMs`)
```

### GitHub Releases

```log
<fetchCHRReleases> Processed 30 CHR releases, found 150 total images
<UTMProvider.getCHRVersions> extracted 30 unique versions from 30 releases
```

Good: Shows 30 releases → 150 images (multiple per release)

## References

- [Phase Scope Verification](.github/instructions/phase-scope-verification.md) - Check feature scope before testing
- [AI Editing Best Practices](.github/instructions/ai-editing-best-practices.md) - Safe code editing
