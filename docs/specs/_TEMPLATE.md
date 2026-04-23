# [Feature Name]

> **Status:** `draft` | `under-review` | `ready-for-implementation` | `implemented` | `abandoned`  
> **Priority:** `high` | `medium` | `low`  
> **Effort Estimate:** [hours or "TBD"]

**Related:**

- Spec: [Link to related spec]
- Issue: [GitHub issue link]
- Forum: [Forum discussion link]
- Docs: [Related documentation]
- Research: [Link to research/findings if any]

---

## Overview

### What This Feature Does

[1-2 paragraph description of the feature from a user's perspective]

### Why We Need It

[Problem statement: what pain point does this solve?]

### Success Criteria

- [ ] [Measurable outcome 1]
- [ ] [Measurable outcome 2]
- [ ] [Measurable outcome 3]

---

## Current State

### What Exists Today

[Describe current behavior, if any. If this is net-new, say "Not implemented" and explain the gap]

### What's Missing or Broken

- [Issue 1]
- [Issue 2]
- [Issue 3]

### Files Affected

- `src/[file1.ts]` - [what needs to change]
- `src/[file2.ts]` - [what needs to change]
- `package.json` - [contributions to add/modify]
- `docs/[doc.md]` - [documentation updates needed]

---

## Design Questions

> **Note:** Move resolved questions to "Decisions" section below. Keep unresolved questions here.

### Question 1: [Open question]

**Context:** [Why we need to decide this]

**Options:**

- **Option A:** [Description]
  - Pros: [Benefits]
  - Cons: [Drawbacks]
- **Option B:** [Description]
  - Pros: [Benefits]
  - Cons: [Drawbacks]

**Decision:** [TBD or chosen option with rationale]

### Question 2: [Another decision point]

[Same structure as Question 1]

---

## Requirements

### Functional Requirements

#### Must Have

1. [Core capability 1]
2. [Core capability 2]
3. [Core capability 3]

#### Should Have

1. [Important but not blocking]
2. [Nice to have for v1]

#### Could Have (Future)

1. [Potential enhancement]
2. [Future iteration]

### Non-Functional Requirements

**Performance:**

- [Response time, throughput, or efficiency constraints]

**Security:**

- [Authentication, authorization, or data protection needs]

**Compatibility:**

- [VS Code versions, RouterOS versions, web vs desktop]

**Usability:**

- [UX constraints, accessibility requirements]

---

## User Experience

### User Flows

**Flow 1: [Primary use case]**

1. User does [action]
2. System responds with [feedback]
3. User can then [next action]
4. Result: [outcome]

**Flow 2: [Secondary use case]**
[Same structure]

### UI/UX Design

**Commands:**

- `tikbook.featureName.action1` - [Description]
- `tikbook.featureName.action2` - [Description]

**Menus:**

- [Where commands appear: editor/context, view/title, etc.]

**Settings:**

```json
{
  "routeros.featureName.setting1": {
    "type": "boolean",
    "default": false,
    "description": "Enable [feature aspect]"
  }
}
```

**Webviews / Panels:**

- [If applicable, describe custom UI elements]

### Examples

**Example 1: [Scenario name]**

```typescript
// Show example code or interaction
```

**Example 2: [Another scenario]**

```routeros
# RouterOS script example
```

---

## Implementation Notes

### Architecture

**Components:**

- `[Component1]` - [Responsibility]
- `[Component2]` - [Responsibility]

**Data Flow:**

```
User Action → [Component A] → [Component B] → RouterOS
                      ↓
                  [Output/Result]
```

### Technical Approach

**Phase 1: [Foundation]**

1. [Step 1]
2. [Step 2]
3. [Step 3]

**Phase 2: [Core Implementation]**

1. [Step 1]
2. [Step 2]

**Phase 3: [Polish/Enhancement]**

1. [Step 1]
2. [Step 2]

### Key Implementation Details

**Detail 1: [Specific technical decision]**
[Explanation, code snippet, or reference]

**Detail 2: [Another technical consideration]**
[Explanation]

### Dependencies

**Required Before Implementation:**

- [ ] [Blocker 1]
- [ ] [Blocker 2]

**Nice to Have:**

- [ ] [Optional prerequisite]

---

## Testing Strategy

### Unit Tests

**Files:** `src/test/[feature].test.ts`

**Test Cases:**

- [ ] [Test case 1 - what behavior to verify]
- [ ] [Test case 2]
- [ ] [Edge case 1]
- [ ] [Error handling]

### Integration Tests

**Files:** `src/test/integration/[feature].test.ts`

**Test Cases:**

- [ ] [Command registration]
- [ ] [VS Code API integration]
- [ ] [End-to-end flow]

### Manual Testing

**Scenarios requiring manual verification:**

1. [Scenario 1 - why manual?]
2. [Scenario 2]

**Test with:**

- [ ] VS Code desktop (macOS)
- [ ] VS Code desktop (Windows)
- [ ] VS Code for Web
- [ ] RouterOS 7.10 (minimum supported)
- [ ] RouterOS 7.20.2+ (target version)

---

## Rollout Plan

### Feature Flags

**Experimental Feature?**

- [ ] Yes - Hide behind `experimental.features` setting
- [ ] No - Enabled by default

**Setting Name:** `experimental.features.[featureName]`

### Migration

**Breaking Changes:**

- [List any breaking changes]
- [Migration steps for users]

**Backward Compatibility:**

- [How to maintain compatibility with existing usage]

### Documentation Updates

- [ ] Update README.md
- [ ] Update CHANGELOG.md
- [ ] Add to docs/ if needed
- [ ] Update relevant specs/

---

## Open Issues & Risks

### Risks

**Risk 1: [Potential problem]**

- **Likelihood:** High | Medium | Low
- **Impact:** High | Medium | Low
- **Mitigation:** [How to address]

**Risk 2: [Another concern]**
[Same structure]

### Unresolved Questions

- [ ] [Question that needs research or discussion]
- [ ] [Blocker that needs external input]

### Known Limitations

- [Limitation 1 - what won't be supported and why]
- [Limitation 2]

---

## Decisions Log

> **Note:** Move resolved design questions here. Keep a record of what was decided and why.

### [Date]: [Decision Title]

**Question:** [What we were deciding]  
**Decision:** [What we chose]  
**Rationale:** [Why we chose this]  
**Alternatives Considered:** [What we didn't choose and why]

---

## Implementation Checklist

**When status becomes `ready-for-implementation`, complete this checklist during coding:**

- [ ] Core functionality implemented
- [ ] Unit tests written and passing
- [ ] Integration tests written and passing
- [ ] Manual testing complete
- [ ] Documentation updated
- [ ] CHANGELOG.md entry added
- [ ] Linting passes (`npm run lint`)
- [ ] No regressions in existing tests
- [ ] Feature flag/experimental gating (if applicable)
- [ ] PR created and reviewed
- [ ] Spec status updated to `implemented`

---

## References

- [External documentation link]
- [RouterOS wiki or forum reference]
- [VS Code API documentation]
- [Related GitHub issues or discussions]

---

## Notes / Scratchpad

[Free-form area for thoughts, ideas, links, or things to remember. This section can be messy - it's your thinking space!]
