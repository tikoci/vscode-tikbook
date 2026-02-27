# Feature Specification System - Design & Decisions

This document explains the design of TikBook's feature spec system and how it relates to existing documentation.

---

## System Components

### Four-Tier Documentation Structure

```
docs/
├── llm-todos.md (⚡ QUICK WINS)
│   └── 1-3 hour tasks, clear requirements
│   └── Code cleanup, small bugs, doc fixes
│   └── No design needed - just do them
│
├── future-features.md (📋 STRATEGIC VISION)
│   └── Long-term concepts, 6+ months out
│   └── "Wouldn't it be cool if..."
│   └── Strategic thinking, roadmap
│
├── specs/ (🔨 TACTICAL PLANNING)
│   ├── _TEMPLATE.md (Template for new specs)
│   ├── README.md (System documentation)
│   ├── experimental-features.md ✅ ready-for-implementation
│   ├── draft-features/ (Specs under development)
│   └── implemented/ (Completed specs - reference only)
│
└── research/ (🔬 INVESTIGATION)
    └── [topic].md
    └── Findings, investigations, decision context
    └── Linked from specs when decisions needed
```

### When to Use Each

| Use Case | Where | Timeline | Why |
|----------|-------|----------|-----|
| Small bugs, quick cleanup | llm-todos.md | This sprint | Clear fix, no design |
| Code cleanup, doc updates | llm-todos.md | This sprint | Straightforward changes |
| Brainstorm, long-term vision | future-features.md | 6+ months | Aspirational, not committed |
| Strategic roadmap thinking | future-features.md | Planning phase | Multi-team impact |
| Feature needs implementation soon | Create spec | Weeks/months | Design decisions pending |
| Feature blocked waiting for input | Spec (draft status) | Waiting for user | Incremental refinement |
| Feature ready to code | Spec (ready-for-implementation) | Ready now | All decisions made |
| Need to understand topic first | docs/research/ | Before spec decisions | Research supports design |

---

## Decisions: future-features.md vs specs/ vs llm-todos.md

### Current Approach

**llm-todos.md = Quick Wins (⚡ Grab bag)**

- Tasks that need no design work
- Clear requirements, straightforward implementation
- 1-3 hours of work typically
- Do immediately when capacity available
- Examples: Fix typo in docs, add error message, rename variable

**future-features.md = Strategic Vision (📋 Aspirational)**

- Long-term features (6+ months out)
- Features requiring architectural changes
- Features with unresolved dependencies
- Ideas that might not happen
- Captures strategic thinking and roadmap
- Examples: SSH Transport, Docker Dev Container, Multi-router support

**specs/ = Tactical Planning (🔨 Near-term)**

- Features being actively designed
- Features that could start within weeks/months
- Features with clear scope
- User input being gathered incrementally
- Ready for implementation or awaiting specific decisions
- Examples: Experimental features gating, ScriptFS completion, Certificate UX

### Workflow & Flow

```
⚡ llm-todos           → Do immediately (code cleanup, small bugs)
     ↓
     ├→ Done (delete from list)
     └→ Too big? → Extract to spec (create docs/specs/feature.md)

📋 future-features     → Strategic roadmap, "wouldn't it be cool"
     ↓
     ├→ Feature becomes concrete → Extract to spec
     ├→ Needs implementation soon → Create docs/specs/feature.md
     └→ Feature completed → Update future-features with note

🔨 specs/              → Detailed planning
     ├→ draft → User adds input → under-review → ready (code) → implemented
     ├→ requires research → Create docs/research/findings.md
     └→ blocking other feature → Leave in specs/ until unblocked

🔬 research/           → Investigation results
     └→ Linked from specs → Kept for reference
```

### Example Classifications

| Feature | Category | Reason |
|---------|----------|--------|
| Fix typo in README | llm-todos.md | Immediate, clear |
| Code cleanup pass | llm-todos.md | Straightforward work |
| SSH Transport | future-features.md | 6+ months, blocking |
| Experimental Features Gating | specs/experimental-features.md | Ready to implement now |
| ScriptFS Completion | specs/scriptfs-completion.md | 70% done, user input pending |
| CertificateUX | specs/certificate-ux.md (draft) | Will implement soon, needs design |
| TIKOCI Tool Integrations | future-features.md | Exploratory, depends on tools |
| Docker Dev Container | future-features.md | Strategic, long lead time |

### How Items Move Between Tiers

**llm-todos → specs/**

```
When: Item turns out bigger than 1-3 hours
How: Remove from llm-todos, create spec in docs/specs/
```

**future-features → specs/**

```
When: Idea becomes concrete and near-term
How: 
1. Extract section from future-features.md
2. Create new spec in docs/specs/feature-name.md
3. Link from future-features: "See docs/specs/feature-name.md"
4. Mark spec as draft or ready-for-implementation
```

**specs + research → implemented**

```
When: Feature complete
How:
1. Update spec status to "implemented"
2. Move spec to specs/implemented/ folder
3. Update future-features.md with completion note
4. Keep research docs in docs/research/ for reference
```

**Example:** ScriptFS started in future-features → Now in specs/scriptfs-completion.md (draft) → Will move to implemented/ when done

---

## Approach: Specs for Existing Features

### Question: Should we document existing features as design docs?

**My recommendation: Selective approach**

**DO create specs for:**

- Partially-implemented features (like ScriptFS)
- Complex features that need refactoring (like notebook serialization)
- Features with documented open issues
- Features that are experimental or need stabilization

**DON'T create specs for:**

- Stable, working features with clear code and documentation already exists
- Small, well-understood components
- Features fully documented in README or architecture.md

**Rationale:**

- Specs are tools for **change**, not documentation of status quo
- Good code + architecture.md already document "how it works"
- Specs become heavy if written for everything
- Specs are useful when there are **decisions to make** or **requirements to clarify**

### What Already Documents Existing Features

- **architecture.md** - Component design, data flow, known issues
- **conventions.md** - Code patterns, style
- **Code comments** - Local implementation details
- **README.md** - User-facing features
- **CHANGELOG.md** - What changed when

### If You Want Feature Baselines

Instead of specs, consider:

1. **Add "Current State" to architecture.md**
   - Expand per-component sections
   - Document known limitations

2. **Create docs/feature-status.md**
   - Table: Feature name, Status (stable/experimental/partial), Known issues, Stability (1-5), Who uses it
   - Quick reference for "what works well" vs "what needs work"

3. **Only create specs** for features you're actively changing

---

## Enhanced Template Suggestions

Based on patterns, the template could benefit from these additions:

### 1. Decision Log Section (Already in template ✅)

Great for capturing "why" - use this heavily.

### 2. Security/Validation Considerations

Add to "Non-Functional Requirements":

```markdown
**Security & Edge Cases:**
- [ ] Input validation for user-provided data
- [ ] Authentication/authorization checks
- [ ] Data exposure risks (e.g., logging sensitive values)
- [ ] SQL injection or code injection risks (if applicable)
- [ ] Backwards compatibility: What breaks if we change this?
```

### 3. Error Cases & Failure Modes

Add to "Open Issues & Risks":

```markdown
**Edge Cases & Error Handling:**
- What happens if [X service] is unavailable?
- How to handle partial failures?
- User's network drops during operation?
- RouterOS version incompatibility?
- What's the rollback/recovery plan?
```

### 4. Integration Points

Add to "Implementation Notes":

```markdown
**Integration Checklist:**
- [ ] Updates needed in package.json?
- [ ] Menu items, commands, keybindings?
- [ ] Settings to add to package.json?
- [ ] Activation events? (onFileSystem, onLanguage, etc.)
- [ ] Context keys for when clauses?
- [ ] Imports/dependencies in extension.ts?
- [ ] Related components that need updates?
```

### 5. Success Metrics / Validation

Add to "Success Criteria":

```markdown
### Success Metrics
- [ ] User can { do this } in < N minutes
- [ ] Feature works for 90% of RouterOS versions 7.10-7.22
- [ ] No regressions in existing tests
- [ ] Performance acceptable: < X seconds for typical use case
```

---

## Research System for Spec Development

### Process

**You request research:**

```
Create documentation for certificate-ux.md:
- How to wrap certs for iOS/macOS (.mobileconfig)
- Windows VPN profile deployment approaches
- Practical examples and tools
```

**AI creates:** `docs/research/certificate-deployment-options.md`

- Investigates each topic
- Provides findings with sources
- Flags uncertainties
- Suggests implications

**You read findings and:**

- Decide certificate UX scope (import/export yes, wrapping no)
- Update spec with decisions
- Change status to `ready-for-implementation`

**Research doc stays:**

- Reference for future discussions
- Evidence for design decisions
- Context for maintenance

### Current Research Documents

None yet. Will be created as needed.

---

## Addressing Your Questions

### Q1: Is LLM_TODOS_REVIEW.md needed?

**Answer: No, archive it.**

That document was a comprehensive analysis created during the system design. Information has been incorporated:

- Status summaries → Updated llm-todos.md
- Effort estimates → Into specs (effort field)
- Item groupings → Applied where items moved to specs
- Testing strategies → Each spec has "Testing Strategy" section

**Action:**

- Move [docs/LLM_TODOS_REVIEW.md](../LLM_TODOS_REVIEW.md) → [docs/archived/LLM_TODOS_REVIEW.md](docs/archived/LLM_TODOS_REVIEW.md) for historical reference
- Or delete if not useful going forward

**Your call:** Keep or delete?

---

### Q2: How does spec system relate to future-features.md?

**Answer: Complementary layers**

- **future-features.md** = Strategic vision, long-term roadmap, dependencies
- **specs/** = Tactical planning, detailed requirements, near-term implementation

**Movement:** Ideas in future-features → become draft specs → implementation → reference

**Best practice:**

- future-features.md stays high-level, links to specs when relevant
- Specs are detailed, reference future-features for context
- No duplication - if detail in spec, future-features just has overview

---

### Q3: What best practices for single-dev + agentic AI?

**Recommendations for template additions:**

1. **Decisions vs Decisions Needed**

   ```markdown
   ### Decisions Made
   - [Decision]: [Rationale]
   
   ### Decisions Still Needed
   - [ ] [What must be decided]
   - [ ] [Who needs to decide it]
   ```

2. **Context for AI Assistants**

   ```markdown
   ### Implementation Notes for AI
   - Avoid [pattern] because [reason]
   - Coordinates with [component] - notify if changes needed
   - Web vs Desktop: [compatibility notes]
   - Breaking changes: [what users might see]
   ```

3. **Assumptions & Validation**

   ```markdown
   ### Assumptions
   - [ ] Assuming RouterOS endpoint works [this way]
   - [ ] Assuming VS Code API [does this]
   - [ ] Assuming no breaking changes before [date/version]
   
   ### Validation Needed
   - [ ] Test on RouterOS 7.10, 7.16, 7.20.2
   - [ ] Test on VS Code Desktop + Web
   - [ ] Manual testing: [specific scenario]
   ```

4. **Previous Attempts / Lessons Learned**

   ```markdown
   ### What We Tried
   - Approach A: [What we tried] - [Why it didn't work]
   - Approach B: [What we tried] - [Lessons learned]
   ```

---

## Summary of Changes

✅ **Done:**

- Removed dates/owner from template (git tracks this)
- Created docs/research/ system for investigations
- Clarified future-features vs specs relationship

**Recommended:**

- Archive LLM_TODOS_REVIEW.md or delete (your choice)
- Add enhancements to template (Decision/Context sections)
- Create docs/feature-status.md if you want feature health overview

**Your decision needed:**

- Keep or delete LLM_TODOS_REVIEW.md?
- Create feature-status.md?
- Add the suggested template sections above?

---

## Next Steps

1. Clean up template (remove dates ✅)
2. Create docs/research/ system ✅
3. Handle LLM_TODOS_REVIEW.md (archive or delete?)
4. Update template with enhanced sections? (suggested but optional)
5. Update spec status in README based on your preferences

What's your preference on each?
