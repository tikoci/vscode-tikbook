#!/bin/bash
# Standalone AppleScript test for UTM VM enumeration
# This allows debugging AppleScript syntax without running the full extension
# Usage: ./scripts/test-utm-applescript.sh

set -e

echo "Testing UTM AppleScript VM enumeration..."
echo "=========================================="

# Test 1: Simple VM listing (no property checks)
echo ""
echo "Test 1: List VM names only (baseline)"
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
echo "✅ Test 1 passed"

# Test 2: Check running property (different syntax variations)
echo ""
echo "Test 2: Check VM running status (possessive form)"
osascript << 'EOF'
tell application "UTM"
  set vmList to {}
  repeat with vm in virtual machines
    set vmName to name of vm
    set vmStatus to "stopped"
    -- Try possessive form: vm's is running
    if vm's is running then
      set vmStatus to "running"
    end if
    set vmData to {vmName, vmStatus}
    set end of vmList to vmData
  end repeat
  return vmList
end tell
EOF
echo "✅ Test 2 passed"
