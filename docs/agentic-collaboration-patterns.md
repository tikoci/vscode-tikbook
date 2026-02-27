# Agentic Collaboration Patterns

**Meta-documentation:** Lessons learned about AI-assisted spec refinement and development workflows.

**Context:** This document captures insights from the CHR Test Environment specification process (Feb 2026), where we tested iterative Q&A-driven spec refinement as an experiment in improving AI/human collaboration.

---

## Pattern 1: One-Question-at-a-Time Refinement

### What We Did

Instead of asking 10+ questions in bulk, asked one question, got answer, re-prioritized remaining questions based on what we learned, repeat.

### Why It Worked

- **Follow-on questions resolved themselves** - Settings scope question answered workspace question
- **Context built incrementally** - Each answer informed next question priority
- **No wasted effort** - Didn't ask questions that became irrelevant after earlier answers
- **User cognitive load lower** - One focused decision at a time vs 10 simultaneous choices

### When to Use

- Spec review/clarification phase
- Complex design with interdependent decisions
- When answers might change question priorities
- When building shared understanding incrementally

### Implementation

- Use `ask_questions` tool with single question
- After answer: re-evaluate remaining questions
- Document pattern in conversation so user understands approach
- Track "questions asked" vs "questions resolved by inference"

### Metrics from CHR Session

- 22 questions total (12 initial + 10 follow-up)
- ~5-7 questions avoided by inference from earlier answers
- Zero "I already told you that" moments
- User feedback: "This is working well"

---

## Pattern 2: Spec Quality Over Time Estimates

### What We Learned

User explicitly said: **"Don't estimate hours—spec quality matters more; time is driven by how well the spec is written."**

### Why It Matters

- Bad specs → constant clarification during implementation → multiplies time
- Good specs → smooth implementation → faster overall despite longer spec phase
- AI agents often rush to estimate without validating assumptions
- Hour estimates create artificial pressure to "finish" spec prematurely

### New Approach

- Focus: "Is this spec clear enough to implement without back-and-forth?"
- Defer time estimates until spec validated
- Make effort estimates relative ("Phase 1 = X, Phase 2 = 2X"), not absolute hours
- Prioritize experiments to validate risky assumptions before estimating

### Application to Future Specs

1. Review spec for ambiguities
2. Clarify via iterative Q&A
3. Document decisions explicitly
4. Run validation experiments
5. **Then** estimate implementation effort (now informed by clearer scope)

---

## Pattern 3: Homework-Driven Research

### What We Did

During Q&A, identified knowledge gaps:

- "How is GitHub API used in codebase?" → Research [src/remote.ts](../src/remote.ts)
- "What is mikropkl format exactly?" → Fetch <https://github.com/tikoci/mikropkl>

### Why It Worked

- **Grounded decisions in reality** - Not guessing about GitHub API patterns
- **Validated feasibility** - Confirmed existing code could be extended
- **Specific answers** - Not "probably axios", but "line 36-86 has exact pattern"
- **Reduced implementation risk** - Knew approach would work before coding

### When to Use

- User asks "How should we..." questions requiring codebase context

---

## Pattern 4: Documentation vs Chat Communication

### The Learning

From Phase 1 CHR implementation: Created `phase1-implementation-review.md` as a document when it "could have been an email" (chat message).

### Key Insight

**User feedback:** "Documentation should be for future reference, not process reporting. Process summaries belong in chat."

### When to Create Documentation

**YES - Create a doc when:**

- Future developers need to understand WHY decisions were made
- It's a reference for similar future work (e.g., architecture.md, conventions.md)
- It captures reusable patterns (e.g., this file)
- It's user-facing (README, CHANGELOG, specs marked ready-for-implementation)
- It contains commands/steps that user will run repeatedly

**NO - Just report in chat when:**

- Summarizing what you just implemented (user saw you do it)
- Reporting test results ("compilation passed, tests green")
- Status updates during implementation ("finished Phase 1a, starting 1b")
- Internal process notes that don't have future reference value
- Implementation reviews of code you just wrote

### When to Ask User for Verification

**YES - Ask user to review when:**

- **UI/UX changes** - You can't see visual output (colors, layout, spacing)
- **Behavioral verification** - "Does this match your workflow?"
- **Design decisions** - "Should this be a setting or hardcoded?"
- **Manual testing** - "Can you test the VM creation flow?"
- **Spec ambiguity** - "Do you want X or Y approach?"

**NO - Don't ask user to verify when:**

- **Compilation status** - You already ran `npm run compile`
- **Test results** - You already ran tests and they passed
- **Lint errors** - You already ran eslint and fixed issues
- **Code patterns** - You can compare with existing files yourself
- **File structure** - You can verify with `ls` or file_search

### Example Workflow

**Phase 1 (No UI):**

```typescript
// ✅ GOOD
"Phase 1 complete. All code compiles, tests pass, ready for Phase 2."

// ❌ UNNECESSARY
"Phase 1 complete. Here's a 200-line implementation-review.md. 
Please verify:
- [ ] Code compiles (I already checked)
- [ ] Tests run (I already ran them)
- [ ] Files exist (I created them)"
```

**Phase 2 (With UI):**

```typescript
// ✅ GOOD
"Phase 2 complete. New Explorer view shows CHR VMs with version badges.
Can you review the UI?
- Does the tree structure make sense?
- Are icons/colors clear?
- Any layout issues?"

// ❌ MISSING OPPORTUNITY
"Phase 2 complete. Everything works. Moving to Phase 3."
// (User can't see if UI is actually good!)
```

### Application to Future Work

1. After implementation: Brief chat summary (2-3 sentences)
2. If no UI: Report results, move forward
3. If UI exists: Ask user to review visual/UX aspects
4. Create docs only for future reference value

### Build Verification is Mandatory

**Learning from Phase 2 implementation:** User pointed out that asking them to test without ensuring `npm run compile` succeeds wastes their time.

**Why compilation must succeed before user testing:**

- User's primary test workflows:
  - Press F5 → "Run Extension" window opens
  - Open Testing sidebar → Run tests in GUI
- Both are blocked if `npm run compile` fails
- User cannot use VS Code's built-in debugging/testing features if build is broken

**Pre-user-test checklist:**

1. ✅ Run `npm run compile` → Must exit with code 0
2. ✅ Fix all lint errors (warnings OK)
3. ✅ Run `npm run compile:test` → Ensures GUI Test Runner works
4. ✅ Verify `out/extension.js` exists and is recent
5. ✅ Verify .vscode/tasks.json has `"label": "compile"` (for F5 launch)
6. **Then** ask user to test

**Bad example:** "Phase 2 complete! Can you test the UI?" (but compile has errors)
**Good example:** "Phase 2 complete. Compiled cleanly, tests built. Can you test the UI?"

**Common issue:** "Could not find the task 'compile'" when pressing F5

- launch.json expects `preLaunchTask: "compile"`
- tasks.json must have explicit `"label": "compile"` on npm task
- Without label, VS Code auto-names it "npm: compile" (mismatch)

### Related Decisions

- `docs/phase1-verification-guide.md` - Good intent (checklist format), but premature (no UI to verify)
- Future: Save verification guides for phases with user-testable features
- Implementation reviews: Keep in chat, add to decision-log.md only if architectural choice was significant
- Design decisions depend on external system capabilities
- Uncertainty about existing patterns/conventions
- Before experiments that assume specific capabilities

### Implementation Pattern

1. Identify knowledge gap during Q&A
2. Pause clarifications: "Let me research X before we continue"
3. Use grep_search, read_file, fetch_webpage to investigate
4. Document findings with specific file/line references
5. Resume Q&A with validated answers

---

## Pattern 4: Experiment Dependencies Before Implementation

### What We Discovered

Originally: Experiments listed chronologically (1, 2, 3)
Revised: Experiments reordered by dependency chain (GitHub → Architecture → IP)

### Why Order Matters

- GitHub releases must be fetchable before architecture selection can work
- Architecture detection depends on release metadata format
- IP detection is lowest priority (has fallback path)

### Improved Approach

- **Map dependencies explicitly** - "Experiment 2 needs output from Experiment 1"
- **Prioritize by risk** - High-risk assumptions get validated first
- **Allow parallel work** - Independent experiments can run concurrently
- **Clear exit criteria** - "Result: X function exists" not "Experiment done"

### Application Pattern

When spec includes experiments:

1. List all validation needs
2. Map dependencies between them
3. Reorder by critical path
4. Document what each must produce (not just "validate X")
5. Note which can be deferred or run in parallel

---

## Pattern 5: Clarification Capture Strategy

### What We Did

Created `docs/specs/chr-implementation-notes.md` to freeze Q&A insights before starting experiments.

### Why Separate Document

- **Spec is canonical** - Remains clean, structured
- **Notes are transient** - Just for this implementation sprint
- **Different audiences** - Spec for all developers; notes for current work
- **Faster iteration** - Can update notes without spec review overhead

### When to Use

- After intensive Q&A session (10+ questions)
- Before starting experiments/implementation
- When decisions are locked but spec prose update would be slow
- To capture "implementation details" vs "design specification"

### Document Structure

```markdown
# [Feature] Implementation Notes

**Context:** Q&A session date, purpose

## Critical Clarifications
1. Decision area
   - What was clarified
   - Code references
   - Action items

## Experiment Priorities
- Reordered list with dependencies

## Deferred Decisions
- What to revisit after experiments

## Notes for Implementation
- Code patterns to follow
- Dev requirements
- Workflow targets
```

---

## Pattern 6: File Update Pragmatism

### What Happened

- Q&A complete, all decisions captured
- Attempted to merge clarifications into spec prose
- Hit technical issues with exact text matching (whitespace sensitivity)
- Recognized: Logical work complete, file sync is mechanical

### Lesson Learned

**Don't let document formatting block forward progress.**

When:

- All decisions captured in Q&A or notes
- File updates are "nice to have" for consistency
- Next phase (experiments) can proceed without perfect docs

Then:

- Create separate notes document (done)
- Mark spec section as "see notes for details"
- Continue to implementation
- Clean up docs in parallel or after experiments validate approach

### Anti-Pattern to Avoid

❌ Spending 30 minutes on file replacements when:

- Work is logically complete
- Decisions are documented elsewhere
- Implementation can proceed

✅ Better: Defer mechanical updates, validate with experiments first

---

## Pattern 7: Process as Experiment Mindset

### Meta-Learning

User explicitly stated: **"Recall we're testing our process (instructions/docs/copilot) here too as an experiment."**

### What This Means

- Document **how** we work, not just **what** we build
- Capture AI collaboration patterns that work well
- Identify friction points in agentic workflows
- Update instructions based on empirical evidence

### Application

- Create `docs/agentic-collaboration-patterns.md` (this file)
- Reference from `.github/copilot-instructions.md` when pattern applies
- Update after each major feature/spec to capture learnings
- Share patterns across projects (not TikBook-specific)

### Future Sessions Should Capture

- What worked well (replicate)
- What caused friction (improve)
- What assumptions were wrong (validate earlier)
- Tool usage patterns that emerged (codify)

---

## Tool Usage Insights

### `ask_questions` Tool - Best Practices

✅ **Works well:**

- Single question at a time (unless truly independent)
- 2-4 options per question (easy to scan)
- Clear "recommended" option when agent has preference
- Descriptive text explaining **why** we're deciding

❌ **Avoid:**

- Batch questions when answers might cause re-prioritization
- Too many options (6+ becomes overwhelming)
- Marking "recommended" for quizzes/polls (reveals answers)

### Research Tools - Patterns That Worked

1. **grep_search before read_file** - Find relevant sections first, then read precisely
2. **fetch_webpage for external docs** - Don't guess API formats, verify
3. **Parallel reads when independent** - Multiple file sections at once
4. **One search, targeted results** - "GitHub API" found [src/remote.ts](../src/remote.ts) immediately

### File Update Tools - Lessons

- Exact text matching is fragile (whitespace, line breaks)
- Need 3-5 lines context before/after for uniqueness
- When multiple attempts fail: Consider if file update is blocking
- Alternative: Create separate notes file, defer mechanical sync

---

## Checklist for Future Spec Refinement

### Before Q&A Phase

- [ ] Read spec completely
- [ ] Identify ambiguous sections
- [ ] Note assumptions that need validation
- [ ] Group questions by topic area

### During Q&A Phase

- [ ] Ask one question at a time (unless independent)
- [ ] Re-prioritize after each answer
- [ ] Document pattern so user understands approach
- [ ] Track resolved vs inferred answers
- [ ] Pause for homework/research when needed

### After Q&A Phase

- [ ] Create implementation notes document
- [ ] Capture critical clarifications with code references
- [ ] Map experiment dependencies
- [ ] Document deferred decisions
- [ ] Mark logical work complete even if file updates pending

### Before Implementation

- [ ] Validate risky assumptions via experiments
- [ ] Sequence experiments by dependency
- [ ] Define clear success criteria for each experiment
- [ ] Ready to code: specs clear, research done, approach validated

---

## Recommended Copilot Instructions Updates

Based on this experiment, suggest adding to `.github/copilot-instructions.md`:

### New Section: Spec Refinement Workflow

```markdown
## Spec Refinement Pattern (Iterative Q&A)

When reviewing specifications:
1. Read spec completely first
2. Ask clarifying questions **one at a time** (not bulk)
3. Re-prioritize remaining questions after each answer
4. Pause for research/homework when decisions need code context
5. Create implementation notes doc to freeze decisions
6. Validate risky assumptions via experiments before implementing
7. Focus on spec quality over time estimates

See [docs/agentic-collaboration-patterns.md](../docs/agentic-collaboration-patterns.md) for detailed patterns.
```

### Addition to Workflow Checks

```markdown
- Before estimating effort: Validate spec clarity via Q&A and experiments
- When homework research needed: Use grep_search/read_file/fetch_webpage to ground decisions
- After intensive Q&A: Create implementation notes doc (freeze decisions before experiments)
```

---

## Future Improvements to Test

### 1. Experiment Templates

Create template for validation experiments:

- What assumption are we testing?
- What code/system is involved?
- Success criteria (specific output/behavior)
- Exit condition (when can we stop?)
- How will result inform implementation?

### 2. Decision Log Integration

During Q&A, automatically log decisions to `docs/sarb/decision-log.md`:

- Record decision point
- Options considered
- Selected approach
- Rationale (from Q&A)

### 3. Spec Review Checklist

Create automated checklist to catch common ambiguities:

- Are settings scoped clearly (user vs workspace)?
- Is error handling specified (UI pattern, retry logic)?
- Are platform differences documented (macOS vs Linux)?
- Do success criteria have measurable outcomes?
- Are deferred features explicitly listed?

### 4. Research Homework Workflow

Standardize research pattern:

1. Create `docs/research/[topic].md` file
2. Document questions, findings, code references
3. Link from spec: "See research/[topic].md"
4. Archive after implementation

---

## Session Metrics (CHR Spec Refinement)

**Duration:** ~4-5 hours of Q&A + research
**Questions asked:** 22 (12 initial + 10 follow-up)
**Questions avoided by inference:** ~5-7
**Research tasks:** 2 (GitHub API, mikropkl format)
**Documents created:** 2 (implementation notes, this patterns doc)
**Experiments defined:** 3 (with dependencies mapped)
**Implementation risk reduced:** High → Medium (validated approach before coding)

**User feedback:** Positive on one-at-a-time pattern, quality-over-speed focus

**Token usage:** High (summary triggered), but work was logically complete

**Outcome:** Ready to start experiments with clear requirements, validated approach, documented decisions.

---

## Related Documentation

- [docs/sarb-instructions.md](sarb-instructions.md) - SARB coding standards (separate concern)
- [docs/conventions.md](conventions.md) - Code patterns (implementation-level)
- [docs/sarb/decision-log.md](sarb/decision-log.md) - Architectural decisions (append-only)
- [.github/copilot-instructions.md](../.github/copilot-instructions.md) - Copilot guidance (should reference this)

**Status:** Living document - update after each major spec refinement session
