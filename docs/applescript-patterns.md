---
name: 'AppleScript Integration Patterns'
description: 'Tested patterns and anti-patterns for AppleScript in VS Code extensions'
---

# AppleScript Integration Patterns

This document captures working patterns for AppleScript integration, based on:

- TikBook V1 CHR manager (legacy applescript code that worked in production)
- Phase 2 UTM provider integration (current iteration)
- Standalone test scripts and unit test validation
- **UTM.sdef official dictionary** (see `docs/UTM.sdef`)

**Purpose:** Guide future AppleScript work and document what actually works vs. what fails at runtime.

---

## Official UTM AppleScript API

**Reference:** `docs/UTM.sdef` - UTM's official AppleScript dictionary

### Virtual Machine Class (line 114+)

**Properties:**

- `name` (text, read-only) - VM name
- `id` (text, read-only) - unique identifier
- `status` (status enum, read-only) - current running status (**primary property we use**)
- `backend` (backend enum, read-only) - "apple", "qemu", or "unavailable"

**Commands:**

- `start` - start or resume the VM
  - Optional parameter: `saving` (boolean, default true) - save VM changes to disk
- `stop` - stop the VM
  - Optional parameter: `by` (stop method) - "force", "kill", or "request" (default)
  - "request" sends power down to guest OS (graceful shutdown, may be ignored)
  - "force" sends stop request to backend (forceful)
  - "kill" terminates backend process (immediate kill)
- `suspend` - pause the VM to memory
  - Optional parameter: `saving` (boolean, default false) - save state to disk
- `delete` - delete the VM (**no confirmation, permanent!**)
- `duplicate` - clone a VM with optional configuration changes
- `import` - import .utm file as new VM
- `export` - export VM to specified file location

**Elements:**

- `serial port` - serial ports exposed to host (useful for Phase 3 serial console access)
  - Properties: `id`, `interface` (ptty/tcp/unavailable), `address`, `port`
  - PTY interface: pseudo-terminal for direct serial access
  - TCP interface: network-accessible serial port (useful for remote access)

### Status Enumeration (line 36-45)

Official values returned by `get status of vm`:

- `stopped` - VM is not running
- `starting` - VM is starting up
- `started` - **VM is running** (map to "running" in UI)
- `pausing` - VM is going to pause
- `paused` - VM is paused
- `resuming` - VM is resuming from pause
- `stopping` - VM is stopping

### Backend Enumeration (line 31-35)

Values for VM backend type:

- `apple` - Apple Virtualization.framework (ARM64 Apple Silicon)
- `qemu` - QEMU emulator (x86_64, ARM64, etc.) - **CHR VMs use this**
- `unavailable` - VM configuration not available

### Guest Agent Commands (QEMU only, requires guest agent)

**⚠️ RouterOS CHR guest agent status: UNCONFIRMED on macOS**

**Current testing status:**

- MikroTik documentation claims QEMU guest agent support
- Community reports show it works on Proxmox (Linux KVM)
- **macOS testing (Intel/QEMU 10.2.1/HVF):** CHR does NOT respond to guest agent queries
- Control VM (Debian) responds successfully on same macOS/QEMU setup
- Support ticket prepared for MikroTik to investigate

**Until resolved, do NOT rely on guest agent for CHR IP detection in TikBook extension.**

Requirements (if it worked):

- VM must have virtio-serial device configured (UTM adds automatically for QEMU VMs)
- QEMU guest agent must be running inside guest OS
- VM must be running for guest agent to respond

Commands that would work (if guest agent responded):

- `query ip` - Get all IP addresses from network interfaces
  - Returns list of text: IPv4 addresses first, then IPv6
  - **Would be perfect for Phase 3** if it worked on macOS
- `execute` - Run commands in guest OS
  - For CHR: would execute RouterOS CLI commands
  - Use `using input` with `base64 encoding true` for script execution
  - Set `output capturing true` to capture command results

Not applicable for CHR:

- `open file` - RouterOS has no user-accessible filesystem

**Example (theoretical, currently non-functional on macOS):**

```applescript
tell application "UTM"
  set vm to virtual machine named "router.chr"
  set ipList to query ip vm
  -- Returns: {"192.168.64.10", "fe80::..."}
  -- Filter out link-local IPv6: 
  set ipv4Only to {}
  repeat with ip in ipList
    if ip does not start with "fe80:" then
      set end of ipv4Only to ip
    end if
  end repeat
  return ipv4Only
end tell
```

**Example - Execute RouterOS command:**

```applescript
tell application "UTM"
  set vm to virtual machine named "router.chr"
  
  -- Get system identity
  set result to execute vm at "/system/bin/routeros-cli" ¬
    with arguments {":put [/system identity get name]"} ¬
    output capturing true
  
  -- Wait for completion and get output
  update result
  return output of result
end tell
```

**Community Evidence:**
Working example from Proxmox/KVM (same QEMU guest agent protocol):

```bash
# Connect to guest agent socket
socat /var/run/qemu-server/155.qga -

# Send command (RouterOS command must be base64 encoded)
{"execute": "guest-exec", "arguments": {
  "input-data": "OmlwIGFkZHJlc3MgYWRkIGFkZHJlc3M9MTkyLjE2OC4wLjEvMjQgaW50ZXJmYWNlPWV0aGVyMTs=",
  "capture-output": true
}}

# Decoded: :ip address add address=192.168.0.1/24 interface=ether1;
```

---

## VM Status Enumeration

### ✅ What Works: Status via `get status of` Query

**Source:** TikBook V1 CHR manager + Phase 2 implementation

```applescript
-- Single VM status check
tell application "UTM"
  set vm to virtual machine named "RouterOS"
  set current to get status of virtual machine named "RouterOS" as string
  -- Returns strings like: "stopped", "started", "paused", "starting", "stopping", etc.
end tell

-- All VMs with status in one call (RECOMMENDED)
tell application "UTM"
  set vmData to {}
  repeat with vm in virtual machines
    set vmName to name of vm
    set vmStatus to (get status of vm) as string
    set vmInfo to vmName & "|" & vmStatus
    set end of vmData to vmInfo
  end repeat
  
  set output to ""
  repeat with info in vmData
    set output to output & info & linefeed
  end repeat
  return output
end tell
```

**Key Points:**

- Use `get status ... as string` - explicit type cast prevents issues
- Status values: "started" (running), "stopped", "paused", "starting", "stopping", "pausing", "resuming"
- Works reliably for checking VM state
- Can query all VMs in a single AppleScript call (efficient)
- Use pipe-delimiter (|) or other separator for parsing in TypeScript

### ❌ What Doesn't Work: Direct Property Access

**Attempted Pattern:**

```applescript
if running of vm then  -- ✗ Error: "Can't get running of..."
if is running of vm then  -- ✗ Error: "Expected expression but found 'is'"
if (is running of vm) then  -- ✗ Still fails
```

**Why:** UTM's AppleScript dictionary doesn't expose a `running` or `is running` property on virtual machine objects. These are not queryable properties—only the `status` string is reliably available.

**Solution:** Use `get status of vm as string` (see above) which returns "started", "stopped", etc.

---

## VM Lifecycle Operations

### ✅ VM State Management

**Source:** TikBook V1 (lines 120-180 of legacy code)

```applescript
script CHR
  on ensure at desired on loop : 0 out of maxloop : 30 given install:doinstall : true
    -- Handle missing VM
    if not (exists) then
      if doinstall then
        make
        ensure at desired on (loop + 1)  -- recursive: wait for state
      end if
    end if
    
    -- Get current state
    tell application "UTM"
      set current to get status of virtual machine named (my name) as string
    end tell
    
    -- Check if done
    if desired is current then
      return true
    end if
    
    -- Handle transitive states (stopped/paused equivalence)
    if desired is "stopped" and current is "paused" then
      return true  -- close enough
    end if
    
    -- Command state change
    if desired is "stopped" then tell application "UTM" to stop virtual machine named (my name)
    if desired is "started" then tell application "UTM" to start virtual machine named (my name)
    if desired is "paused" then tell application "UTM" to suspend virtual machine named (my name)
    
    -- Retry with backoff
    delay 1
    ensure at desired on (loop + 1)
  end ensure
end script
```

**Key Patterns:**

1. **Recursive retry with backoff** - `delay 1` between checks, max iterations
2. **State equivalence** - treat "stopped" and "paused" as equivalent if needed
3. **Transitive state handling** - "starting", "stopping", "pausing" are temporary; wait for stable state
4. **Explicit commands** - distinct commands for each desired state

### Available Commands

```applescript
tell application "UTM"
  -- Query operations
  set vm to virtual machine named "Name"
  set status to get status of vm as string
  set config to get configuration of vm
  set serial_addr to get address of serial port of vm
  
  -- Control operations
  start virtual machine named "Name"
  stop virtual machine named "Name"
  suspend virtual machine named "Name"  -- pause
  
  -- Management operations
  make new virtual machine with properties {name:..., backend:apple, configuration:...}
  delete virtual machine named "Name"
end tell
```

---

## Named Access Patterns

### ✅ Safe Existence Checking

**Source:** TikBook V1 (lines 75-90)

```applescript
on exists
  tell application "UTM"
    return exists virtual machine named (my name)  -- Returns boolean
  end tell
end exists
```

**Why it works:**

- `exists` function returns true/false safely
- No error thrown if VM doesn't exist
- Can use in conditionals directly

### ✅ Error Handling Pattern

```applescript
on delete
  try
    ensure at "stopped"  -- Stop before delete
  on error
    log "delete failed to stop, still trying to delete"
    -- Continue anyway - don't let transitive errors block cleanup
  end try
  
  if (exists) then 
    tell application "UTM" to delete virtual machine named (my name)
  end if
end delete
```

**Pattern:** Chain operations with `try/on error` around intermediate steps, proceed with intent anyway.

---

## Configuration and Properties

### ✅ Complex Property Records

**Source:** TikBook V1 (line 150)

```applescript
tell application "UTM"
  set vm to make new virtual machine with properties {
    backend: apple,
    configuration: {
      name: "RouterOS",
      notes: "Description here"
    }
  }
  set cfg to configuration of vm
  set drives of cfg to {{removable:false, host size:128, source:imgfilepath as POSIX file}}
  update configuration of vm with cfg
end tell
```

**Patterns:**

- Nested records for configuration
- File paths must be cast: `as POSIX file`
- Fetch config, modify it, then `update configuration`
- Arrays of records: `{{...}, {...}}`

### Serial Port Access

```applescript
tell application "UTM"
  set serial_addr to get address of serial port of virtual machine named "RouterOS"
  -- Returns string like "/dev/ttys000"
end tell
```

---

## Application Detection (Avoid Permission Prompts)

### ✅ Use Shell to Check App Existence

**Source:** TikBook V1 (lines 98-108)

```applescript
on exists
  try
    -- Use shell to avoid prompting for UTM location
    log "checking if UTM is installed using shell"
    do shell script "osascript -e 'exists application \"UTM\"'"
    return true
  on error
    log "check for UTM failed, assuming not installed"
    return false
  end try
end exists
```

**Why:**

- Direct `exists application "UTM"` in AppleScript prompts user
- Wrapping in `do shell script "osascript -e ..."` avoids prompt
- Shell command runs in subprocess without interaction
- Safe inside `try/on error` block

### ✅ Boolean Return Pattern

```applescript
script UTMHelpers
  property installed : false
  
  on exists
    -- uses shell to test application is valid
    do shell script "osascript -e 'exists application \"UTM\"'"
    set installed to true
    return true
  on error
    set installed to false
    return false
  end try
  end exists
  
  on verify()
    if not (exists) then
      set downloadbuttons to {"Using App Store", "Using Homebrew"}
      set downloadurls to {...}
      set gotobutton to button returned of (display alert ...)
      repeat with num from 1 to (length of downloadbuttons)
        if gotobutton is item num of downloadbuttons then
          open location item num of downloadurls
        end if
      end repeat
      return false
    end if
    return true
  end verify
end script
```

**Pattern:** Cache boolean state in property, check once, reuse result.

---

## Scripting Best Practices

### Module/Script Bundling

Break code into reusable script objects:

```applescript
script CHRDiskImage
  property baseUrl : "https://github.com/.../download/"
  
  on download with replace
    -- download logic
  end download
end script

script CHR
  on make
    tell CHRDiskImage to set imgfilepath to download without replace
    -- create VM with Image
  end make
end script

script userScript
  tell CHR
    ensure at "started"
    open  -- show serial console
  end tell
end script

run userScript
```

**Advantages:**

- Encapsulation of related operations
- Reusable properties and handlers
- Testable in isolation via `scripts/test-*.sh`

### Logging Pattern

```applescript
on ensure at desired on loop : 0 out of maxloop : 30
  log "ensuring " & desired & ", currently " & current & " (on " & loop & " out of " & maxloop & ")"
  delay 1
  ensure at desired on (loop + 1)
end ensure
```

**Pattern:** Log state transitions with context for debugging retry logic.

---

## Testing AppleScript (Before Integration)

### Standalone Test Script

**File:** `scripts/test-utm-applescript.sh`

```bash
#!/bin/bash
set -e

echo "Testing UTM AppleScript patterns..."

# Test 1: Check UTM existence (via safe shell method)
osascript << 'EOF'
do shell script "osascript -e 'exists application \"UTM\"'"
EOF
echo "✅ UTM exists check passed"

# Test 2: List VM names
osascript << 'EOF'
tell application "UTM"
  set vmList to {}
  repeat with vm in virtual machines
    set vmName to name of vm
    set end of vmList to vmName
  end repeat
  return vmList
end tell
EOF
echo "✅ VM enumeration passed"

# Test 3: Get status
osascript << 'EOF'
tell application "UTM"
  set vm to virtual machine named "rose.chr.x86_64.qemu.7.22beta1"
  get status of vm as string
end tell
EOF
echo "✅ Status query passed"
```

**Workflow:**

1. Write test script with isolated AppleScript blocks
2. Run with `./scripts/test-utm-applescript.sh`
3. Fix syntax errors before integration
4. Commit test script as reference documentation

### Unit Test for Sandboxing

```typescript
test('AppleScript pattern: VM enumeration', async () => {
  const script = `
    tell application "UTM"
      set vmList to {}
      repeat with vm in virtual machines
        set vmName to name of vm
        set end of vmList to vmName
      end repeat
      return vmList
    end tell
  `
  const { stdout } = await execFileAsync('osascript', ['-e', script])
  assert.ok(stdout !== null, 'Expected AppleScript output')
})
```

---

## Error Handling

### AppleScript Error Codes

From implementation experience:

| Error | Meaning | Solution |
|-------|---------|----------|
| `syntax error: Expected expression` | Property name not recognized or syntax wrong | Test in `osascript` first; check AppleScript dictionary |
| `Can't get X of Y` | Property doesn't exist on object class | Query `properties of` object or use shell fallback |
| `-1728` | Object not found (e.g., VM name doesn't exist) | Check `exists` before accessing |
| `execution error: Can't make ... into type` | Type coercion failed | Add explicit `as string`, `as integer`, etc. |

### Safe Error Wrapping

```typescript
async listVMs(): Promise<VM[]> {
  try {
    const vmList = await this.runAppleScript(`...`)
    return parseVMs(vmList)
  } catch (error) {
    log.error(`<UTMProvider.listVMs> error: ${error instanceof Error ? error.message : String(error)}`)
    // Provide helpful context about what failed
    if (error instanceof Error && error.message.includes('syntax error')) {
      throw new Error(`AppleScript syntax error (report to maintainer): ${error.message}`)
    }
    throw error
  }
}
```

---

## When NOT to Use AppleScript

1. **High-frequency polling** - queries slow; use process list or file system watch
2. **Complex data transformation** - do in TypeScript/Node, not AppleScript
3. **Cross-platform code** - AppleScript macOS-only; use abstractions
4. **Things that shell commands do better** - e.g., process enumeration via `ps`

**Example:** Instead of AppleScript-only for VM status, use hybrid:

- AppleScript: names only
- Shell/process list: running status
- Node.js: data combination and transformation

---

## Reference: UTM AppleScript Dictionary

Useful properties and methods (for reference when working on features):

```applescript
-- VM Queries
virtual machine named <string>  -- Access by name
status of vm as string  -- "stopped", "started", etc.
configuration of vm  -- Complex config object
serial port of vm
address of serial port  -- e.g. "/dev/ttys000"

-- VM Commands
start virtual machine named <string>
stop virtual machine named <string>
suspend virtual machine named <string>  -- pause
delete virtual machine named <string>

-- VM Creation
make new virtual machine with properties {
  backend: apple,
  configuration: {...}
}

-- Existence Checks
exists application "UTM"
exists virtual machine named <string>
```

---

## Related Documents

- [testing.instructions.md](.github/instructions/testing.instructions.md) - Testing AppleScript in unit tests
- [phase2-notes.md](phase2-notes.md) - Phase 2 implementation learnings
- [scripts/test-utm-applescript*.sh](../scripts/) - Standalone test scripts
