# Feature Specifications

This folder contains detailed design specifications for TikBook features. Specs are **living documents** that evolve from initial ideas to implementation-ready designs.

## Purpose

Feature specs solve the problem of **incremental design thinking** - you can write and refine design decisions over time, outside of chat sessions, at your own pace. When a spec is ready, signal to AI assistants or contributors to begin implementation.

## Spec Lifecycle

```
draft → under-review → ready-for-implementation → implemented → archived
```

### Status Definitions

| Status | Meaning | Who Can Edit | Ready to Code? |
|--------|---------|--------------|----------------|
| `draft` | Initial ideas, incomplete | Anyone | ❌ No - still thinking |
| `under-review` | Design solidifying, seeking feedback | Owner + reviewers | ❌ No - needs review |
| `ready-for-implementation` | Complete, ready for coding | Locked (implementation phase) | ✅ **YES - go!** |
| `implemented` | Feature complete, spec archived | Reference only | N/A - done |
| `abandoned` | Not pursuing this direction | Reference only | ❌ No - cancelled |

## Using Specs

### For Feature Authors (Writing Specs)

**Starting a new feature:**

1. Copy [_TEMPLATE.md](./_TEMPLATE.md) to `docs/specs/your-feature-name.md`
2. Fill in what you know, leave TODOs for unknowns
3. Set status to `draft`
4. Add to [index below](#spec-index)

**Evolving a spec:**

- Edit freely while status is `draft` or `under-review`
- Add design questions, constraints, examples as you think of them
- No pressure to finish in one session
- Commit changes incrementally (git is your friend)

**Ready for implementation:**

1. Ensure all sections are reasonably complete
2. Change status to `ready-for-implementation`
3. Notify contributors/AI assistants via issue or chat
4. Spec becomes "locked" during implementation (changes require discussion)

### For Implementers (AI/Contributors)

**Before implementing:**

1. Check spec status - only implement `ready-for-implementation` specs
2. Read entire spec carefully
3. Ask clarifying questions if anything is unclear
4. Update spec with implementation notes/decisions as you go

**After implementing:**

1. Change spec status to `implemented`
2. Add link to implementation (PR, commit, or file references)
3. Move spec to `implemented/` subfolder (keeps active list clean)

## Spec Template

See [_TEMPLATE.md](./_TEMPLATE.md) for the specification template. Copy it when creating new specs.

**Template sections:**

- **Metadata** - Status, dates, related items
- **Overview** - What and why
- **Current State** - What exists today (if partially implemented)
- **Design Questions** - Decisions needed before implementation
- **Requirements** - Functional and non-functional requirements
- **Implementation Notes** - Technical approach, files affected
- **Testing Strategy** - How to verify the feature works
- **Rollout Plan** - Phasing, feature flags, migration
- **Open Issues** - Unresolved concerns, risks

---

## Spec Index

### 🟢 Ready for Implementation

| Spec | Feature | Status | Priority | Effort |
|------|---------|--------|----------|--------|
| [experimental-features.md](./experimental-features.md) | Experimental Features Gating | ready-for-implementation | High | 2-3 hours |

### 🟡 Under Development (Drafts)

| Spec | Feature | Status | Priority | Effort |
|------|---------|--------|----------|--------|
| [scriptfs-completion.md](./scriptfs-completion.md) | ScriptFS Feature Completion | draft | High | TBD |
| [app-yaml-schema.md](./app-yaml-schema.md) | RouterOS /app YAML Schema | draft | Medium | TBD |
| [certificate-ux.md](./certificate-ux.md) | Certificate Management UX | draft | Medium | TBD |

### ⚪ Ideas / Placeholders

| Spec | Feature | Status | Priority | Notes |
|------|---------|--------|----------|-------|
| [transport-abstraction.md](./transport-abstraction.md) | Multi-Transport Support (REST/SSH/API) | draft | Medium | Needs research |
| [connection-profiles.md](./connection-profiles.md) | Connection Profile Management | draft | Medium | Depends on transport |
| [tikoci-integrations.md](./tikoci-integrations.md) | TIKOCI Tool Integrations | draft | Low | Exploratory |

### ✅ Implemented

| Spec | Feature | Implemented | PR/Commit |
|------|---------|-------------|-----------|
| _(none yet)_ | | | |

---

## Guidelines

### Writing Good Specs

**Be specific:**

- ❌ "Add certificate support"
- ✅ "Add UI to import .pem/.crt certificates to RouterOS via REST API"

**Show examples:**

- Include code snippets, UI mockups, or data structures
- Show "before" and "after" if modifying existing behavior

**Identify risks:**

- What could go wrong?
- What are the edge cases?
- Where might performance suffer?

**Think about testing:**

- How will we know it works?
- What needs manual vs automated testing?
- Are there security implications to test?

### Spec Maintenance

**Keep specs current:**

- Update as design evolves
- Document decisions made during chat sessions
- Reference related discussions/issues

**When to split specs:**

- If feature has clear phases → one spec per phase
- If feature is very large → split into logical components
- If blocked by prerequisites → separate spec for blocker

**When to merge specs:**

- If features are tightly coupled
- If implementation would happen together anyway
- If separating creates artificial boundaries

---

## Related Documentation

- **[DEVELOPMENT.md](../../DEVELOPMENT.md)** - Main development guide (points here)
- **[system-design.md](./system-design.md)** - How spec system works, future-features vs specs, best practices
- **[research/README.md](../research/README.md)** - Research findings and investigations
- **[llm-todos.md](../llm-todos.md)** - Quick action items (1-3 hours, clear requirements)
- **[future-features.md](../future-features.md)** - Long-term ideas, strategic vision, dependencies
- **[architecture.md](../architecture.md)** - System architecture and current design

---

## FAQ

**Q: When should I create a spec vs add to llm-todos.md?**  
A: Use specs for features that need multi-paragraph design decisions. Use llm-todos.md for quick action items (1-2 hours of work, clear requirements).

**Q: Can I have multiple specs in progress?**  
A: Yes! Work on specs at your own pace. Mark them as `draft` until ready.

**Q: What if requirements change during implementation?**  
A: Update the spec! Add an "Implementation Notes" section with decisions made during coding.

**Q: Should specs include code?**  
A: Pseudocode or code snippets are great. Full implementations belong in the codebase, not the spec.

**Q: How detailed should specs be?**  
A: Detailed enough that an implementer (AI or human) can start work without guessing. But don't overthink - specs evolve!

---

**Getting Started:** Copy [_TEMPLATE.md](./_TEMPLATE.md) and start writing! 🚀
