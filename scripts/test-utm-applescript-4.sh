#!/bin/bash
# Test the correct property name and type handling

set -e

echo "Testing correct property access..."
echo "===================================="

# Test 1: Use 'running' property correctly
echo ""
echo "Test 1: Access 'running' property as boolean"
osascript << 'EOF'
tell application "UTM"
  if (count of virtual machines) > 0 then
    set vm to item 1 of virtual machines
    if running of vm then
      log "VM is running"
    else
      log "VM is not running"
    end if
  end if
end tell
EOF
echo "✅ Test 1 passed"

# Test 2: Full VM enumeration with correct property
echo ""
echo "Test 2: Full VM enumeration with running status"
osascript << 'EOF'
tell application "UTM"
  set vmList to {}
  repeat with vm in virtual machines
    set vmName to name of vm
    set vmStatus to "stopped"
    if running of vm then
      set vmStatus to "running"
    end if
    set vmData to {vmName, vmStatus}
    set end of vmList to vmData
  end repeat
  return vmList
end tell
EOF
echo "✅ Test 2 passed - VM enumeration working!"
