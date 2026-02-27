# RouterOS /app YAML Schema Integration

> **Status:** `draft`  
> **Priority:** `medium`  
> **Effort Estimate:** TBD  
> **Created:** 2026-02-26  
> **Last Updated:** 2026-02-26  
> **Owner:** Awaiting user specification

**Related:**

- Spec: N/A
- Issue: N/A
- Forum: <https://forum.mikrotik.com/t/amm0s-manual-for-custom-app-containers-7-22beta/268036>
- Docs: future-features.md (mentions /app toolkit)

---

## Overview

### What This Feature Does

Provide YAML schema validation for RouterOS `/app` container manifests in VS Code. When users edit YAML files for custom app containers, they get autocomplete, validation, and inline documentation.

### Why We Need It

RouterOS 7.22+ supports custom app containers defined via YAML manifests. Currently, users edit YAML files without validation, leading to errors. Schema support provides:

- Autocomplete for valid properties
- Inline errors for invalid configs
- Documentation hover for each property
- Better developer experience for /app development

### Success Criteria

- [ ] User opens .yaml file for RouterOS /app manifest
- [ ] VS Code recognizes it as RouterOS /app YAML (file detection)
- [ ] RedHat YAML extension provides validation and autocomplete
- [ ] Schema matches RouterOS /app requirements
- [ ] Clear documentation on how to use

---

## Current State

### What Exists Today

**Nothing implemented yet.** This is a net-new feature.

User mentioned priority: "adding the /app JSON schema file to vscode is more important, a UI for it can come later"

### What's Missing

- YAML schema definition file
- Auto-configuration for RedHat YAML extension
- Documentation on how to create /app manifests
- File association patterns

---

## Design Questions

> **USER INPUT NEEDED:** Please fill in this section with your requirements

### Question 1: Schema Source

**Context:** Where should the schema come from?

**Options:**

- Create schema manually based on RouterOS documentation
- Extract schema from RouterOS `/console/inspect`
- Use community-maintained schema (if exists)
- Combine multiple sources

**Decision:** TBD - What's your preference?

### Question 2: Schema Format

**Context:** What format should the schema use?

**Options:**

- JSON Schema (standard for VS Code/RedHat YAML)
- XML Schema Definition (XSD)
- Custom DSL

**Decision:** Likely JSON Schema (most common for VS Code), confirm?

### Question 3: File Detection

**Context:** How should VS Code know a YAML file is for RouterOS /app?

**Options:**

- File naming pattern (e.g., `*.app.yaml`, `app-*.yaml`)
- First-line comment (e.g., `# RouterOS App Container`)
- File location (e.g., in `/app` folder)
- User manually associates via setting

**Decision:** TBD - What pattern makes sense?

### Question 4: Auto-Configuration

**Context:** Should TikBook auto-configure RedHat YAML extension?

**Options:**

- Auto-add schema association on TikBook activation
- Prompt user to add schema association
- Document manual steps only
- Provide command to configure

**Decision:** TBD - User mentioned this should be handled, clarify approach?

### Question 5: Schema Scope

**Context:** What should the schema cover?

**RouterOS /app YAML Properties (preliminary list, verify):**

- `name` - App name
- `version` - App version
- `icon` - App icon URL
- `description` - App description
- `url-path` - Web UI path
- `container` - Container image/config
- ...more properties?

**Decision:** TBD - Provide complete list or link to RouterOS documentation

---

## Requirements

### Functional Requirements

#### Must Have

1. JSON Schema file for RouterOS /app YAML format
2. Schema validation in VS Code when editing /app YAML files
3. Autocomplete for valid properties
4. Inline documentation for each property
5. Error highlighting for invalid values

#### Should Have

1. Auto-configuration of RedHat YAML extension
2. Example /app YAML files
3. Documentation on /app development workflow

#### Could Have (Future)

1. Command to scaffold new
 /app YAML
2. Integration with `/rest/app` endpoint (deploy to router)
3. Validation against running RouterOS version

### Non-Functional Requirements

**Compatibility:**

- Works with RedHat YAML extension (de facto standard)
- VS Code desktop and web
- RouterOS 7.22+ (when /app was introduced)

**Usability:**

- Easy to enable (automatic or one command)
- Clear error messages
- Good developer experience

---

## User Experience

### User Flows

**Flow 1: Create New /app Manifest**

1. User creates `my-app.yaml` file
2. TikBook detects file (via pattern or prompt)
3. RedHat YAML extension activated with RouterOS /app schema
4. User types `name:` → sees autocomplete with description
5. User adds invalid property → sees inline error
6. User hovers property → sees documentation

**Flow 2: Edit Existing Manifest**

1. User opens existing `app.yaml`
2. Schema validation active
3. User makes change
4. Instant feedback on validity

### UI/UX Design

**Commands:**

- `tikbook.app.configureSchema` - Manually enable /app YAML schema

**Settings:**

```json
{
  "routeros.app.autoConfigureSchema": {
    "type": "boolean",
    "default": true,
    "description": "Automatically configure YAML schema for RouterOS /app files"
  }
}
```

**File Patterns:**
> **USER INPUT NEEDED:** What file naming pattern should trigger /app schema?

- `*.app.yaml`?
- `app.yaml` (specific name)?
- Any YAML in `/apps/` folder?

### Examples

**Example 1: Basic /app YAML**

```yaml
# RouterOS App Container
name: my-custom-app
version: 1.0.0
icon: https://example.com/icon.png
description: My custom application
url-path: /my-app
container:
  image: docker.io/myapp:latest
  # ... more container config
```

---

## Implementation Notes

### Architecture

**Components:**

- JSON Schema file (static resource)
- Schema registration in extension.ts
- Optional: Command to configure RedHat YAML extension
- Documentation

**Data Flow:**

```
User edits .yaml file → VS Code detects pattern → Applies schema → RedHat YAML validates
```

### Technical Approach

**Phase 1: Create Schema (TBD hours)**
> **BLOCKED:** Awaiting user specification of schema properties

1. Research RouterOS /app YAML format (docs, examples)
2. Create JSON Schema file
3. Test with example /app YAMLs
4. Refine based on feedback

**Phase 2: Integration (1-2 hours)**

1. Add schema file to extension resources
2. Register schema with VS Code/RedHat YAML
3. Add command for manual configuration
4. Test auto-configuration

**Phase 3: Documentation (1 hour)**

1. Add /app development guide to docs/
2. Update README with /app schema feature
3. Provide example /app YAML files

### Key Implementation Details

**Schema Registration:**

```typescript
// In extension.ts or new app-schema.ts
const schemaUri = context.asAbsolutePath('resources/routeros-app-schema.json');
const schemaConfig = {
  fileMatch: ['*.app.yaml', 'app-*.yaml'], // TBD pattern
  uri: schemaUri
};

// Register with RedHat YAML extension
await vscode.commands.executeCommand('yaml.setSchema', schemaConfig);
```

**JSON Schema Template:**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "RouterOS App Container",
  "description": "Schema for RouterOS custom app container manifests",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Unique name for the app"
    },
    "version": {
      "type": "string",
      "description": "App version (semver recommended)"
    },
    // ... more properties per user spec
  },
  "required": ["name", "version"]
}
```

### Dependencies

**Required Before Implementation:**

- [ ] User specification of complete /app YAML schema
- [ ] RouterOS /app documentation reference
- [ ] File pattern decision
- [ ] Example /app YAML files

**Nice to Have:**

- [ ] RedHat YAML extension installed (recommend in extensionpack)

---

## Testing Strategy

### Unit Tests

- Schema validation against known-good /app YAML examples
- Schema catches known-bad /app YAML examples

### Integration Tests

- Schema registration works
- File pattern detection works
- Auto-configuration works

### Manual Testing

- Create new /app YAML → schema validates correctly
- Edit existing /app YAML → autocomplete works
- Deploy validated YAML to RouterOS → works as expected

---

## Rollout Plan

### Feature Flags

- [ ] Experimental
- [x] Stable (when schema validated against RouterOS)

### Documentation Updates

- [ ] Add docs/app-development-guide.md
- [ ] Update README.md with /app schema feature
- [ ] Update CHANGELOG.md

---

## Open Issues & Risks

### Risks

- **Risk: RouterOS /app format undocumented or changes frequently**
  - Impact: High (schema becomes outdated)
  - Mitigation: Version schema alongside RouterOS versions

### Unresolved Questions

- [ ] Complete /app YAML property list
- [ ] Required vs optional properties
- [ ] File detection pattern
- [ ] Auto-configuration behavior

---

## Notes / Scratchpad

**USER: Please add your notes here**

Requirements to fill in:

1. Complete list of /app YAML properties (or link to docs)
2. Example /app YAML file (working example)
3. File naming pattern preference
4. Auto-configuration preference (auto, prompt, manual)
5. Any RouterOS version-specific differences in /app format

**Resources:**

- Forum post: <https://forum.mikrotik.com/t/amm0s-manual-for-custom-app-containers-7-22beta/268036>
- RouterOS docs: [Link to official /app documentation when available]
- Example apps: [Link to examples if exist]

**Next Steps:**

1. User fills in schema property list
2. User provides example YAML
3. Change status to `ready-for-implementation`
