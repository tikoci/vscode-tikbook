# Research: VS Code container/VM options for RouterOS CHR

> **Created:** 2026-02-26
> **Related Specs:** _TBD_ (possible: chr-test-environment.md)
> **Status:** complete (initial survey)

## Questions Being Investigated

1. What container and VM models does VS Code support, and which are usable for RouterOS CHR?
2. Which VS Code container workflows assume a Linux shell/SSH and therefore cannot run inside RouterOS?
3. What are viable approaches for running RouterOS CHR for TikBook end users and for tests?
4. What are constraints around CHR versions and the official Docker image?
5. How could a VM-based approach (UTM/Hyper-V/QEMU) compare to Docker for end users?

## Findings

### 1) VS Code container and remote models (constraints)

- **Dev Containers** and **Attach to Running Container** rely on VS Code Server running inside the container. This expects a Linux userland and shell utilities. RouterOS CHR does not provide a POSIX shell, so a CHR container cannot host VS Code Server and therefore cannot be a Dev Container target.
- **Remote - SSH** and **Remote - Tunnels** similarly assume a Linux/macOS host that can run VS Code Server and shell commands. RouterOS is not compatible as a remote target.
- **Conclusion:** RouterOS CHR should be treated as a service the extension connects to (REST/API), not as a VS Code remote workspace target.

References:

- <https://code.visualstudio.com/docs/devcontainers/containers>
- <https://code.visualstudio.com/docs/remote/containers>
- <https://code.visualstudio.com/api/advanced-topics/remote-extensions>

### 1b) code-server (VS Code in the browser) considerations

- **Marketplace differences:** code-server cannot use Microsoft's marketplace and uses Open-VSX instead. Closed-source extensions such as Remote-SSH/Containers/WSL are not available.
- **Extension install path:** extensions must be available in Open-VSX or installed via VSIX.
- **Webview security:** webviews rely on service workers and require a secure context (https or localhost). Insecure access can break webviews.
- **Implication for TikBook:** if users run TikBook under code-server, features that depend on Remote-SSH/Dev Containers will not be available, and webview-based UI must be served over a secure context.

References:

- <https://github.com/coder/code-server/blob/main/docs/FAQ.md>
- <https://github.com/coder/code-server/blob/main/docs/guide.md>

### 2) What containers can still do for TikBook

- A **Docker container can run QEMU** and boot RouterOS CHR inside a Linux container. VS Code does not attach to RouterOS; it attaches locally and the extension talks to CHR over REST/API ports forwarded from the container.
- **Ports must be published/forwarded** from the container to the host so TikBook can reach the RouterOS REST API.
- This approach works even though RouterOS has no shell, because the container itself provides the shell/host environment while RouterOS runs inside QEMU.

Reference:

- <https://hub.docker.com/r/mikrotik/chr/tags>

### 3) VM option (non-docker) using UTM, Hyper-V, QEMU

- **UTM** on macOS supports QEMU and Apple Virtualization backends. It supports headless mode, serial access, and automation via `utm://` URLs, `utmctl`, AppleScript, and a CLI.
- **tikoci/mikropkl** provides an existing workflow for packaging RouterOS CHR into UTM bundles, with automation options and release distribution.
- This can be a viable **non-Docker path** to provide a consistent test router for users who do not want Docker or for environments where Docker is not available.

References:

- <https://github.com/tikoci/mikropkl/blob/main/README.md>
- <https://docs.getutm.app/>

### 4) CHR versions and the official Docker image

- The **official** `mikrotik/chr` Docker tags appear limited, and currently include `latest` and at least one beta tag (example: `7.20beta2`). It is unlikely to cover many older versions.
- **Version selection** for end users (stable vs long-term) may require a **third-party image** that downloads a chosen CHR image at runtime (since the container runs QEMU anyway).

Reference:

- <https://hub.docker.com/r/mikrotik/chr/tags>

### 5) Default credentials and clean state

- RouterOS CHR typically starts with `admin` and no password, providing a known clean state.
- This is useful for tests and reduces the need to store credentials in settings or secrets.
- TikBook could set a password at first connection and store it if persistence is desired.

### 6) Multi-router topology (longer-term)

- Orchestrating multiple CHR instances for topology testing is plausible with Docker Compose or multiple VM instances.
- This is a separate feature tier; it should not block a single-CHR test router workflow.

## Implications for TikBook

1. **Dev Containers are not the right integration path** for CHR itself, but Docker/VM can still be used as a host to run CHR and expose the REST API.
2. **code-server is a supported deployment mode** but has marketplace and webview constraints:
   - TikBook must be available via Open-VSX or VSIX.
   - Webviews require https/localhost to function reliably.
3. A TikBook feature could provide a **"Start test router"** command that:
   - Detects Docker or a VM host (UTM/Hyper-V/QEMU)
   - Boots a CHR instance
   - Waits for REST API to be ready
   - Connects TikBook automatically to a known host/port
4. **Two backends may be needed**:
   - Docker-based CHR (cross-platform, depends on Docker)
   - VM-based CHR (e.g., UTM on macOS using mikropkl)
5. **Version selection** likely needs non-official images or an internal download mechanism.

## Options Matrix (Initial)

| Approach | Pros | Cons | Notes |
|---|---|---|---|
| Dev Containers (CHR as target) | Integrates with VS Code remote UI | Not viable (no shell) | Eliminate as target approach |
| Docker + QEMU CHR (service) | Cross-platform, CLI automatable | Docker dependency, version limits | Use as test router service |
| UTM (macOS) | Good UX, existing mikropkl tooling | mac-only, UTM dependency | Strong option for mac users |
| Native VM per OS | No Docker required | High complexity, multiple host APIs | Likely too heavy initially |

## Existing VS Code VM Extensions (Windows/Linux)

### Key Findings

**No mature cross-platform VM management extensions exist.** Most extensions are platform-specific with low adoption:

- **VirtualBox** (`acherkashin.virtualbox-extension`): 21.8K installs, 4.5/5 rating, no public API
- **Parallels Desktop** (`parallelsdesktop.parallels-desktop`): 162K installs, macOS-only, best-in-class integration
- **Vagrant** (`bbenoist.vagrant`): 253K installs, indirect VM management via Vagrantfile
- **Multipass Manager** (`levalleyjack.multipass-manager`): 1.7K installs, Ubuntu VMs only
- **No VMware, QEMU/libvirt, or Hyper-V management extensions found**

### VMware Fusion/Workstation Now FREE 🎉

**Critical update (November 2024):** Broadcom/VMware made Fusion Pro and Workstation Pro **completely free** for all users including commercial use. This removes all licensing barriers and makes VMware an excellent primary recommendation.

- **VMware Fusion Pro (macOS)**: Native Apple Silicon (M1/M2/M3) support, DirectX 11, container support
- **VMware Workstation Pro (Windows/Linux)**: Full feature parity, Windows 11 support
- **Download**: <https://support.broadcom.com/group/ecx/downloads>
- **No extensions exist**: TikBook would be the first VS Code integration for VMware desktop VMs

### VirtualBox Licensing

- **Base package**: GPL v3 (completely free and open source)
- **Extension Pack**: Free for personal/educational; requires Oracle license for commercial use
- **Assessment**: Good option but Extension Pack licensing may limit some users

### Recommendation for TikBook Phase 2/3

**Phase 2 (Linux):**

- Build QEMU/libvirt integration (no existing extension, high developer demand)
- Recommend VMware Workstation Pro (free, professional-grade) as primary option
- Optionally suggest VirtualBox if user prefers open source

**Phase 3 (Windows):**

- Recommend VMware Workstation Pro (free, cross-platform consistency)
- Optionally build Hyper-V integration if customer demand exists
- Suggest existing VirtualBox extension for users who prefer it

**Do NOT reinvent the wheel**: Document and recommend VMware/VirtualBox rather than building generic VM UI. Focus TikBook integration on RouterOS CHR workflow automation (download CHR, configure REST API, quick launch).

## Cross-Platform VM Integration Analysis

### Windows Hyper-V

**Integration approach:** PowerShell Hyper-V module + WMI/WinRM  
**Key challenge:** Admin elevation required—no unprivileged access model like Linux. Even group-based delegation is complex and requires manual admin setup per user.  
**VM discovery:** `Get-VM` cmdlet lists all VMs and their states (Running, Stopped, Paused, Saved).  
**Control:** PowerShell cmdlets (`Start-VM`, `Stop-VM`, `Set-VM`) or WMI classes.  
**Third-party ecosystem:** Thin—most Windows users run VirtualBox/VMware (which manage their own hypervisor) rather than control Hyper-V.  
**Gotchas:**

- Admin requirement is a hard barrier for casual users  
- Conflicts with VirtualBox/VMware at hypervisor level (mutual exclusion on older Windows)
- State enum differs from libvirt/UTM (requires translation layer)

**Assessment for TikBook:** **Low priority for MVP.** Recommend phase 3 or skip entirely unless you see high customer demand. If supported, document clearly that Hyper-V requires Windows Pro/Enterprise + admin privileges.

### Linux QEMU/libvirt

**Integration approach:** `virsh` CLI (libvirt daemon interface) or D-Bus.  
**Key advantage:** Unprivileged access via `libvirt` group membership (common pattern among developers).  
**VM discovery:** `virsh list --all` shows all VMs and states (running, shut off, paused).  
**Control:** `virsh` commands (start, shutdown, destroy, snapshot, etc.).  
**Permissions:** User must be in `libvirt` group; system-wide and per-VM ACLs available.  
**Third-party ecosystem:** Strong—KDE Boxes, GNOME Boxes, virt-manager, cockpit all integrate with libvirt.  
**Gotchas:**

- Requires libvirtd daemon running (system service)  
- User must be in `libvirt` group or have sudo access  
- VM definitions stored as XML files in `/etc/libvirt/qemu/` or user's `~/.local/share/libvirt/qemu/`  
- Group membership is not instant—user must log out/in for it to take effect

**Assessment for TikBook:** **Strong candidate for phase 2.** Developers expect QEMU/libvirt on Linux; unprivileged access story is clean. Recommend via `virsh` CLI or libvirt D-Bus API.

### Recommended Multi-Platform Architecture

**Phase 1 (MVP):** UTM on macOS only  
**Phase 2:** Add QEMU/libvirt on Linux (high-value addition)  
**Phase 3 (optional):** Hyper-V on Windows (if customer demand)

**Implementation pattern:** Platform-specific code with abstraction layer

```typescript
// Abstraction interface (common to all providers)
interface VMProvider {
  isAvailable(): Promise<boolean>        // Can this platform host VMs?
  listVMs(): Promise<VM[]>
  startVM(name: string): Promise<void>
  stopVM(name: string, force?: boolean): Promise<void>
  getStatus(name: string): Promise<VMState>
}

// Platform-specific implementations
class UTMProvider implements VMProvider { }      // AppleScript + utmctl
class LibvirtProvider implements VMProvider { }  // virsh CLI
class HyperVProvider implements VMProvider { }   // PowerShell module (phase 3)
```

**State translation layer needed:** Convert platform state enums to common values  

- macOS: started, paused, stopped  
- Linux: running, paused, shut off  
- Windows: Running, Paused, Stopped, Saved  

## UTM Integration Method Experiments (CRITICAL for MVP)

**Problem**: We don't know which UTM integration method works best under VS Code's security context without empirical testing.

**Three methods to evaluate:**

1. **utmctl CLI** (`/Applications/UTM.app/Contents/MacOS/utmctl`) - Command-line interface bundled with UTM
2. **AppleScript** (`osascript -e 'tell application "UTM" ...'`) - Full automation API used by mikropkl
3. **utm:// URL scheme** (`open utm://...`) - Limited to download/launch operations

**Unknown factors:**

- Which methods trigger macOS security prompts (Accessibility, Automation, Full Disk Access)?
- Do prompts differ when called from VS Code extension vs terminal?
- Performance/reliability differences?
- Can utmctl access all VM data or is it limited vs AppleScript?

**Experimental test created:**

- `src/test/suite/utm-integration.experiment.test.ts` - TypeScript unit tests to run from VS Code context

**Run:**

```bash
npm test -- --grep "UTM Integration"
```

**Observed results (Feb 26, 2026):**

- UTM app launched during test run (user-visible confirmation).
- Performance sample (single run): `utmctl` 1062ms, AppleScript 638ms.
- Results file only captured Experiment 5; console output was not captured by the custom reporter.
- `.vscode-test/test-output.log` listed only Experiments 1-3 and did not include a summary in this run.

**Logging limitations (needs fix):**

- Custom reporter does not capture `console.log` output.
- Experiment results require explicit file logging.
- Test output log can be incomplete even when the run succeeds.

**Interim conclusion:** Hybrid approach still favored, but prompt behavior was not captured due to logging gaps:

- **utmctl** for querying (fast, no prompts observed)
- **AppleScript** for control (one-time prompt expected, not captured in logs)
- **utm:// URL** for downloads (let UTM handle file management)

## Open Questions for MVP Spec (UTM on macOS)

1. ✅ **Confirmed:** UTM for MVP. Cross-platform parity to follow (VMware/libvirt phase 2, optional Hyper-V phase 3).
2. ✅ **Explorer UI confirmed:** VM list with running status, start/stop, connect-to-TikBook option.
3. ✅ **Version selector confirmed:** Pull from mikropkl GitHub releases.
4. ✅ **Networking confirmed:** Platform default (NAT with port forwarding).
5. ✅ **Credentials confirmed:** Keep admin/no-password default.
6. ✅ **UTM integration approach:** Hybrid (utmctl + AppleScript + utm://)
   - Based on experiment run and UTM launch confirmation
   - Prompt behavior still needs reliable logging to verify
7. ✅ **Auto-download behavior:** Use `utm://downloadVM?url=...` (let UTM handle download)
8. ❌ **First-time setup flow:** **DEFERRED to separate future feature**
   - Needs its own research (walkthroughs, welcome screens, etc.)
   - Not part of MVP spec
   - Document in [docs/future-features.md](../future-features.md)
9. ⏸️ **SSH integration:** Defer to spec phase (likely document manual approach for MVP)

## References

- VS Code Dev Containers: <https://code.visualstudio.com/docs/devcontainers/containers>
- VS Code Remote Containers: <https://code.visualstudio.com/docs/remote/containers>
- VS Code Remote Extensions: <https://code.visualstudio.com/api/advanced-topics/remote-extensions>
- mikrotik/chr Docker tags: <https://hub.docker.com/r/mikrotik/chr/tags>
- tikoci/mikropkl README (UTM tooling): <https://github.com/tikoci/mikropkl/blob/main/README.md>
- UTM docs: <https://docs.getutm.app/>
- code-server FAQ: <https://github.com/coder/code-server/blob/main/docs/FAQ.md>
- code-server guide: <https://github.com/coder/code-server/blob/main/docs/guide.md>
