---
name: 'Planning Docs'
description: 'Scope rules for ROADMAP.md, docs/llm-todos.md, and docs/future-features.md'
applyTo: 'ROADMAP.md,docs/llm-todos.md,docs/future-features.md'
---

# Planning Docs

Use these files as a **layered planning system**, not as competing backlogs.

## Source-of-truth split

- **`ROADMAP.md`** — near-term themes and the first place to look for what matters next
- **`docs/llm-todos.md`** — small, agent-startable tasks with clear scope
- **`docs/future-features.md`** — long-horizon, blocked, or still-vague ideas

## Promotion flow

1. `future-features.md` → becomes likely near-term → summarize or move into `ROADMAP.md`
2. `ROADMAP.md` → needs design depth → create or update a spec in `docs/specs/`
3. `ROADMAP.md` / spec → contains a small concrete slice → add that slice to `docs/llm-todos.md`

## Anti-duplication rules

- Give each idea **one primary home**
- If an item appears in multiple docs, each copy must serve a different role:
  - roadmap = direction
  - spec = design
  - llm-todos = actionable slice
  - future-features = deferred/blocked context
- Do not leave the same item as a full description in both `ROADMAP.md` and `future-features.md`

## Editing guidance

- When a plan changes, update the stale document instead of silently relying on the newer one
- Prefer adding a short "why this moved" note over keeping duplicate detail in both places
- Keep the hierarchy obvious enough that an agent can choose the right file quickly
