#!/bin/bash
# Investigate UTM VM object properties

set -e

echo "Investigating UTM VM object properties..."
echo "=========================================="

# Test 1: Get class and properties of first VM
echo ""
echo "Test 1: Inspect first VM object"
osascript << 'EOF'
tell application "UTM"
  if (count of virtual machines) > 0 then
    set vm to item 1 of virtual machines
    set vmName to name of vm
    log "VM Name: " & vmName
    log "VM class: " & class of vm
  end if
end tell
EOF
echo "✅ Test 1 passed"

# Test 2: Try different property names
echo ""
echo "Test 2: Try 'running' property (without 'is')"
osascript << 'EOF'
tell application "UTM"
  if (count of virtual machines) > 0 then
    set vm to item 1 of virtual machines
    log "running: " & running of vm
  end if
end tell
EOF
echo "✅ Test 2 passed"
