# Research & Reference Documents

This folder contains research findings, investigations, and reference materials that support spec development and design decisions.

## Purpose

**Why this folder exists:**
When developing specs or making architectural decisions, you often need to:

- Research a technology or RouterOS capability
- Investigate how existing code works
- Explore options before deciding
- Document findings for future reference

**Research reports capture this work** so:

1. Findings aren't lost between sessions
2. Future AI assistants understand the context
3. You can refer back when revisiting decisions
4. Related specs can link to research

## Using Research Documents

### Creating a Research Report

When you need to investigate something:

```markdown
# Research: [Topic]

> **Created:** [Date]  
> **Related Specs:** [Link to specs that depend on this]  
> **Status:** `in-progress` | `complete` | `blocked`

## Question(s) Being Investigated
[What are you trying to learn?]

## Findings
[What did you discover?]

## References
[Links, sources, documentation]

## Implications
[How does this affect design decisions?]

## Next Steps
[What still needs to be investigated?]
```

### Linking from Specs

In a spec's "Design Questions" or "Related," reference research:

```markdown
**Related:**
- Research: [docs/research/certificate-deployment-options.md](../research/certificate-deployment-options.md)
- Spec: [docs/specs/certificate-ux.md](./certificate-ux.md)
```

### Workflow Example

**Scenario:** You want to implement certificate UI but need to understand deployment options first.

1. **Request research:**

   ```
   I need to fill in certificate-ux.md but need to understand:
   - How .mobileconfig works for iOS/macOS
   - Best way to deploy VPN profiles on Windows
   - OpenVPN profile (.ovpn) certificate embedding

   Create research/findings doc so I can make informed design decisions.
   ```

2. **AI creates:** `research/certificate-deployment-options.md`
   - Investigates each option
   - Documents pros/cons
   - Provides examples
   - Identifies limitations

3. **You read findings** and update cert-ux.md with decisions

4. **Update spec status** to `ready-for-implementation`

5. **Keep research doc** for future reference (if certificate format changes, you have context)

## Research Document Lifecycle

```
in-progress → complete → referenced in spec → kept for reference
```

**Keep indefinitely if:**

- Referenced by a spec
- Captures important architectural decision reasoning
- Helps explain "why" in code

**Archive if:**

- Topic becomes obsolete (RouterOS version deprecation, etc.)
- Superseded by newer research
- Spec fully implemented and no longer relevant

## Filing & Organization

Organize by topic or related feature:

```
docs/research/
├── certificate-deployment-options.md
├── routeros-transport-capabilities.md
├── tikoci-integration-opportunities.md
├── app-yaml-schema-properties.md
└── scriptfs-nested-paths.md
```

**Naming:** `[topic].md` - descriptive, lowercase, hyphens

## Best Practices

**For you (user/specifier):**

- Be specific about what you need to understand
- Explain the decision or design issue that prompted the research
- Review findings and update spec accordingly
- Mark research as complete when done

**For AI assistants:**

- Organized, well-sourced findings
- Clear questions → Clear findings
- Link to external sources (RouterOS docs, tech specs, forums)
- Note uncertainties and questions that remain
- Flag any limitations or caveats

---

## Examples

### Example 1: Incomplete Research (Status: in-progress)

```markdown
# Research: RouterOS Transport Constraints

> **Status:** `in-progress`

## Questions
1. Which operations only work over specific transports?
2. Is JSON serialization available over all transports?
3. Are there monitoring/event features requiring Native API?

## Findings So Far
[Partial findings, still investigating...]

## Still Investigating
- [ ] Complete list of SSH-only operations
- [ ] Native API event streaming examples
- [ ] Performance characteristics by transport
```

### Example 2: Complete Research (Referenced by Spec)

```markdown
# Research: Certificate Deployment Formats

> **Status:** `complete`  
> **Related Spec:** [certificate-ux.md](../specs/certificate-ux.md)

## Question
How to deploy certificates to end-user devices from TikBook?

## Findings

### .mobileconfig (iOS/macOS)
- XML-based Apple configuration profile
- Can contain certificates, Wi-Fi profiles, VPN settings
- Signed with developer certificate for enterprise deployment
- Tools: Apple Configurator 2, Manual XML editing
- Limitations: iOS requires MDM for some features

### Windows VPN/Certificate Deployment
- .pbk files for VPN profiles (legacy)
- .ovpn for OpenVPN
- PowerShell scripts recommended for enterprise
- Certificate import via Windows Cert Manager or PS script

### OpenVPN (.ovpn)
- Text-based, can embed certs/keys
- Works cross-platform
- Easy to distribute
- Security: Don't embed private keys in distributed profiles

## Implications for TikBook
1. **Not all formats need wrapping in TikBook** - Some (ovpn) are simple
2. **recommend external tools** for complex formats (.mobileconfig)
3. **Export cert + document how to wrap** might be better than doing wrapping
4. **OpenVPN export + embed is feasible** and high-value

## References
- Apple: https://support.apple.com/guide/mdm/
- OpenVPN: https://openvpn.net/index.php/open-source/documentation/profiles/
- Windows: https://docs.microsoft.com/en-us/windows/win32/rras/ras-vpn-connections
```

---

## Current Research Documents

| Document | Status | Related Spec |
|----------|--------|--------------|
| [findings-on-vscode-container-vm-routeros-chr.md](./findings-on-vscode-container-vm-routeros-chr.md) | complete (initial survey) + experiments in progress | _TBD_ |

Add entries here as research documents are created.

---

## Related

- [docs/specs/README.md](../specs/README.md) - Spec development system
- [DEVELOPMENT.md](../../DEVELOPMENT.md) - Main development guide
