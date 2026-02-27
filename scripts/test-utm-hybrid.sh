#!/bin/bash
# Practical hybrid approach: AppleScript for names + process list for status

set -e

echo "Testing hybrid approach: Names via AppleScript, status via processes"
echo "===================================================================="

osascript << 'EOF'
tell application "UTM"
  set vmList to {}
  repeat with vm in virtual machines
    set vmName to name of vm
    -- Just return the name; status will be determined via process list
    set end of vmList to vmName
  end repeat
  return vmList
end tell
EOF

echo ""
echo "Which VMs are actually running (via ps):"
ps aux | grep -i "qemu\|utm" | grep -v grep | head -5
