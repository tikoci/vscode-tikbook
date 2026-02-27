# TikBook Notebook Format Specification

This document is the single source of truth for the serialization and structure of TikBook notebooks. It covers both supported formats:

- **RouterOS TikBook Notebook** (`.md.rsc`, `.tikbook`)
- **Markdown RouterOS Notebook** (`.rsc.md`, `.rscmd`)

## 1. RouterOS TikBook Notebook Format (`.md.rsc`, `.tikbook`)

- **File type:** Plain text, primarily RouterOS script, with Markdown and cell boundaries encoded as comments.
- **Cell types:**
  - **Code cell:** RouterOS script (default)
  - **Markup cell:** Markdown, encoded as comment blocks
- **Cell boundaries:**
  - `#.` (on a line by itself) marks the end of a cell
  - `#.markdown` (on a line by itself) marks the start of a Markdown cell
- **Example:**

```
#.markdown
#  # Example TikBook Notebook
#  This is a markdown cell.
#.

/ip/address/print
#.

#.markdown
#  ## More Markdown
#  - List item
#.

:global foo "bar"
#.
```

- **Notes:**
  - All lines in a Markdown cell are prefixed with `#  ` (commented)
  - Code cells are plain RouterOS script
  - No outputs or metadata are persisted (future: see planned extensions)

## 2. Markdown RouterOS Notebook Format (`.rsc.md`, `.rscmd`)

- **File type:** Markdown, with RouterOS code cells as code fences
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

- **Notes:**
  - Markdown is preserved as-is
  - Code cells are delimited by triple backticks and `routeros` language
  - `[//]: #.` is optional for explicit cell breaks
  - No outputs or metadata are persisted (future: see planned extensions)

## 3. Planned Extensions (for both formats)

- **Cell metadata:**
  - Ability to mark a cell as "skip" (not executed in Run All)
  - Ability to persist cell output
  - Per-cell tags or attributes
- **File metadata:**
  - Notebook-level settings (e.g., default timeout)

**Any changes to the notebook serialization or schema must be reflected in this document.**

---

See also: [README.md](../README.md), [notebook.ts](../src/notebook.ts)
