---
name: 'RouterOS CHR QEMU Guest Agent Research'
description: 'Findings on whether CHR supports qemu-ga and alternatives for IP detection'
date: '2026-02-26'
---

# RouterOS CHR QEMU Guest Agent Research

## Question Investigated

Does RouterOS CHR include QEMU guest agent (`qemu-ga`) support, enabling UTM's `query ip` AppleScript command to retrieve VM IP addresses?

## Background

UTM's AppleScript dictionary (docs/UTM.sdef) includes a Guest Agent Suite:

```applescript
tell application "UTM"
  set vm to virtual machine named "router.chr"
  set ipList to query ip vm  -- Returns list of IP addresses
end tell
```

**Requirements for this to work:**

- QEMU guest agent daemon (`qemu-ga`) running inside the guest OS
- virtio-serial communication channel between host and guest
- Linux/Unix guest OS that can run the daemon

## Findings

### RouterOS CHR Architecture

RouterOS CHR is a **special-purpose Linux-based system** with these characteristics:

1. **No user-accessible shell** - Only RouterOS CLI/API available
2. **No package installation** - Users cannot install software
3. **Closed system** - Disk images are read-only except for RouterOS config
4. **API-only management** - WebFig, WinBox, REST API, SSH (RouterOS shell only)

### Virtio Driver Support

CHR **does include** virtio drivers for performance:

- **virtio-net** - Fast network drivers (standard in QEMU VMs)
- **virtio-blk** - Fast disk I/O drivers
- **virtio-scsi** - SCSI device support

These are kernel drivers for performance, **not the guest agent**.

### QEMU Guest Agent Status: **⚠️ CLAIMED BUT NOT VALIDATED**

**Initial Community Evidence** (before direct testing):

RouterOS CHR was initially believed to include QEMU guest agent based on:

```bash
# Connect to qemu-ga via serial socket (Proxmox example)
socat /var/run/qemu-server/155.qga -

# Send guest-exec command with RouterOS script (base64 encoded)
{"execute": "guest-exec", "arguments": {
  "input-data": "OmlwIGFkZHJlc3MgYWRkIGFkZHJlc3M9MTkyLjE2OC4wLjEvMjQgaW50ZXJmYWNlPWV0aGVyMTs=",
  "capture-output": true
}}

# Decoded input-data is RouterOS command:
# :ip address add address=192.168.0.1/24 interface=ether1;
```

**Key findings from community reports (Proxmox/Linux KVM):**

- ✅ QEMU guest agent claimed to be bundled with RouterOS CHR
- ✅ Requires virtio-serial device in VM configuration
- ✅ Can execute RouterOS CLI commands via `guest-exec`
- ✅ Commands must be base64-encoded in `input-data` parameter
- ✅ Supports output capture with `capture-output: true`
- ✅ Reported working on Proxmox VE (KVM/QEMU hypervisor)

**However:** Direct testing on macOS/QEMU showed CHR does not respond to guest agent queries (see Definitive Evidence section below).

**Original community conclusion (now superseded by testing):** RouterOS CHR **claims to include guest agent** but does not respond in all environments.

### Why This Matters (Updated After Testing)

**Initial expectations based on documentation:**

- ✅ UTM's `start`, `stop`, `delete` commands work (confirmed - no guest agent needed)
- ✅ VM status detection works (`get status of vm as string`) (confirmed - no guest agent needed)
- ❌ UTM's `query ip` command - **does NOT work on macOS test environment**
- ❌ UTM's `execute` command - **unconfirmed, likely also fails**
- ❌ UTM's `open file` command - not useful for CHR anyway (no accessible filesystem)

**Actual testing outcome:**

- Virtio-serial device exists and socket created
- CHR boots successfully
- Guest agent does not respond to queries on macOS/QEMU 10.2.1/HVF
- Control VM (Debian) works perfectly on same setup → proves methodology is correct

**For TikBook extension development:**

- ❌ **Cannot** use `query ip` for automatic IP detection on macOS
- ⚠️ Need alternative approaches: manual IP entry, REST API once connected, UTM config parsing
- ✅ VM management (start/stop/delete) works fine without guest agent

## UTM-Specific Experimental Findings (2026-02-27)

### Test Environment

- **Host:** macOS with UTM (QEMU backend)
- **CHR Versions Tested:** 7.21.3, 7.21.2 (mikropkl x86_64 images)
- **Test Duration:** 120s boot-readiness retry loops
- **Method:** Auto-provisioned VMs from tikoci/mikropkl GitHub releases

### Guest Agent Query Results

**Status: ❌ CONSISTENTLY FAILING**

```applescript
tell application "UTM"
  set vm to virtual machine named "chr.x86_64.qemu.7.21.3"
  query ip of vm
end tell
```

**Error (consistent across all tests):**
```
execution error: UTM got an error: The QEMU guest agent is not running 
or not installed on the guest (-2700)
```

### Configuration vs Runtime Analysis

**Critical Mismatch Discovered:**

| Inspection Method | Serial Port Count | Details |
|-------------------|-------------------|---------|
| `serial ports of configuration of vm` | **0** | Empty config list |
| `serial ports of vm` (runtime) | **2** | id=0 (unavailable), id=1 (ptty at /dev/ttys013) |

**Findings:**
- ✅ Runtime serial ports exist with PTY paths (`/dev/ttys001`, `/dev/ttys013`)
- ❌ Configuration serial ports list is empty (count=0)
- ❌ Guest agent queries fail despite serial channels present
- ⚠️ Config/runtime mismatch suggests UTM manages guest agent channel separately

### Versions Tested

| CHR Version | Boot Time | Guest Agent | Serial Config | Serial Runtime |
|-------------|-----------|-------------|---------------|----------------|
| 7.21.3      | ~30s      | ❌ Failed   | 0 ports       | 2 ports (ptty) |
| 7.21.2      | ~30s      | ❌ Failed   | 0 ports       | 2 ports (ptty) |

### Working Theories

**Why guest agent might be failing:**

1. **Missing configuration property** - UTM may require explicit guest agent enablement flag not present in mikropkl configs
2. **QEMU args gap** - May need explicit `-device virtio-serial` or `-chardev` arguments
3. **UTM version issue** - Guest agent support may be version-dependent
4. **CHR implementation gap** - Despite documentation, CHR's guest agent may not support UTM's communication method
5. **virtio-serial device type** - May need specific device model (virtserialport, virtio-serial-pci, etc.)

### Evidence Supporting Bug Report

**For MikroTik support ticket:**

- ✅ Official MikroTik docs explicitly document guest agent support (guest-info, guest-network-get-interfaces, guest-file-*, guest-exec)
- ✅ Proxmox community reports working with socat + virtio-serial socket
- ❌ UTM (QEMU 8.x backend) consistently fails with "not running or not installed"
- ✅ Serial channels present at runtime (PTY devices exist)
- ❌ Config shows no serial port entries (potential UTM import issue)
- ⚠️ Need to confirm: manually-created UTM VM vs mikropkl import behavior

**Hard data needed:**

1. ✅ UTM version and QEMU backend version
2. ✅ CHR versions tested (7.21.3, 7.21.2)
3. ✅ AppleScript error codes (-2700)
4. ⚠️ QEMU command line arguments used by UTM (not yet captured)
5. ⚠️ Guest agent protocol dumps (socat diagnostics show "Connection refused")
6. ✅ **Vanilla QEMU test completed - CHR guest agent does NOT work on macOS x86_64**

---

### Definitive Evidence Update: Vanilla QEMU + Control VM (2026-02-27)

**Status:** We now have stronger evidence with a corrected QGA protocol harness.

#### MikroTik KVM documentation excerpt (official claim)

MikroTik CHR docs (`Cloud Hosted Router, CHR` → `Guest tools` → `KVM`) state:

- QEMU guest agent is available
- Supported commands discoverable via `guest-info`
- `guest-network-get-interfaces` is supported
- `guest-file-*` host/guest transfer commands are supported
- `guest-exec` / `guest-exec-status` are supported with CHR-specific semantics
- Additional channel `chr.provision_channel` is available

#### Harness correctness fix

Raw `guest-ping` over plain socket was upgraded to use proper QGA framing:

- Send `0xFF` delimiter
- Call `guest-sync-delimited`
- Then send target command (`guest-ping`, `guest-info`, etc.)

This avoids false negatives from stale/undelimited stream parsing.

#### CHR result (direct QEMU, macOS Intel, Homebrew QEMU 10.2.1)

**Test configuration:**

```bash
qemu-system-x86_64 \
  -M accel=hvf \
  -device virtio-serial \
  -chardev socket,path=qga.sock,server=on,wait=off,id=qga0 \
  -device virtserialport,chardev=qga0,name=org.qemu.guest_agent.0
```

**CPU matrix tested (forum clue included):**

- `default`
- `host`
- `qemu64`
- `kvm64`  ← forum suggestion

**Result across all CPU models:**

- socket exists: ✅
- `guest-ping` success: ❌
- first error: `ERROR: timed out`

This means changing CPU type to `kvm64` did **not** resolve the issue in this environment.

#### Control validation (non-CHR guest, same host and QEMU)

Using Debian cloud image with cloud-init-installed `qemu-guest-agent` on the same machine/QEMU:

- `guest-ping` returned successfully ✅
- `guest-info` returned successfully ✅
- QGA version observed: `6.2.0` ✅

**Implication:** host-side QEMU, socket wiring, and test methodology are valid. CHR failure is guest-specific under this setup.

#### Updated conclusion

- UTM-only explanation is no longer required to explain failures
- CPU model mismatch (`host` vs `kvm64`) is not the blocker (tested)
- With corrected protocol and a passing control VM, CHR QGA non-response is strong, reproducible evidence for MikroTik support investigation

**Scripts used:**

- `scripts/repro-chr-qga-macos.sh` (minimal MikroTik repro)
- `scripts/control-qga-ubuntu-macos.sh` (control VM harness validation)

## Alternative Approaches for IP Detection

**Now that guest agent support is confirmed, here are the approaches ranked:**

### Option A: UTM Guest Agent `query ip` (currently blocked by observed CHR behavior on macOS test setup)

Use UTM's built-in guest agent integration:

```applescript
tell application "UTM"
  set vm to virtual machine named "router.chr"
  set ipList to query ip vm
  -- Returns: {"192.168.64.10", "fe80::..."}
end tell
```

**Advantages:**

- ✅ Uses official UTM API (maintains compatibility)
- ✅ Fast and reliable (direct guest agent communication)
- ✅ Works even if REST API isn't configured yet
- ✅ Returns all IPs (IPv4 and IPv6)
- ✅ No network scanning or guessing needed

**Limitations:**

- ❌ Requires VM to be running
- ❌ Requires virtio-serial device in VM config (UTM adds automatically)
- ❌ May return multiple IPs (need to filter/prioritize)

**Implementation:**

```typescript
async queryVMIPAddresses(vmName: string): Promise<string[]> {
  const script = `
    tell application "UTM"
      set vm to virtual machine named "${vmName}"
      set ipList to query ip vm
      return ipList as list
    end tell
  `;
  const result = await execAppleScript(script);
  return result.split(', ').filter(ip => !ip.startsWith('fe80::')); // Filter link-local
}
```

### Option B: Query RouterOS REST API

Once VM is running, connect to RouterOS and query its network configuration:

```typescript
// Connect to known CHR default IP/port
const apiClient = new RouterOSRestApiClient('http://192.168.64.10:7080', 'admin', '');
const addresses = await apiClient.get('/rest/ip/address');
// Returns: [{ address: "192.168.64.10/24", interface: "ether1", ... }]
```

**Advantages:**

- ✅ Always accurate (source of truth)
- ✅ No guest agent needed
- ✅ Works with any RouterOS device (physical or VM)
- ✅ Already using REST API for TikBook features

**Limitations:**

- ❌ Requires REST API to be accessible (VM must be running and network configured)
- ❌ Need to know the IP beforehand (chicken-and-egg problem for first connection)
- ❌ First boot may block automation with RouterOS license prompt (`Do you want to see the software license? [Y/n]:`) before custom IP/REST setup commands can be applied

**Solution for first connection:**

- Use UTM's default network config (NAT with known subnet)
- mikropkl CHR images use predictable IPs (e.g., `192.168.64.10`)
- Document the default IP in tree view before first boot
- For first-boot automation, handle license review prompt before sending RouterOS setup commands (IP assignment, REST enablement, user/password changes)

### Option B: Parse UTM VM Configuration

Read UTM's VM configuration files to determine network setup:

```typescript
// UTM stores VM configs as plist/JSON
// Location: ~/Library/Containers/com.utmapp.UTM/Data/Documents/{vm-name}.utm/config.plist
const config = await parseUTMConfig(vmName);
const networkMode = config.networking.mode; // "nat", "bridged", "host"
const natSubnet = config.networking.natSubnet; // e.g., "192.168.64.0/24"
```

**Advantages:**

- ✅ Works even when VM is stopped
- ✅ No guest agent needed
- ✅ Can document expected IP before first boot

**Limitations:**

- ❌ Doesn't show actual IP, only network configuration
- ❌ UTM config format may change between versions
- ❌ Requires file system access to UTM's data directory

### Option C: Serial Console Access (Phase 3)

Use UTM's serial port element to connect to RouterOS console:

```applescript
tell application "UTM"
  set vm to virtual machine named "router.chr"
  set serialPorts to serial ports of vm
  repeat with port in serialPorts
    -- Connect via PTY interface
    set portAddress to address of port
    -- Open PTY, send commands: /ip address print
  end repeat
end tell
```

**Advantages:**

- ✅ Works even if networking is broken
- ✅ Direct access to RouterOS console
- ✅ Can run any RouterOS command

**Limitations:**

- ❌ Complex implementation (PTY handling, terminal emulation)
- ❌ Requires parsing RouterOS CLI output
- ❌ Serial console may not be enabled by default

### Option D: Network Scanning (NOT RECOMMENDED)

Scan local subnet for RouterOS devices:

```typescript
// Scan 192.168.64.0/24 for port 7080
for (let i = 1; i < 255; i++) {
  const ip = `192.168.64.${i}`;
  try {
    const response = await axios.get(`http://${ip}:7080/rest/system/identity`, { timeout: 500 });
    // Found RouterOS!
  } catch { /* Not found */ }
}
```

**Advantages:**

- ❌ (None - this approach has no real advantages)

**Limitations:**

- ❌ Slow (scans entire subnet)
- ❌ Unreliable (may hit other devices, firewalls)
- ❌ Doesn't work if REST API port isn't 7080
- ❌ User experience is poor (scanning delay)

## Recommendations for TikBook Phase 2

### For VM Details Modal (Phase 2)

Keep Phase 2 simple - don't add IP detection yet:

```
CHR VM Details (rose.chr.x86_64.qemu.7.22beta1)
  Status: Running
  Backend: QEMU
  Network: NAT (default)
  [Connect to CHR] button → tries REST API connection
```

### For Phase 3 Features

**IP Address Display in Tree View:**

Show IP addresses inline using guest agent:

```typescript
async refreshVMItem(vm: VMInfo): Promise<void> {
  if (vm.status === 'running') {
    try {
      const ips = await this.provider.queryIPAddresses(vm.name);
      vm.ipAddresses = ips.filter(ip => !ip.startsWith('fe80::')); // Skip link-local
      vm.description = `${vm.status} - ${vm.ipAddresses[0]}`;
    } catch {
      vm.description = vm.status; // Guest agent not available
    }
  }
}
```

**Tree view display:**

```
CHR VMs
  └─ rose.chr.x86_64.qemu.7.22beta1
     Running - 192.168.64.10
     [▶️ Stop] [🔗 Connect] [ℹ️ Details] [🗑️ Delete]
```

**Command Execution via Guest Agent:**

For advanced features (Phase 3+), use guest agent to run RouterOS commands:

```typescript
async executeRouterOSCommand(vmName: string, command: string): Promise<string> {
  // Encode RouterOS command as base64
  const base64Command = Buffer.from(command, 'utf-8').toString('base64');
  
  const script = `
    tell application "UTM"
      set vm to virtual machine named "${vmName}"
      set result to execute vm at "/system/bin/routeros-cli" with arguments {"${command}"} ¬
        using input "${base64Command}" base64 encoding true output capturing true
      return result
    end tell
  `;
  
  return await execAppleScript(script);
}

// Usage:
const identity = await executeRouterOSCommand('router.chr', ':put [/system identity get name]');
```

```

## Documentation Updates Needed

### For applescript-patterns.md

Add note about guest agent limitations:

```markdown
### Guest Agent Commands (QEMU only, requires guest agent)

**Important:** These commands require QEMU guest agent running inside the VM. 
**RouterOS CHR does NOT include guest agent** - these features will not work with CHR VMs.

Commands that won't work:
- `query ip` - Cannot query IP addresses (use RouterOS REST API instead)
- `execute` - Cannot run commands in guest (use serial console or RouterOS CLI)
- `open file` - Cannot access guest files (RouterOS has no user-accessible filesystem)

For CHR VMs, use these alternatives:
- IP detection: Query RouterOS REST API `/rest/ip/address`
- Command execution: Use RouterOS REST API or serial console PTY
- Status monitoring: Use UTM's `get status` (works without guest agent)
```

### For Phase 2 Implementation

**Current Phase 2 scope (no changes needed):**

- ✅ VM listing with status (works without guest agent)
- ✅ Start/Stop/Delete commands (work without guest agent)
- ✅ VM details modal (don't show IP, or show "Connect to view")

**Defer to Phase 3:**

- IP address detection and display
- Serial console integration
- Advanced networking (port forwarding, bridged mode)

## Conclusion (Updated 2026-02-27)

**Status: ❌ CHR QEMU guest agent does NOT respond on macOS/QEMU test environment**

Despite MikroTik documentation claims and Proxmox community reports of working guest agent:

- CHR 7.21.3 stable does not respond to guest agent queries on macOS Intel/QEMU 10.2.1/HVF
- Tested across CPU models: default, host, qemu64, kvm64 (forum suggestion)
- Proper QGA protocol framing confirmed with control VM validation
- Control VM (Debian guest) responds successfully on same host/QEMU setup
- Socket exists, VM boots, but no response from CHR guest agent

**Documentation vs Reality:**

- ✅ MikroTik docs explicitly claim guest agent support (`guest-info`, `guest-network-get-interfaces`, `guest-file-*`, `guest-exec`)
- ✅ Proxmox community reports show working examples (Linux KVM hosts)
- ❌ macOS/QEMU test environment shows consistent timeouts
- ⚠️ Unknown if this is macOS/HVF-specific, QEMU version-specific, or CHR configuration issue

**Support Ticket Prepared:**

- Minimal reproducible script created: `scripts/repro-chr-qga-macos.sh`
- Full evidence document: `docs/mikrotik-support-ticket-qga.md`
- Forum community inquiry: `docs/mikrotik-forum-post-qga.md`

**Recommendation for TikBook Extension:**

**Phase 2-3:** Do NOT rely on UTM guest agent API for CHR IP detection. Use alternative approaches:

1. **RouterOS REST API** (requires knowing IP beforehand - chicken-and-egg problem)
2. **Parse UTM configuration** to document expected network setup
3. **Network scanning** on known UTM subnet ranges
4. **Serial console automation** to query RouterOS directly

**Phase 2 Impact:** None - VM management (start/stop/delete/status) works without guest agent.

**Phase 3 Planning:** IP detection will require more complex solutions than guest agent `query ip`:

- Parse UTM VM config to show expected subnet/network mode
- Provide manual IP entry UI for user to document their CHR IPs
- Integrate with RouterOS REST API once connection is established
- Consider serial console PTY integration for automated IP discovery

**Action Items:**

1. ✅ Support ticket prepared for MikroTik (with minimal repro script)
2. ✅ Forum post prepared to query community experience
3. ⚠️ Monitor MikroTik response to determine if this is expected behavior
4. Phase 3: Implement alternative IP detection methods (do not wait for guest agent fix)

## References

**MikroTik Documentation:**

- CHR → Guest tools → KVM: Claims guest agent support with full command list
- Commands documented: `guest-info`, `guest-network-get-interfaces`, `guest-file-*`, `guest-exec`

**Community Evidence (Proxmox/Linux KVM):**

- Forum posts demonstrating successful qemu-ga usage with RouterOS CHR
- Commands executed via Proxmox/KVM with virtio-serial channel
- RouterOS CLI commands sent as base64-encoded `input-data`

**Our Testing (macOS/QEMU):**

- Reproduction script: `scripts/repro-chr-qga-macos.sh`
- Control validation: `scripts/control-qga-ubuntu-macos.sh`
- Support ticket: `docs/mikrotik-support-ticket-qga.md`
- Forum inquiry: `docs/mikrotik-forum-post-qga.md`
- QEMU learnings: `docs/qemu-macos-chr-direct-testing.md`

**UTM Documentation:**

- docs/UTM.sdef - Official AppleScript dictionary with guest agent suite
- docs/applescript-patterns.md - Working patterns for UTM integration

**Technical Specs:**

- QEMU Guest Agent Protocol: <https://wiki.qemu.org/Features/GuestAgent>
- virtio-serial: <https://www.qemu.org/docs/master/specs/vhost-user.html>
