# SARB Review Artifacts

This folder stores SARB review aids and decision records for the agentic toolchain. Use these to codify expectations for both humans and LLM agents.

Single source of truth: docs/ is canonical, including this folder.

## Files in docs/sarb/

- code-review-checklist.md - Quick review steps for extension changes.
- decision-log.md - SARB decisions and rationale (why choices were made).
- README.md - This file.

## Related docs (canonical reference)

- [architecture.md](../architecture.md) - Key architectural decisions, component relationships, and design rationale.
- [conventions.md](../conventions.md) - Coding patterns, naming conventions, and style guidance specific to TikBook.
- [sarb-instructions.md](../sarb-instructions.md) - Detailed SARB expectations and reference sources.
- [llm-todos.md](../llm-todos.md) - Task tracking and constraints for LLM agents.
- [future-features.md](../future-features.md) - Future capabilities and decision points.

## Guidance

- Keep entries actionable and easy to scan.
- Link to source files or issues when possible.
- Update decision-log.md when SARB expectations change.
- Update docs/ when architecture or code patterns change.
- Refer to docs/architecture.md and docs/conventions.md for authoritative guidance.
