#!/bin/bash
# UTM Delete Strategy Test - Find what works

echo "=========================================="
echo "Testing Multiple Delete Strategies"
echo "=========================================="
echo ""

# Get a stopped VM name
stopped_vm=$(osascript << 'EOF'
tell application "UTM"
    repeat with vm in virtual machines
        set vmStatus to (status of vm) as string
        if vmStatus = "stopped" then
            return name of vm
        end if
    end repeat
    return ""
end tell
EOF
)

if [ -z "$stopped_vm" ]; then
    echo "ERROR: No stopped VMs found"
    exit 1
fi

echo "Using VM: $stopped_vm"
echo ""

# Strategy 1: Direct delete (current approach)
echo "=========================================="
echo "Strategy 1: Direct Delete"
echo "=========================================="
osascript << 'EOF' 2>&1 || true
tell application "UTM"
    set vmToDelete to missing value
    repeat with vm in virtual machines
        if name of vm is "VMNAME_PLACEHOLDER" then
            set vmToDelete to vm
            exit repeat
        end if
    end repeat
    if vmToDelete is not missing value then
        try
            delete vmToDelete
            return "SUCCESS"
        on error errMsg
            return "FAILED: " & errMsg
        end try
    else
        return "VM NOT FOUND"
    end if
end tell
EOF
# Replace placeholder after running
osascript << EOF 2>&1 || true
tell application "UTM"
    set vmToDelete to missing value
    repeat with vm in virtual machines
        if name of vm is "$stopped_vm" then
            set vmToDelete to vm
            exit repeat
        end if
    end repeat
    if vmToDelete is not missing value then
        try
            delete vmToDelete
            return "SUCCESS - Direct delete worked"
        on error errMsg number errNum
            return "FAILED (err " & errNum & "): " & errMsg
        end try
    else
        return "VM NOT FOUND"
    end if
end tell
EOF

echo ""
echo "=========================================="
echo "Strategy 2: Delete with Forced State Check"
echo "=========================================="
osascript << EOF 2>&1 || true
tell application "UTM"
    set vmToDelete to missing value
    set actualStatus to ""
    
    repeat with vm in virtual machines
        if name of vm is "$stopped_vm" then
            set vmToDelete to vm
            exit repeat
        end if
    end repeat
    
    if vmToDelete is missing value then
        return "VM NOT FOUND"
    end if
    
    -- Check state before delete
    set actualStatus to (status of vmToDelete) as string
    
    try
        delete vmToDelete
        return "SUCCESS - Deleted (was status: " & actualStatus & ")"
    on error errMsg number errNum
        return "FAILED (status was: " & actualStatus & ", err " & errNum & ": " & errMsg
    end try
end tell
EOF

echo ""
echo "=========================================="
echo "Strategy 3: Check if Any Flag Prevents Delete"
echo "=========================================="
osascript << EOF 2>&1 || true
tell application "UTM"
    set vmToCheck to missing value
    
    repeat with vm in virtual machines
        if name of vm is "$stopped_vm" then
            set vmToCheck to vm
            exit repeat
        end if
    end repeat
    
    if vmToCheck is missing value then
        return "VM NOT FOUND"
    end if
    
    -- Try to inspect what might block deletion
    set objInfo to ""
    set objInfo to objInfo & "Name: " & name of vmToCheck & "\n"
    set objInfo to objInfo & "Status: " & ((status of vmToCheck) as string) & "\n"
    
    -- Try to check if running
    try
        if is running of vmToCheck then
            set objInfo to objInfo & "Is Running: true (THIS IS THE PROBLEM!)\n"
        else
            set objInfo to objInfo & "Is Running: false\n"
        end if
    on error
        set objInfo to objInfo & "Is Running: (error checking)\n"
    end try
    
    return objInfo
end tell
EOF

echo ""
echo "=========================================="
echo "Done - Review output above for patterns"
echo "=========================================="
