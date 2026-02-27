================================================================================
CHR IP ADDRESS DETECTION EXPERIMENTS
================================================================================
Date: 2026-02-27T17:51:23.230Z
Platform: darwin x64
UTM Path: /Applications/UTM.app/Contents/MacOS/utmctl

Purpose: Determine best approach for getting CHR VM IP addresses in UTM

Research Context:
  - docs/chr-qemu-guest-agent-research.md suggests guest agent works
  - Community evidence from Proxmox/KVM confirms guest agent in CHR
  - NOT YET TESTED in practice with UTM + CHR

What we will test:
  1. UTM guest agent "query ip" command
  2. Requirements: virtio-serial device, VM running, guest agent enabled
  3. Alternative approaches if guest agent fails
  4. What features this unlocks for TikBook

================================================================================


============================================================
EXPERIMENT 3: QEMU Guest Agent - Execute Command
============================================================
Goal: Test executing RouterOS commands via guest agent

Background:
  - UTM guest agent supports "execute" command
  - Can run arbitrary commands inside CHR
  - RouterOS commands must be valid CLI syntax
  - This unlocks powerful automation features

Using existing running QEMU VM: chr.x86_64.qemu.7.21.3
Testing with VM: "chr.x86_64.qemu.7.21.3"
Provision info: backend=qemu arch=x86_64 version=7.21.3 created=false

Testing: execute command (get system identity)...
❌ Guest agent execute FAILED

Error: Command failed: osascript -e '
				tell application "UTM"
					set vm to virtual machine named "chr.x86_64.qemu.7.21.3"
					tell (execute of vm at "/system/bin/routeros-cli" with arguments {":put [/system identity get name]"} with output capturing)
						repeat
							set res to get result
							if exited of res then exit repeat
						end repeat
						return output text of res
					end tell
				end tell
			'
101:218: execution error: UTM got an error: The QEMU guest agent is not running or not installed on the guest. (-2700)


Note: Execute may fail even if query ip works
  - Depends on RouterOS CLI being accessible
  - May require specific guest agent version
  - Less critical than query ip for Phase 3

Result: Execute command failed - query ip is sufficient for MVP

================================================================================
EXPERIMENTS COMPLETE
================================================================================

✓ Results written to: /Users/amm0/Documents/vscode-tikbook/chr-ip-detection-experiments-results.md

