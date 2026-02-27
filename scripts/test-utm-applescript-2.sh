#!/bin/bash
# Extended AppleScript syntax tests
# Testing different ways to access "is running" property

set -e

echo "Testing different AppleScript property access patterns..."
echo "==========================================================="

# Test 1: Using 'get' explicitly
echo ""
echo "Test 1: Using 'get' keyword"
osascript << 'EOF'
tell application "UTM"
  set vmList to {}
  repeat with vm in virtual machines
    set vmName to name of vm
    set vmStatus to "stopped"
    if (get is running of vm) then
      set vmStatus to "running"
    end if
    set vmData to {vmName, vmStatus}
    set end of vmList to vmData
  end repeat
  return vmList
end tell
EOF
echo "✅ Test 1 passed"
