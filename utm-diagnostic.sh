#!/bin/bash
# 
# UTM AppleScript Diagnostic Shell Script
# Simple direct testing of UTM AppleScript without VS Code extension overhead
#
# Usage: chmod +x utm-diagnostic.sh && ./utm-diagnostic.sh
#

set -e

echo "=========================================="
echo "UTM VM AppleScript Diagnostics"
echo "=========================================="
echo ""

# Function to run AppleScript
run_apple_script() {
    osascript << 'EOF'
tell application "UTM"
    set vmList to ""
    repeat with vm in virtual machines
        set vmName to name of vm
        set vmStatus to (status of vm) as string
        set vmList to vmList & vmName & " | status=" & vmStatus & linefeed
    end repeat
    return vmList
end tell
EOF
}

# 1. List all VMs with detailed status
echo "1. Current VM List (with details)"
echo "=========================================="
run_apple_script

# 2. Identify running and stopped VMs
echo ""
echo "2. Identifying VMs by status"
echo "=========================================="
osascript << 'EOF' || true
tell application "UTM"
    set runningCount to 0
    set stoppedCount to 0
    
    repeat with vm in virtual machines
        set vmStatus to (status of vm) as string
        if vmStatus = "started" then
            set runningCount to runningCount + 1
            log "RUNNING: " & name of vm
        else if vmStatus = "stopped" then
            set stoppedCount to stoppedCount + 1
            log "STOPPED: " & name of vm
        else
            log "OTHER: " & name of vm & " (status=" & vmStatus & ")"
        end if
    end repeat
    
    return "Running: " & runningCount & " | Stopped: " & stoppedCount
end tell
EOF

# 3. Test delete on stopped VM
echo ""
echo "3. Testing DELETE operation on stopped VM"
echo "=========================================="

# The stopped VM is: chr.aarch64.qemu.7.20.8 (from step 2 output above)
osascript << 'EOF' 2>&1 || true
tell application "UTM"
    set vmName to "chr.aarch64.qemu.7.20.8"
    set vmToDelete to missing value
    set preStatus to ""
    
    -- Find the VM
    repeat with vm in virtual machines
        if name of vm is vmName then
            set vmToDelete to vm
            set preStatus to (status of vm) as string
            exit repeat
        end if
    end repeat
    
    if vmToDelete is missing value then
        log "ERROR: VM not found: " & vmName
        return "VM NOT FOUND"
    end if
    
    log "FOUND VM - pre-delete status: " & preStatus
    
    -- Try to delete
    try
        delete vmToDelete
        delay 0.5
        log "SUCCESS: VM deleted"
        return "DELETED"
    on error errMsg number errNum
        log "FAILED: " & errMsg & " (error code: " & errNum & ")"
        return "DELETE_FAILED: " & errMsg
    end try
end tell
EOF

echo ""
echo "=========================================="
echo "Diagnostics complete"
echo "=========================================="
