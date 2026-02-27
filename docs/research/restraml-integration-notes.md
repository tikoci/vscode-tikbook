# Research: restraml Integration Notes for ScriptFS and Virtual Docs

> **Created:** 2026-02-27  
> **Related Specs:** [scriptfs-completion.md](../specs/scriptfs-completion.md)  
> **Status:** `complete`

## Questions Investigated

1. What does `tikoci/restraml` provide that can help ScriptFS now?
2. How can `inspect.json` support future RouterOS virtual filesystem expansion?
3. What caveats should be documented before using restraml schema artifacts in TikBook?

## Findings

### What restraml Provides

From `tikoci/restraml` README and website:

- Downloadable RouterOS schema artifacts by version (`RAML`, `HTML`, `OAS2`, `inspect.json`)
- `inspect.json` is an intermediate dataset generated from RouterOS `/console/inspect`
- Website includes diff tooling that compares command/attribute changes between RouterOS versions
- Separate base vs `+extra` package coverage for schemas

### How restraml Is Generated

- `rest2raml.js` uses RouterOS REST and `/console/inspect` traversal to collect command/attribute metadata
- The collected data can be persisted as `inspect.json`
- RAML/OAS/HTML are generated from this intermediate dataset

### Important Caveat (Critical)

restraml README explicitly notes generated schema is convenience-focused, not strict validation:

- Required/optional semantics are not fully represented
- Generated schema may over-advertise available attributes
- Runtime RouterOS behavior remains source of truth for operation validity

## Implications for TikBook

### ScriptFS (Near-term)

- Use restraml `inspect.json` as a discovery aid (coverage planning, path candidates)
- Do **not** use restraml artifacts as sole authority for create/update validity
- Keep per-path support explicitly defined in `src/scriptfs-schema.ts`
- Validate operations against live RouterOS behavior in tests

### URL Scheme and Path Contract

For `rscfile://` stability, restraml supports these goals indirectly:

- Version-aware discovery of command/attribute changes
- Early warning when RouterOS path/attribute surface evolves
- Better planning for future expansion beyond script-only resources

But URL contract must be owned by TikBook and remain deterministic regardless of upstream schema format changes.

### Virtual Docs (`rscena://`) Rationalization

- `rscena://` should remain read-only/generated transformation surface
- ScriptFS `rscfile://` should remain canonical editable resource identity
- restraml data can support contextual views and Copilot assistance in virtual docs without conflating write semantics

### Broader RouterOS VFS Expansion

Potential future path:

1. Keep ScriptFS as script-attribute slice
2. Introduce generalized RouterOS VFS model for non-script resources (`/file`, other typed resources)
3. Reuse restraml diffs to identify new coverage opportunities per RouterOS version

## Suggested Follow-up Work

1. Add a small tooling note in ScriptFS spec: “restraml is discovery, RouterOS runtime is truth.”
2. Add optional dev utility to compare `scriptfs-schema.ts` paths against a selected restraml `inspect.json` snapshot.
3. Define URI contract tests before broadening to non-script resources.

## References

- GitHub repository: <https://github.com/tikoci/restraml>
- Website/downloads: <https://tikoci.github.io/restraml/>
- README (raw): <https://raw.githubusercontent.com/tikoci/restraml/main/README.md>
