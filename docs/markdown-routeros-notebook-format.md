# Markdown RouterOS Notebook Format Specification

This document defines the serialization and structure for the Markdown RouterOS notebook format (`.rsc.md`, `.rscmd`). This is the single source of truth for this format and must be kept in sync with the implementation in `notebook.ts`.

## Format Overview

- **File type:** Markdown (`.md`-compatible)
- **Cell types:**
  - **Markup cell:** Markdown (default)
  - **Code cell:** Fenced code block with language `routeros`
- **Cell boundaries:**
  - Each ` ```routeros ` code fence starts a code cell
  - `[//]: #.` (on a line by itself) can be used to force a cell break in Markdown
- **Example:**

````markdown
# Example Markdown RouterOS Notebook

This is a markdown cell.

```routeros
/ip/address/print
```

[//]: #.

## More Markdown

- List item

```routeros
:global foo "bar"
```
````

## Parsing and Serialization Rules

- Markdown is preserved as-is between code cells
- Code cells are delimited by triple backticks and `routeros` language
- `[//]: #.` is optional for explicit cell breaks between Markdown cells
- No outputs or metadata are persisted (future: see planned extensions)

## Planned Extensions

- **Cell metadata:**
  - Mark cell as "skip" (not executed in Run All)
  - Persist cell output
  - Per-cell tags/attributes
- **File metadata:**
  - Notebook-level settings (e.g., default timeout)

**Any changes to the notebook serialization or schema must be reflected in this document.**

---

See also: [tikbook-notebook-format.md](./tikbook-notebook-format.md), [README.md](../README.md), [notebook.ts](../src/notebook.ts)
