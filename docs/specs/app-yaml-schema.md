# RouterOS `/app` YAML Schema Integration

> **Status:** `implemented`  
> **Priority:** `high`  
> **Effort:** First slice complete; follow-ups tracked separately  
> **Created:** 2026-02-26  
> **Last Updated:** 2026-04-26  
> **Owner:** Theme 4 implementation

**Related:**

- Roadmap: [Theme 4: `/app` YAML JSONSchema + Monaco parity with tikapp.html](../../ROADMAP.md#theme-4-app-yaml-jsonschema--monaco-parity-with-tikapphtml)
- User guide: [RouterOS `/app` YAML manifests](../routeros-app-yaml.md)
- Future-feature context: [RouterOS `/app` YAML Schema Verification](../future-features.md#routeros-app-yaml-schema-verification)
- Forum reference: [Amm0's manual for custom app containers](https://forum.mikrotik.com/t/amm0s-manual-for-custom-app-containers-7-22beta/268036)

---

## Overview

TikBook provides native VS Code editing support for RouterOS `/app` YAML manifests. The first implementation round makes real YAML files pleasant to edit: schema validation, completions, hover text, low-noise RouterOS-specific warnings, and scaffolds.

This spec replaces the older placeholder that asked where the schema and file patterns should come from. Those decisions are now made by `ROADMAP.md` Theme 4 and `tikoci/restraml`.

## Source of truth

- Schema source: generated JSON Schemas from `tikoci/restraml`.
- Editor UX reference: `~/GitHub/restraml/docs/tikapp.html` and its Monaco schema/completion behavior.
- Runtime facts:
  - `/app` command tree appears in RouterOS 7.21.
  - Custom YAML app creation is RouterOS 7.22+.
  - `/app` depends on the `container` package and container device-mode support.
  - Practical deployments require supported architecture (`arm64` or `x86` for this feature scope), enough RAM, and preferably external storage.

## Decisions

### Schema variants

Use two schema variants with different jobs:

| Variant | Use in TikBook | Why |
|---|---|---|
| `*.editor.json` | Default VS Code YAML association | Keeps completions useful by avoiding strict regex patterns that suppress suggestions. |
| `*.latest.json` | CI/manual strict validation and optional strict mode | Enforces tighter port-string and environment-name rules. |

The user guide lists the current schema URLs and `# yaml-language-server: $schema=...` examples.

### Dependency

TikBook should recommend or bundle support through Red Hat YAML (`redhat.vscode-yaml`). It should be an `extensionPack` recommendation rather than a hard `extensionDependencies` requirement so TikBook degrades gracefully if the YAML extension is missing.

### File detection

Do not claim every `app.yaml` in a workspace. Use conservative patterns:

- Single app: `*.tikapp.yaml`, `*.tikapp.yml`, `*.app.yaml`, `*.app.yml`, `**/{app,apps,tikapp}/app.{yaml,yml}`
- App store: `*.tikappstore.yaml`, `*.tikappstore.yml`, `*.appstore.yaml`, `*.appstore.yml`, `**/{app,apps,tikapp}/app-store.{yaml,yml}`

Keep files as language id `yaml`; Red Hat YAML owns parsing and schema validation.

### Strictness model

Default editing should favor completion quality. Strict checks should be opt-in through a command, setting, CI guidance, or per-file `$schema` header. TikBook-specific diagnostics can warn about RouterOS requirements that the editor schema intentionally leaves permissive.

## Functional requirements

### First implementation round

1. Bundle or fetch the current restraml app and app-store schemas.
2. Register editor-friendly schemas for the file patterns above.
3. Add `redhat.vscode-yaml` to extension recommendations/packaging without making TikBook unusable if it is absent.
4. Add native VS Code providers, scoped only to matching YAML files, for:
   - schema-derived completions that preserve Monaco parity where Red Hat YAML is insufficient;
   - hover/inlay help for important `/app` fields;
   - low-noise diagnostics for root-shape mistakes, device-mode-sensitive fields, and optionally relaxed port strings.
5. Add commands for a new single-app manifest and a new app-store manifest.
6. Document the workflow and manual schema override path.

This round is implemented. Rich built-in example browsing remains a follow-up.

### Out of scope for first round

- Deploying YAML to a router through `/rest/app`.
- Live connected-router readiness checks.
- Full browser/webview clone of `tikapp.html`.
- MCP/WebMCP integration.
- Treating `/app` YAML as docker-compose-compatible.

## UX requirements

Users should be able to:

1. Create `my-service.tikapp.yaml` or `apps/app.yaml`.
2. See YAML validation and completions without manually finding the schema URL.
3. Override the schema with a `$schema` header for strict or pinned validation.
4. Create a starter manifest from a TikBook command.
5. Read concise warnings that RouterOS custom apps require RouterOS 7.22+, the container package, container device-mode when devices are used, and enough storage/RAM.

## Implementation notes

- Prefer static YAML schema contributions when possible; fall back to configuration defaults only if the contribution point cannot express the needed local schema/file-match behavior.
- Keep schema assets in a package-included location such as `resources/schemas/`.
- Add a sync script for refreshing schema assets from restraml, but do not require network access at runtime.
- Keep provider helpers pure and unit-testable: file matching, schema walking, suggestion extraction, root-shape diagnostics, and port/device warnings.
- If built-in example browsing from restraml `app.json` grows too large, ship scaffold commands first and track the example browser as a deferred quick task.

## Testing strategy

Automated tests should cover:

- app/store file pattern matching;
- schema assets exist and expose expected top-level requirements/enums;
- package contributions recommend `redhat.vscode-yaml` and register schema associations;
- root object vs root array diagnostics;
- device-mode warning detection;
- strict-vs-editor schema selection behavior when implemented.

Manual checks should include opening `.tikapp.yaml` and `.tikappstore.yaml` files in VS Code desktop and VS Code for Web with Red Hat YAML installed.

## Deferred follow-ups

Track concrete deferred work in [docs/llm-todos.md](../llm-todos.md#routeros-app-yaml-dev-workflow--ready-for-implementation), including:

- live connected-router `/app` readiness checks;
- a strict validation command or version-specific schema selector;
- a richer built-in app example browser;
- future MCP/WebMCP parity after TikBook's MCP direction lands.
