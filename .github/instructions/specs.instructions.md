---
name: 'Feature Specs'
description: 'Rules for docs/specs/**/*.md'
applyTo: 'docs/specs/**/*.md'
---

# Feature Specs

Specs are the **design layer** between roadmap themes and implementation.

## Use specs for

- Multi-paragraph design work
- Features with phased rollout or non-trivial constraints
- Examples, trade-offs, open questions, and testing plans

## Do not use specs for

- General backlog parking-lot ideas (`future-features.md`)
- Small action items (`docs/llm-todos.md`)
- The primary statement of near-term priority (`ROADMAP.md`)

## Alignment rules

- Link the relevant roadmap item near the top of the spec when one exists
- If the roadmap direction changes, update the spec status or framing so it does not look more authoritative than the roadmap
- Only implement specs marked `ready-for-implementation`
- If a spec becomes stale, mark it `draft`, `abandoned`, or update it — do not leave it looking current by accident

## Agent-friendly structure

- Put the current status, scope, and relationship to roadmap/future work near the top
- Be explicit about what the spec does **not** decide yet
- Prefer splitting one overgrown spec into two focused specs over mixing multiple unrelated designs into one file
