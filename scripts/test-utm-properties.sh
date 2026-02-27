#!/bin/bash
# Check what properties are available on UTM VM objects

set -e

echo "Discovery: Available properties on UTM VM objects"
echo "=================================================="

osascript << 'EOF'
tell application "UTM"
  if (count of virtual machines) > 0 then
    set vm to item 1 of virtual machines
    log "All properties: " & properties of vm
  end if
end tell
EOF
