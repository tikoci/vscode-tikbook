# SARB Decision Log

Record brief decisions and rationale here to reduce future rework.

- 2026-02-25: Use .github/instructions/ pattern for context-specific Copilot rules - Aligns with VS Code best practices; allows language/component-specific conventions alongside main copilot-instructions.md; scales better than single file; supports file-specific rules via applyTo patterns.
- 2026-02-25: Populate tools/SARB/ with standard artifacts (review-checklist.md, decision-log.md) and move architecture/conventions to docs/ - Codifies design and review expectations; establishes docs/ as single source of truth for all developer guidance.
- 2026-02-25: Consolidate documentation to docs/ with lowercase/kebab-case naming - Reduces duplication (docs/, tools/SARB/, .github/instructions/); establishes clear hierarchy (docs = source, tools/SARB/ = review artifacts, .github/instructions/ = Copilot automation); improves discoverability.
- 2026-02-25: Add exemplary pattern documentation for agentic TypeScript/RouterOS development - Comprehensive guides for TypeScript patterns (extensible records, type narrowing), RouterOS integration (REST API, versioning, error handling, credentials), code review checklist, and routeros-integration.instructions.md; enables Copilot to generate production-ready code with minimal human review.
- YYYY-MM-DD: <decision> - <short rationale>
