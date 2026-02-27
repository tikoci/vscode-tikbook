================================================================================
CHR IP ADDRESS DETECTION EXPERIMENTS
================================================================================
Date: 2026-02-27T22:15:18.379Z
Platform: darwin x64
UTM Path: /Applications/UTM.app/Contents/MacOS/utmctl

Purpose: Determine best approach for getting CHR VM IP addresses in UTM

Research Context:
  - docs/chr-qemu-guest-agent-research.md suggests guest agent works
  - Community evidence from Proxmox/KVM confirms guest agent in CHR
  - NOT YET TESTED in practice with UTM + CHR

What we will test:
  1. UTM guest agent "query ip" command
  2. Requirements: virtio-serial device, VM running, guest agent enabled
  3. Alternative approaches if guest agent fails
  4. What features this unlocks for TikBook

================================================================================


============================================================
EXPERIMENT 1: Detect Available CHR VMs
============================================================
Goal: Find CHR VMs to test with

Total VMs found: 4

  started    chr.x86_64.apple.7.21.3 ✓ CHR?
  started    chr.x86_64.qemu.7.21.3 ✓ CHR?
  stopped    chr.x86_64.qemu.7.21.2 ✓ CHR?
  started    chr.qemu.diag.serial ✓ CHR?

✓ Found 4 potential CHR VM(s)
  - Running: 3
  - Stopped: 1

Result: VM detection successful
        Ready to test with: "chr.x86_64.apple.7.21.3"

============================================================
EXPERIMENT 2: QEMU Guest Agent - Query IP
============================================================
Goal: Test UTM's "query ip" command with CHR VM

Background:
  - UTM supports QEMU guest agent via AppleScript
  - Command: query ip <vm> returns list of IP addresses
  - Requires: VM running, virtio-serial device, guest agent in VM
  - Research suggests CHR includes guest agent (qemu-ga)

Using existing running QEMU VM: chr.x86_64.qemu.7.21.3
Testing with VM: "chr.x86_64.qemu.7.21.3"
Provision info: backend=qemu arch=x86_64 version=7.21.3 created=false
Runtime serial ports:
  serial id=0, iface=unavailable, addr=, port=0
  serial id=1, iface=ptty, addr=/dev/ttys001, port=0

Testing: query ip command...
❌ Guest agent query ip FAILED

Error: Command failed: osascript -e '
		tell application "UTM"
			set vm to virtual machine named "chr.x86_64.qemu.7.21.3"
			set ipList to query ip of vm
			return ipList as list
		end tell
	'
103:117: execution error: UTM got an error: The QEMU guest agent is not running or not installed on the guest. (-2700)


Readiness retry: waiting up to 120s for guest agent startup...
  retry 1/12: still unavailable (guest agent not running)
  retry 2/12: still unavailable (guest agent not running)

============================================================
EXPERIMENT 3: QEMU Guest Agent - Execute Command
============================================================
Goal: Test executing RouterOS commands via guest agent

Background:
  - UTM guest agent supports "execute" command
  - Can run arbitrary commands inside CHR
  - RouterOS commands must be valid CLI syntax
  - This unlocks powerful automation features

Testing with VM: "chr.x86_64.qemu.7.21.3"
Provision info: backend=qemu arch=x86_64 version=7.21.3 created=false

Testing: execute command (get system identity)...
❌ Guest agent execute FAILED

Error: Command failed: osascript -e '
				tell application "UTM"
					set vm to virtual machine named "chr.x86_64.qemu.7.21.3"
					tell (execute of vm at "/system/bin/routeros-cli" with arguments {":put [/system identity get name]"} with output capturing)
						repeat
							set res to get result
							if exited of res then exit repeat
						end repeat
						return output text of res
					end tell
				end tell
			'
101:218: execution error: UTM got an error: The QEMU guest agent is not running or not installed on the guest. (-2700)


Note: Execute may fail even if query ip works
  - Depends on RouterOS CLI being accessible
  - May require specific guest agent version
  - Less critical than query ip for Phase 3

Result: Execute command failed - query ip is sufficient for MVP

============================================================
EXPERIMENT 4: Alternative - Parse UTM Configuration
============================================================
Goal: Get network config from VM config files (fallback approach)

Background:
  - UTM stores VM configs in ~/Library/Containers/...
  - config.plist contains network settings
  - Can determine network mode and expected IP range
  - Does NOT give actual IP, but can predict default IP

Checking VM configs in: /Users/amm0/Library/Containers/com.utmapp.UTM/Data/Documents

Found 4 VM bundle(s)

Examining: chr.qemu.diag.serial.utm

Network configuration indicators:
  NAT mode: ✗
  Bridged mode: ✗
  Shared mode: ✓


Result: Config parsing possible but limited
        Recommend guest agent as primary approach
        Config parsing useful for documentation/hints only

============================================================
EXPERIMENT 5: Strategy Recommendation & Roadmap
============================================================
Goal: Determine best implementation approach for TikBook

## Summary of Findings

### Approach A: QEMU Guest Agent (RECOMMENDED)

Status: See Experiment 2 results above

Pros:
  ✅ Official UTM API (maintains compatibility)
  ✅ Fast and reliable (if guest agent available)
  ✅ No network scanning or guessing
  ✅ Returns all IPs (can filter for primary)
  ✅ Works even if REST API not configured yet

Cons:
  ❌ Requires VM to be running
  ❌ QEMU backend only (not Apple Virtualization)
  ❌ May fail if guest agent not available

Implementation:
  ```typescript
  async getVMIPAddress(vmName: string): Promise<string | null> {
    const script = `
      tell application "UTM"
        set vm to virtual machine named "${vmName}"
        set ipList to query ip vm
        return ipList as list
      end tell
    `;
    const result = await execAppleScript(script);
    const ips = result.split(", ");
    // Filter for first non-loopback IPv4
    return ips.find(ip => !ip.startsWith("127.") && !ip.includes(":")) || null;
  }
  ```

### Approach B: Parse UTM Config (FALLBACK)

Status: Tested in Experiment 4

Pros:
  ✅ Works when VM is stopped
  ✅ No guest agent needed
  ✅ Can document expected network settings

Cons:
  ❌ Does not give actual IP, only network mode
  ❌ UTM config format may change
  ❌ Requires file system access

Use case:
  - Show expected IP range in tree view when VM stopped
  - Documentation hints ("VM will get IP in 192.168.64.x range")
  - Not suitable for automatic connection

### Approach C: Query RouterOS REST API (COMPLEMENTARY)

Status: Already used in TikBook for connection management

Pros:
  ✅ Always accurate (source of truth)
  ✅ Works with any RouterOS device
  ✅ Already implemented in TikBook

Cons:
  ❌ Requires knowing IP beforehand (chicken-and-egg)
  ❌ Requires REST API to be configured and accessible

Use case:
  - Verify IP after guest agent detection
  - Update IP if changed (DHCP renewal)
  - Get additional network info (interfaces, addresses)

## Recommended Implementation Plan


### Phase 3a: Basic IP Detection (2-4 hours)

1. Implement getVMIPAddress() in utm-provider.ts
   - Try guest agent query ip first
   - Return null if guest agent unavailable
   - Log clear error messages for troubleshooting

2. Show IP in tree view for running VMs
   - TreeItem description: "running - 192.168.64.10"
   - Tooltip: Full IP list + network mode
   - Refresh on VM start/stop

3. Add context menu: "Connect to CHR"
   - Get IP via guest agent
   - Update TikBook connection settings
   - Test REST API connectivity
   - Show success/error notification

### Phase 3b: Enhanced Networking (4-6 hours)

1. Detect backend type (QEMU vs Apple)
   - Show warning if guest agent won't work
   - Suggest reconfiguring VM for QEMU

2. Config parsing for documentation
   - Show expected IP range when stopped
   - Display network mode (NAT/Bridged)

3. Automatic connection workflow
   - Start VM → wait for boot → query IP → test REST API → connect
   - Progress notifications at each step
   - Error recovery (retry, manual IP entry)

### Phase 3c: Advanced Features (Optional, 6-10 hours)

1. Guest agent command execution (Experiment 3)
   - Run RouterOS commands remotely
   - Export configuration
   - Automated setup scripts

2. Network monitoring
   - Track IP changes (DHCP renewal)
   - Detect connection loss
   - Auto-reconnect on network change

3. Multi-VM orchestration
   - Start multiple CHR VMs
   - Coordinate network setup
   - Test scenarios (CHR as router for other VMs)

## Next Steps


1. Review experiment results above (especially Experiment 2)
2. If guest agent WORKS:
   → Proceed with Phase 3a implementation
   → Update utm-provider.ts with getVMIPAddress()
   → Add IP display in tree view

3. If guest agent FAILS:
   → Investigate cause (backend type, virtio-serial, CHR version)
   → Test with different CHR versions
   → Consider config parsing + manual IP entry as fallback

4. Document findings:
   → Update docs/chr-qemu-guest-agent-research.md with test results
   → Update docs/applescript-patterns.md with working examples
   → Create docs/chr-ip-detection-guide.md for users

## Feature Impact Analysis


### What Guest Agent IP Detection Unlocks:


1. **One-Click CHR Connection**
   - User starts VM in TikBook tree view
   - Extension queries IP automatically
   - Connection settings updated
   - User just clicks "Run" on .rsc file
   - No manual IP configuration needed

2. **Seamless CHR Development Workflow**
   - Download CHR via "Add CHR VM" command
   - UTM imports and configures automatically
   - Start VM from TikBook
   - Extension detects IP and connects
   - Write/test RouterOS scripts immediately

3. **Multi-CHR Testing**
   - Run multiple CHR VMs (different versions)
   - Each gets detected and listed with IP
   - Switch between CHR instances easily
   - Test compatibility across RouterOS versions

4. **Integration with Copilot/AI Features**
   - Copilot can suggest: "Start CHR VM and run this script"
   - Extension handles VM start + IP detection + connection
   - User gets instant feedback on script results
   - AI can iterate on script based on CHR output

5. **Automated Testing/CI-CD**
   - Start CHR VM programmatically
   - Query IP when ready
   - Run test scripts via REST API
   - Validate script behavior
   - Stop VM and cleanup

6. **Better UX for Beginners**
   - No need to know what an IP address is
   - No manual network configuration
   - No guessing or scanning
   - "It just works" experience like Docker/containers

## Conclusion


The ability to detect CHR IP addresses via guest agent is a
**critical enabler** for TikBook's vision of seamless RouterOS
development in VS Code.

It transforms CHR VMs from "VMs you manage separately" to
"first-class development environments" that work like
containers but provide full RouterOS functionality.

**Recommendation:**
- Prioritize Phase 3a if Experiment 2 succeeds
- This unlocks major UX improvements
- Differentiates TikBook from manual VM workflows
- Enables future AI/Copilot features


================================================================================
EXPERIMENTS COMPLETE
================================================================================

✓ Results written to: /Users/amm0/Documents/vscode-tikbook/chr-ip-detection-experiments-results.md

  retry 3/12: still unavailable (guest agent not running)
  retry 4/12: still unavailable (guest agent not running)
  retry 5/12: still unavailable (guest agent not running)
  retry 6/12: still unavailable (error)
  retry 7/12: still unavailable (guest agent not running)
  retry 8/12: still unavailable (guest agent not running)
  retry 9/12: still unavailable (guest agent not running)
  retry 10/12: still unavailable (guest agent not running)
  retry 11/12: still unavailable (guest agent not running)
  retry 12/12: still unavailable (guest agent not running)
Version-matrix retry: testing an alternate CHR version (7.21.2)
Provisioning QEMU CHR VM for arch=x86_64 (forceCreate=true)
Downloading chr.x86_64.qemu.7.21.2.utm.zip
