# RouterOS Certificate Management UX

> **Status:** `draft`  
> **Priority:** `medium`  
> **Effort Estimate:** TBD  
> **Created:** 2026-02-26  
> **Last Updated:** 2026-02-26  
> **Owner:** Awaiting user specification

**Related:**

- Spec: N/A
- Issue: N/A
- Docs: future-features.md (mentions certificate UX)

---

## Overview

### What This Feature Does

Provides VS Code UI to manage RouterOS certificates: view, import, export, delete, and wrap for deployment to end-user devices.

### Why We Need It

Certificate management in RouterOS RouterOS currently requires CLI or WebFig. VS Code integration would enable:

- View all certificates from VS Code
- Import certificates (.pem, .crt files) easily
- Export certificates for backup
- Wrap certificates for deployment (e.g., .mobileconfig for iOS/macOS)
- Integrated workflow with other TikBook features

### Success Criteria

- [ ] User can view all certificates on router
- [ ] User can import certificates from local files
- [ ] User can export certificates to local files
- [ ] User can delete certificates
- [ ] User can wrap certificates for deployment (optional)
- [ ] Clear UX, minimal steps

---

## Current State

### What Exists Today

**Nothing implemented yet.** This is a net-new feature.

User mentioned: "i'd need to spec out the certificate ux better so it's not very actionable"

### What's Missing

- UI design (treeview, panel, commands?)
- Certificate operations (import, export, delete)
- Deployment wrapping (mobileconfig, etc.)
- Integration with system credential storage

---

## Design Questions

> **USER INPUT NEEDED:** Please fill in this section with your vision for certificate UX

### Question 1: UI Structure

**Context:** How should users interact with certificates?

**Options:**

- **TreeView in Explorer:** Show certificates in sidebar tree
  - Pros: Always visible, familiar pattern
  - Cons: Takes up space, limited detail view
  
- **Webview Panel:** Custom UI panel with table/details
  - Pros: Rich UI, more space
  - Cons: More complex, requires HTML/CSS

- **Command Palette Only:** Commands for each operation, no persistent UI
  - Pros: Simple, low complexity
  - Cons: Less discoverable, no overview

- **Quick Pick UI:** Native VS Code quick pick with inline actions
  - Pros: Native, good UX
  - Cons: Limited for complex operations

**Decision:** TBD - What fits your vision?

### Question 2: Certificate Operations

**Context:** Which operations should be supported?

**Common Operations:**

- View/list all certificates
- View certificate details (expiry, subject, issuer, fingerprint)
- Import certificate from file (.pem, .crt, .pfx, .p12)
- Export certificate to file
- Delete certificate
- Mark certificate as trusted
- Assign certificate to service (www-ssl, api-ssl, etc.)

**Advanced Operations:**

- Generate CSR (Certificate Signing Request)
- Generate self-signed certificate
- Renew certificate (if ACME/Let's Encrypt)
- Wrap for deployment (.mobileconfig, .ovpn, etc.)

**Decision:** TBD - Which operations are priority?

### Question 3: Certificate Deployment Wrapping

**Context:** Should TikBook help users deploy certificates to devices?

**Use Case:** User has VPN or HTTPS cert, wants to distribute to end-user devices (phones, laptops)

**Deployment Formats:**

- `.mobileconfig` (iOS, macOS)
- `.ovpn` (OpenVPN profiles with embedded certs)
- `.p12` / `.pfx` (Windows, cross-platform)
- Custom formats?

**Questions:**

- Should TikBook generate these formats?
- Should TikBook recommend other VS Code extensions for format validation?
- Should this be a separate feature or integrated?

**Decision:** TBD - Is deployment wrapping in scope?

### Question 4: Certificate Storage

**Context:** Where do imported/exported certificates live?

**Options:**

- **Workspace Files:** Save to open workspace
- **Temp Directory:** Save to VS Code temp dir
- **User Chooses:** File picker dialog
- **Virtual FS:** Use `rscfile://` or `rscena://` protocol

**Decision:** TBD - What makes sense for your workflow?

### Question 5: Integration with RouterOS Services

**Context:** Should TikBook help assign certs to services?

**RouterOS Services Using Certificates:**

- `/ip/service` (www-ssl, api-ssl)
- `/interface/ovpn-server`
- `/ppp/aaa`
- IPsec, SSTP, etc.

**Questions:**

- Should TikBook show which cert is used by which service?
- Should TikBook provide UI to change service cert assignments?
- Or just focus on cert CRUD operations?

**Decision:** TBD - How deep should integration go?

---

## Requirements

### Functional Requirements

#### Must Have

1. View list of certificates on router
2. View certificate details (expiry, subject, issuer)
3. Import certificate from local file
4. Export certificate to local file
5. Delete certificate from router

#### Should Have

1. Certificate expiry warnings
2. Filter/search certificates
3. Sort by name, expiry, type
4. Assign certificate to services

#### Could Have (Future)

1. Generate self-signed certificates
2. Generate CSR
3. Wrap certificates for deployment
4. ACME/Let's Encrypt integration
5. Certificate validation (check chain, revocation)

### Non-Functional Requirements

**Security:**

- Private keys handled securely (never logged)
- Certificates not cached unnecessarily
- Clear warnings when deleting certs
- Confirm destructive operations

**Usability:**

- Intuitive UI for non-experts
- Clear error messages
- Good defaults
- Undo/rollback where possible

**Compatibility:**

- Desktop VS Code (file I/O needed)
- RouterOS 7.10+
- Standard cert formats (.pem, .crt, .pfx, .p12)

---

## User Experience

### User Flows

**Flow 1: View Certificates**

1. User opens "RouterOS Certificates" view (treeview or panel)
2. Extension fetches certificates from `/certificate` REST endpoint
3. User sees list: name, expiry date, status
4. User clicks certificate → sees details panel

**Flow 2: Import Certificate**

1. User clicks "Import Certificate" button/command
2. File picker opens
3. User selects .pem or .crt file
4. Extension uploads to RouterOS via `/certificate/import`
5. Certificate appears in list

**Flow 3: Export Certificate**

1. User right-clicks certificate in list
2. Selects "Export Certificate"
3. File picker opens (save as)
4. Extension downloads from RouterOS, saves to file
5. Confirmation message

**Flow 4: Delete Certificate**

1. User right-clicks certificate
2. Selects "Delete"
3. Confirmation dialog: "Are you sure? This cannot be undone."
4. User confirms
5. Extension deletes via REST API
6. Certificate removed from list

### UI/UX Design

> **USER INPUT NEEDED:** Sketch your ideal UI here (text description or mockup)

**Commands (preliminary):**

- `tikbook.certificates.view` - Open certificate manager
- `tikbook.certificates.import` - Import certificate from file
- `tikbook.certificates.export` - Export certificate to file
- `tikbook.certificates.delete` - Delete certificate
- `tikbook.certificates.refresh` - Refresh certificate list

**TreeView (option):**

```
RouterOS Certificates
├── 📜 my-ca-cert (Expires: 2027-01-15)
├── 📜 server-cert (Expires: 2026-12-01, Assigned: www-ssl)
├── 📜 client-cert (Expires: 2026-11-30)
└── ⚠️ old-cert (Expired: 2025-05-20)
```

**Webview Panel (option):**

- Table view with columns: Name, Type, Expires, Used By, Actions
- Detail panel on selection
- Toolbar with Import/Refresh buttons

### Examples

**Example 1: Certificate List from RouterOS**

```typescript
const certs = await router.get('/certificate/print');
// Returns:
// [
//   { ".id": "*1", "name": "my-ca", "common-name": "My CA", "invalid-after": "dec/31/2027...", ... },
//   { ".id": "*2", "name": "server", "common-name": "example.com", "invalid-after": "dec/01/2026...", ... }
// ]
```

**Example 2: Import Certificate**

```typescript
const fileContent = await vscode.workspace.fs.readFile(certUri);
const base64 = Buffer.from(fileContent).toString('base64');
await router.post('/certificate/import', {
  'file-name': 'my-cert.pem',
  contents: base64,
  passphrase: '' // if encrypted
});
```

---

## Implementation Notes

### Architecture

**Components:**

- `certificates.ts` - Core certificate management logic
- `certificates-view.ts` - TreeView or WebView provider
- `commands.ts` - Certificate commands
- `routeros.ts` - REST API calls for /certificate

**Data Flow:**

```
User Action → CertificateView → Router REST API (/certificate/*) → Update UI
```

### Technical Approach

**Phase 1: Basic CRUD (TBD hours)**
> **BLOCKED:** Awaiting UI design and operation scope

1. Implement certificate listing
2. Implement certificate details view
3. Implement import operation
4. Implement export operation
5. Implement delete operation

**Phase 2: UI Polish (TBD hours)**

1. Add TreeView or WebView (per user decision)
2. Add filtering/sorting
3. Add expiry warnings
4. Error handling and user feedback

**Phase 3: Advanced Features (Future)**

1. Service assignment UI
2. Certificate wrapping for deployment
3. CSR generation
4. Let's Encrypt integration

### Key Implementation Details

**RouterOS Certificate REST Endpoints:**

- `/certificate/print` - List certificates
- `/certificate/add` - Add certificate
- `/certificate/import` - Import from file
- `/certificate/export` - Export to file
- `/certificate/remove` - Delete certificate
- `/certificate/set` - Update certificate properties

**Import Logic:**

```typescript
async function importCertificate(filePath: vscode.Uri): Promise<void> {
  const fileContent = await vscode.workspace.fs.readFile(filePath);
  const base64 = Buffer.from(fileContent).toString('base64');
  
  await routerClient.post('/certificate/import', {
    'file-name': path.basename(filePath.fsPath),
    contents: base64,
    passphrase: '' // prompt user if needed
  });
  
  vscode.window.showInformationMessage('Certificate imported successfully');
  refreshCertificateList();
}
```

### Dependencies

**Required Before Implementation:**

- [ ] User specification of UX design (treeview vs panel vs commands)
- [ ] User specification of operation scope (basic CRUD vs advanced)
- [ ] User specification of deployment wrapping requirements
- [ ] RouterOS /certificate API testing and documentation

**Nice to Have:**

- [ ] VS Code extensions for .mobileconfig, .ovpn validation (if wrapping in scope)

---

## Testing Strategy

### Unit Tests

- Certificate data parsing
- Base64 encoding/decoding
- Filename handling

### Integration Tests

- List certificates from RouterOS
- Import certificate via REST
- Export certificate via REST
- Delete certificate via REST

### Manual Testing

- Import various cert formats (.pem, .crt, .pfx)
- Export and verify file contents
- Delete cert and verify removed
- Test error cases (invalid file, missing passphrase, etc.)

**Test with:**

- RouterOS 7.10+
- Various certificate types (CA, server, client)
- Encrypted and unencrypted certificates

---

## Rollout Plan

### Feature Flags

- [ ] Experimental (if complex)
- [ ] Stable (if well-defined and tested)

### Documentation Updates

- [ ] Add docs/certificate-management-guide.md
- [ ] Update README.md with certificate feature
- [ ] Update CHANGELOG.md

---

## Open Issues & Risks

### Risks

- **Risk: Private key exposure in logs**
  - Impact: Critical (security)
  - Mitigation: Never log private key content, careful with error messages

- **Risk: Certificate deletion without backups**
  - Impact: High (data loss)
  - Mitigation: Strong confirmation dialog, recommend backups in docs

### Unresolved Questions

- [ ] UI structure (treeview, panel, commands?)
- [ ] Operation scope (basic CRUD vs advanced features?)
- [ ] Deployment wrapping in scope?
- [ ] Service assignment integration?
- [ ] Certificate storage for import/export?

---

## Notes / Scratchpad

**USER: Please add your requirements here**

Questions to answer:

1. What does the ideal certificate UI look like in VS Code?
2. What's the most common workflow you need to support?
3. Is deployment wrapping (mobileconfig, etc.) important?
4. Should TikBook help assign certs to services, or just manage cert files?
5. Any specific RouterOS certificate quirks to be aware of?

**Use Cases to Consider:**

- Web admin setting up HTTPS (www-ssl service)
- VPN admin configuring OpenVPN with certs
- Network admin distributing CA cert to client devices
- Developer testing with self-signed certs
- Enterprise admin managing cert lifecycle (renewal, expiry monitoring)

**Related RouterOS Paths:**

- `/certificate` - Main certificate storage
- `/ip/service` - Services that use certificates
- `/interface/ovpn-server` - OpenVPN server settings
- `/ppp/aaa` - PPP authentication settings

**Next Steps:**

1. User sketches ideal UX (text or mockup)
2. User prioritizes operations (must-have vs nice-to-have)
3. User clarifies deployment wrapping scope
4. Change status to `ready-for-implementation`
