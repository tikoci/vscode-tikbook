#!/bin/bash
# Alternative approach: Get VM data as structured output

set -e

echo "Testing: Extract VM properties as structured data"
echo "=================================================="

osascript << 'EOF'
tell application "UTM"
  set vmList to {}
  repeat with vm in virtual machines
    set vmName to name of vm
    -- Get all properties as separate values we can work with
    set vmProps to properties of vm
    set vmData to {vmName}
    set end of vmList to vmData
  end repeat
  
  -- Return as JSON-like string we can parse
  set resultText to ""
  repeat with vmData in vmList
    set resultText to resultText & item 1 of vmData & linefeed
  end repeat
  
  return resultText
end tell
EOF
