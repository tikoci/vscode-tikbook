# Experimental Features Gating System

> **Status:** `ready-for-implementation`  
> **Priority:** `high`  
> **Effort Estimate:** 2-3 hours  
> **Created:** 2026-02-26  
> **Last Updated:** 2026-02-26  
> **Owner:** User clarified requirements

**Related:**

- Spec: N/A (foundation feature)
- Issue: N/A
- Docs: Will update DEVELOPMENT.md, future-features.md, llm-todos.md
- Decision: User confirmed need for generic experimental feature system

---

## Overview

### What This Feature Does

Provides a clean, generic system for hiding incomplete or experimental features behind a configuration flag. Features can be individually enabled/disabled without code changes.

### Why We Need It

- **Rapid prototyping:** Ship experimental features in releases to test concepts without committing to long-term support
- **Reduced risk:** Users opt-in to experimental features, avoiding confusion or bugs in production workflows
- **Feature evolution:** Allow features to mature over time before promoting to stable
- **Clean codebase:** Avoids proliferation of one-off feature flags scattered across code

### Success Criteria

- [x] Single generic system works for all experimental features
- [x] Easy to add new experimental features (< 5 lines of code per feature)
- [x] Features hidden by default, require explicit opt-in
- [x] System handles VS Code API interactions (commands, menus, when clauses)
- [x] Clear documentation for how to use the system

---

## Current State

### What Exists Today

**No unified experimental feature system.** Two features are currently stable but should be experimental:

1. **Interactive REPL** (menus.ts line 120)
   - Fully implemented command "Start Interactive REPL"
   - README states "may be removed in future versions"
   - Not well documented, usefulness uncertain

2. **Video Player** (video.ts)
   - Fully implemented custom video player with WebVTT support
   - Placeholder for future teaching/training features
   - Platform-specific audio issues remain

### What's Missing

- Unified feature gating infrastructure
- Ability to hide commands/menus based on feature enablement
- Documentation for experimental feature workflow
- Clear user communication about what's experimental vs stable

### Files Affected

- `src/experimental.ts` (NEW) - Core experimental feature utilities
- `src/menus.ts` - Gate REPL commands/menus
- `src/video.ts` - Mark video features as experimental
- `src/extension.ts` - Register experimental context, conditional activation
- `package.json` - Add `experimental.features` setting, update when clauses
- `docs/DEVELOPMENT.md` - Document experimental feature workflow
- `README.md` - Document how users enable experimental features

---

## Design Questions

### Question 1: Setting Structure

**Context:** How should users enable features?

**Options:**

- **Option A:** JSON object with feature names as keys

  ```json
  {
    "routeros.experimental.features": {
      "repl": true,
      "video": true,
      "scriptfs": false
    }
  }
  ```

  - Pros: Type-safe, clear structure, discoverable
  - Cons: Requires schema updates for each feature

- **Option B:** Array of feature name strings

  ```json
  {
    "routeros.experimental.features": ["repl", "video"]
  }
  ```

  - Pros: Simple, no schema updates needed
  - Cons: No autocomplete, easy to typo

- **Option C:** Boolean per feature

  ```json
  {
    "routeros.experimental.repl": true,
    "routeros.experimental.video": true
  }
  ```

  - Pros: Individual docs per setting
  - Cons: Clutters settings UI

**Decision:** **Option A** - JSON object. Provides best balance of structure and extensibility. Set `additionalProperties: true` in schema to allow new features without package.json updates.

### Question 2: JSON-only vs UI Setting

**Context:** Should setting appear in settings UI?

**Decision:** **JSON-only** initially. This is an advanced/power-user feature. Add to UI later if demand warrants. Use `scope: "application"` and don't include in settings UI contribution.

### Question 3: VS Code Context for When Clauses

**Context:** Should menus/commands use `when` clauses to hide when feature disabled?

**Decision:** **Yes**. Set VS Code context keys like `tikbook.experimental.repl` that menus can check with `when: "tikbook.experimental.repl"`. This provides clean UI hiding without JavaScript checks in every command.

---

## Requirements

### Functional Requirements

#### Must Have

1. Setting `routeros.experimental.features` that stores feature enable/disable state
2. Helper function `isExperimentalEnabled(featureName: string): boolean`
3. VS Code context keys for each experimental feature
4. Gate REPL commands/menus behind experimental flag
5. Gate Video features behind experimental flag
6. Log when experimental features are used
7. Documentation in README for users

#### Should Have

1. Helper to list all enabled experimental features
2. Command to show experimental feature status
3. Warning message when user first enables experimental features

#### Could Have (Future)

1. Settings UI with checkboxes (defer to future if needed)
2. Telemetry for experimental feature usage (if telemetry added to extension)
3. Expiry dates for experiments (auto-disable after X months)

### Non-Functional Requirements

**Performance:**

- Feature checks lightweight (cached after first read)
- No performance impact when features disabled

**Security:**

- Experimental features don't bypass authentication or credential checks

**Compatibility:**

- Works in both desktop and web VS Code
- Setting syncs across devices (VS Code setting sync)

**Usability:**

- Clear error messages if user tries to use disabled feature
- Easy to discover how to enable features

---

## User Experience

### User Flows

**Flow 1: User wants to try REPL**

1. User opens Command Palette, doesn't see "Start Interactive REPL"
2. User reads README or CHANGELOG mentioning experimental features
3. User edits settings.json: `"routeros.experimental.features": { "repl": true }`
4. VS Code reloads settings
5. REPL command now appears in Command Palette

**Flow 2: User accidentally enables experimental feature**

1. User enables feature via settings
2. Extension logs: "Experimental feature enabled: repl"
3. User tries feature and encounters issue
4. User disables feature: `"repl": false`
5. Feature hidden, extension continues working

### UI/UX Design

**Settings:**

```json
{
  "routeros.experimental.features": {
    "type": "object",
    "scope": "application",
    "description": "Enable experimental TikBook features (advanced users only). These features are unstable and may be removed in future versions.",
    "default": {},
    "additionalProperties": true,
    "properties": {
      "repl": {
        "type": "boolean",
        "description": "Enable Interactive REPL for RouterOS"
      },
      "video": {
        "type": "boolean",
        "description": "Enable custom video player features"
      },
      "scriptfs": {
        "type": "boolean",
        "description": "Enable ScriptFS auto-mounting for /system/script"
      }
    }
  }
}
```

**Commands:**

- Existing commands don't change, just become conditionally visible

**Context Keys:**

- `tikbook.experimental.repl` - Boolean, true when REPL enabled
- `tikbook.experimental.video` - Boolean, true when video enabled
- `tikbook.experimental.scriptfs` - Boolean, true when scriptfs enabled

### Examples

**Example 1: Checking if feature enabled in code**

```typescript
import { isExperimentalEnabled } from './experimental';

export async function startRepl() {
  if (!isExperimentalEnabled('repl')) {
    vscode.window.showWarningMessage(
      'Interactive REPL is experimental. Enable in settings: routeros.experimental.features.repl'
    );
    return;
  }
  
  // REPL logic...
}
```

**Example 2: Using in package.json when clause**

```json
{
  "command": "tikbook.startRepl",
  "when": "tikbook.experimental.repl"
}
```

---

## Implementation Notes

### Architecture

**Components:**

- `experimental.ts` - Core utilities (isExperimentalEnabled, setContextKeys, etc.)
- `extension.ts` - Initialize experimental system on activation
- `menus.ts` / `video.ts` - Consume experimental checks

**Data Flow:**

```
Settings Change → experimental.ts reads config → Sets VS Code context keys
                                              ↓
                                    UI updates (menus hide/show)
                                              ↓
                              User invokes command → Check if enabled → Execute or warn
```

### Technical Approach

**Phase 1: Core Infrastructure (1 hour)**

1. Create `src/experimental.ts` with utilities
2. Add setting to package.json
3. Initialize in extension.ts activation
4. Add tests for experimental.ts

**Phase 2: Apply to Existing Features (1 hour)**

1. Gate REPL in menus.ts
2. Gate Video in video.ts
3. Update package.json when clauses
4. Test that features hide/show correctly

**Phase 3: Documentation (30 min)**

1. Update README.md with experimental features section
2. Update DEVELOPMENT.md with "Adding Experimental Feature" guide
3. Update llm-todos.md (mark items complete)

### Key Implementation Details

**experimental.ts API:**

```typescript
/**
 * Check if an experimental feature is enabled.
 * @param featureName - Name of the feature (e.g., 'repl', 'video')
 * @returns true if feature is enabled
 */
export function isExperimentalEnabled(featureName: string): boolean;

/**
 * Get all enabled experimental features.
 * @returns Array of enabled feature names
 */
export function getEnabledFeatures(): string[];

/**
 * Update VS Code context keys for all experimental features.
 * Should be called on activation and when settings change.
 */
export async function updateExperimentalContexts(context: vscode.ExtensionContext): Promise<void>;

/**
 * Log experimental feature usage (for debugging).
 */
export function logExperimentalUsage(featureName: string): void;
```

**package.json contributions:**

```json
{
  "contributes": {
    "configuration": {
      "properties": {
        "routeros.experimental.features": { /* ... */ }
      }
    }
  }
}
```

**Setting listener:**

```typescript
// In extension.ts activation
vscode.workspace.onDidChangeConfiguration(e => {
  if (e.affectsConfiguration('routeros.experimental.features')) {
    updateExperimentalContexts(context);
  }
});
```

### Dependencies

**Required Before Implementation:**

- [x] User confirmation on approach (DONE)

**Nice to Have:**

- [ ] List of all planned experimental features (can add incrementally)

---

## Testing Strategy

### Unit Tests

**Files:** `src/test/experimental.test.ts`

**Test Cases:**

- [x] `isExperimentalEnabled()` returns false when feature not in settings
- [x] `isExperimentalEnabled()` returns true when feature enabled in settings
- [x] `isExperimentalEnabled()` returns false when feature explicitly disabled
- [x] `getEnabledFeatures()` returns correct list
- [x] Setting default is empty object `{}`

### Integration Tests

**Files:** `src/test/integration/experimental.test.ts`

**Test Cases:**

- [x] Context keys set correctly on activation
- [x] Context keys update when settings change
- [x] Commands respect experimental flag (REPL hidden when disabled)

### Manual Testing

**Scenarios requiring manual verification:**

1. Enable REPL in settings → Command appears in Command Palette
2. Disable REPL → Command disappears
3. Enable video → Video commands appear in menus
4. Enable invalid feature name → No crash, feature not enabled

**Test with:**

- [x] VS Code desktop (macOS)
- [x] VS Code desktop (Windows)
- [x] VS Code for Web (settings sync)

---

## Rollout Plan

### Feature Flags

**Experimental Feature?**

- [ ] Yes
- [x] No - This *is* the experimental feature system (meta!)

### Migration

**Breaking Changes:**

- REPL and Video features will be hidden by default after implementation
- Users currently using these features will need to enable them explicitly

**Backward Compatibility:**

- First version with experimental system: Show warning on first activation if user previously used REPL/Video
- Provide guidance on how to re-enable

**Migration Message:**

```
TikBook: Some features are now experimental and hidden by default.
To continue using Interactive REPL and Video features, add to settings:
  "routeros.experimental.features": { "repl": true, "video": true }
```

### Documentation Updates

- [x] Update README.md - Add "Experimental Features" section
- [x] Update CHANGELOG.md - Note behavior change for REPL/Video
- [x] Update DEVELOPMENT.md - Add "Adding Experimental Feature" guide
- [x] Update docs/specs/README.md - Mark this spec as implemented

---

## Open Issues & Risks

### Risks

**Risk 1: User confusion from features disappearing**

- **Likelihood:** Medium
- **Impact:** Medium  
- **Mitigation:** Clear CHANGELOG note, migration warning, good documentation

**Risk 2: VS Code context keys don't update immediately**

- **Likelihood:** Low
- **Impact:** Low
- **Mitigation:** Force UI update after setting change, test thoroughly

### Unresolved Questions

- [ ] Should we have a command "Show Experimental Feature Status" for debugging?
  - **Resolution:** Nice to have, defer to future if needed

### Known Limitations

- Features require VS Code reload if implemented incorrectly (but context keys should avoid this)
- JSON-only setting may be hard to discover for new users (acceptable for experimental features)

---

## Decisions Log

### 2026-02-26: Use JSON Object for Settings

**Question:** How should users enable features?  
**Decision:** JSON object with feature names as keys  
**Rationale:** Best balance of structure, extensibility, and type-safety. `additionalProperties: true` allows new features without package.json updates.

### 2026-02-26: JSON-Only Setting (No UI)

**Question:** Should setting appear in settings UI?  
**Decision:** JSON-only initially  
**Rationale:** Advanced power-user feature. Can add UI later if demand arrants. Keeps UI clean for majority of users.

### 2026-02-26: Use VS Code Context Keys

**Question:** How to hide menus/commands?  
**Decision:** Set VS Code context keys, use `when` clauses  
**Rationale:** Clean, declarative approach. No JavaScript checks needed in every command handler.

---

## Implementation Checklist

- [ ] Core functionality implemented (experimental.ts)
- [ ] Unit tests written and passing
- [ ] Integration tests written and passing
- [ ] Gate REPL features
- [ ] Gate Video features
- [ ] Manual testing complete
- [ ] Documentation updated (README, DEVELOPMENT)
- [ ] CHANGELOG.md entry added
- [ ] Linting passes (`npm run lint`)
- [ ] No regressions in existing tests
- [ ] Spec status updated to `implemented`

---

## References

- VS Code Context Keys: <https://code.visualstudio.com/api/references/when-clause-contexts>
- VS Code Settings: <https://code.visualstudio.com/api/references/contribution-points#contributes.configuration>
- VS Code Extension Context: <https://code.visualstudio.com/api/references/vscode-api#ExtensionContext>

---

## Notes / Scratchpad

**Future experimental features to consider:**

- ScriptFS auto-mounting (when complete)
- Multi-router connection profiles (when designed)
- Certificate management UX (when implemented)
- /app dev toolkit (when ready)
- TIKOCI tool integrations (when prototyped)

**Why JSON object over array:**

- Easier to check individual feature: `features.repl` vs `features.includes('repl')`
- Better for VS Code settings UI if we add it later
- Can include per-feature metadata in future (e.g., expiry dates)
