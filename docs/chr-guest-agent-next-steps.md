# CHR QEMU Guest Agent - Next Investigation Steps

**Status:** ✅ INVESTIGATION COMPLETED (2026-02-27)  
**This document is now historical** - kept for reference on investigation approach.

**Results:**
- Direct QEMU testing completed (see [qemu-macos-chr-direct-testing.md](./qemu-macos-chr-direct-testing.md))
- Control VM validation completed (Debian guest agent works on same host)
- CHR does NOT respond to guest agent on macOS/QEMU 10.2.1/HVF  
- Support ticket prepared: [mikrotik-support-ticket-qga.md](./mikrotik-support-ticket-qga.md)
- Forum post prepared: [mikrotik-forum-post-qga.md](./mikrotik-forum-post-qga.md)

**See [chr-qemu-guest-agent-research.md](./chr-qemu-guest-agent-research.md) for full findings.**

---

## Original Investigation Plan (Historical)

**Original Status:** Guest agent documented by MikroTik but failing in UTM testing  
**Last Updated:** 2026-02-27  
**Context:** Full findings in [chr-qemu-guest-agent-research.md](./chr-qemu-guest-agent-research.md)

## Quick Summary

- **Claim:** MikroTik docs say CHR includes guest agent (guest-info, guest-network-get-interfaces, etc.)
- **Reality:** UTM queries fail with "QEMU guest agent is not running or not installed" (-2700)
- **Mystery:** Config shows 0 serial ports, runtime shows 2 serial ports (ptty), but guest agent still unavailable
- **Goal:** Find hard data proving guest agent works OR proving it's a bug for support ticket

## Priority Actions (Ordered by Effort/Value)

### 1. Compare Manual UTM Creation vs mikropkl Import ⭐⭐⭐

**Hypothesis:** mikropkl configs may be missing UTM-specific guest agent enablement

**Steps:**
1. Manually create new VM in UTM GUI using same CHR 7.21.3 .img file
2. Boot and query guest agent: `tell application "UTM" ... query ip of vm`
3. Export config.plist from manual VM
4. Compare with mikropkl config: `diff manual.plist mikropkl.plist`
5. Look for differences in:
   - `QEMUGuestAgentEnabled` or similar boolean flags
   - Serial device configuration entries
   - QEMU arguments (`QEMUArguments` array)

**Success Criteria:** Manual VM guest agent works → mikropkl needs config fix

### 2. Capture UTM's QEMU Command Line ⭐⭐⭐

**Hypothesis:** Need to see actual QEMU invocation to identify missing arguments

**Steps:**
1. Start CHR VM in UTM
2. Run: `ps aux | grep qemu-system | grep chr.x86_64`
3. Capture full command line (look for `-chardev`, `-device virtio-serial`, `-device virtserialport`)
4. Compare against working Proxmox example from forums
5. Document missing arguments for mikropkl generation

**Success Criteria:** Identify specific QEMU args needed for guest agent

### 3. Test Non-CHR Linux VM in UTM ⭐⭐

**Hypothesis:** Validate UTM's guest agent implementation with known-working guest

**Steps:**
1. Download Alpine Linux or Ubuntu Server "virtual" image
2. Import to UTM, install `qemu-guest-agent` package
3. Query guest agent: `query ip of vm`
4. If works → CHR issue; if fails → UTM configuration issue

**Success Criteria:** Proves whether UTM's guest agent works at all

### 4. Check UTM Source/Issues for Guest Agent Config ⭐

**Hypothesis:** UTM may require specific configuration not documented in AppleScript API

**Steps:**
1. Search UTM GitHub repo for "guest agent" or "qemu-ga"
2. Look for configuration keys in Swift/ObjC code
3. Check closed issues for guest agent setup examples
4. Review UTM's QEMU wrapper for automatic virtio-serial setup

**Success Criteria:** Find UTM-specific requirements for guest agent

### 5. Try Different UTM Versions ⭐

**Hypothesis:** Guest agent support may be version-dependent

**Steps:**
1. Check current UTM version: `osascript -e 'tell application "UTM" to get version'`
2. Try latest stable UTM if not already on it
3. Try latest beta if stable fails
4. Document which UTM + QEMU backend versions tested

**Success Criteria:** Find working UTM version or rule out version issue

### 6. Protocol-Level Debugging (Advanced) ⭐

**Hypothesis:** Guest agent may be responding but UTM not recognizing it

**Steps:**
1. Find virtio-serial socket path used by UTM (check `/tmp/`, `/var/run/`, or UTM app bundle)
2. Try direct communication: `socat /path/to/socket -` then `{"execute":"guest-info"}`
3. Use packet capture if socket accessible: `socat -d -d -v /path/to/socket -`
4. Check for any response or timeout

**Success Criteria:** Determine if guest agent responds at protocol level

## Code Assets for Fresh Context

### Auto-Provisioning Helper

**File:** `src/test/integration/chr-vm-provisioning.ts`  
**Function:** `ensureRunningQemuCHRVM(options?)`

```typescript
// Usage in tests:
const vmName = await ensureRunningQemuCHRVM({
  preferredVersion: '7.21.3',
  forceCreate: false
});
```

### UTM AppleScript Queries

**Guest Agent Query:**
```applescript
tell application "UTM"
  set vm to virtual machine named "chr.x86_64.qemu.7.21.3"
  query ip of vm  -- Returns IP list or errors
end tell
```

**Config vs Runtime Serial Inspection:**
```applescript
-- Config (returns 0 for mikropkl imports):
tell application "UTM"
  set cfg to configuration of virtual machine named "vmName"
  return count of serial ports of cfg
end tell

-- Runtime (returns 2 with PTY paths):
tell application "UTM"
  set vm to virtual machine named "vmName"
  repeat with sp in serial ports of vm
    return (address of sp)  -- /dev/ttys001
  end repeat
end tell
```

## Evidence Collected So Far

**For MikroTik Support Ticket:**
- ✅ MikroTik docs explicitly document support
- ✅ Proxmox reports working with socat examples
- ✅ CHR 7.21.3, 7.21.2 both fail in UTM
- ✅ Error: "guest agent not running or not installed" (-2700)
- ✅ Serial channels exist at runtime (/dev/ttys001, /dev/ttys013)
- ✅ Boot-readiness timing ruled out (120s retry)
- ❌ Missing: QEMU command line args
- ❌ Missing: Manual UTM creation comparison
- ❌ Missing: Non-CHR Linux validation

## Quick Reference

**Current Test Setup:**
- Host: macOS + UTM (QEMU backend)
- CHR Source: tikoci/mikropkl GitHub releases
- Test File: `src/test/integration/chr-ip-detection.experiment.test.ts`
- Research Doc: `docs/chr-qemu-guest-agent-research.md`

**Key UTM AppleScript API:**
- `query ip of vm` - Guest agent IP query
- `serial ports of vm` - Runtime serial devices
- `serial ports of configuration of vm` - Config serial list
- `update configuration of vm with properties` - Mutate stopped VM config

**Known Working Elsewhere:**
- Proxmox: `socat /var/run/qemu-server/155.qga -` + `{"execute":"guest-info"}`
- KVM: MikroTik docs explicitly list guest-info, guest-network-get-interfaces, guest-file-*, guest-exec

## Success Definitions

**Ideal Outcome:**
- Find config/args that make guest agent work in UTM
- Update mikropkl generation with working pattern
- Document UTM-specific requirements

**Acceptable Outcome:**
- Conclusive evidence guest agent doesn't work in UTM due to CHR bug
- Hard data for MikroTik support ticket (QEMU args, protocol dumps, version matrix)
- Fallback to ARP-based detection with documented limitations

**Minimum Viable:**
- Understand exactly why guest agent fails
- Document whether issue is CHR, UTM, or configuration
- Clear decision: pursue fix vs accept limitation
