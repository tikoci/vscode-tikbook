/**
 * VM AppleScript Diagnostic Tests
 * 
 * Purpose: Validate and debug AppleScript logic for:
 * - VM status detection (running/stopped/paused/unknown)
 * - Start/stop operations
 * - Delete operations
 * 
 * These tests are SKIPPED by default but can be enabled for manual testing.
 * Run: npm test -- --grep "VM AppleScript Diagnostic"
 * 
 * Prerequisites:
 * - UTM must be installed and running
 * - Must have at least 2 CHR VMs: one running, one stopped
 * 
 * What these tests do:
 * 1. Query actual VM status from UTM via AppleScript
 * 2. Verify start/stop logic works correctly
 * 3. Test delete on stopped VM with detailed error logging
 * 4. Confirm context value generation matches actual status
 */

import * as assert from 'assert'
import { execSync } from 'child_process'

/**
 * Raw AppleScript executor - runs script and returns output
 */
async function runAppleScript(script: string): Promise<string> {
	return new Promise((resolve, reject) => {
		try {
			const result = execSync(`osascript -e '${script.replace(/'/g, "'\\''")}'`, {
				encoding: 'utf-8',
				stdio: ['pipe', 'pipe', 'pipe'],
				timeout: 10000,
			})
			resolve(result)
		} catch (error) {
			if (error instanceof Error) {
				reject(error)
			} else {
				reject(new Error(String(error)))
			}
		}
	})
}

/**
 * Escape string for AppleScript to avoid quote injection
 */
function escapeAppleScript(str: string): string {
	return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

suite('VM AppleScript Diagnostic - SKIPPED', () => {
	suite.skip('AppleScript VM Operations', () => {
		test('1. List all VMs with status from UTM', async function() {
			this.timeout(10000)

			const script = `
				tell application "UTM"
					set vmList to ""
					repeat with vm in virtual machines
						set vmName to name of vm
						set vmStatus to status of vm
						set vmList to vmList & vmName & "|" & vmStatus & "\\n"
					end repeat
					return vmList
				end tell
			`

			const result = await runAppleScript(script)
			console.log('\n=== UTM VM List from AppleScript ===')
			console.log(result)
			console.log('=====================================\n')

			assert.ok(result.length > 0, 'Should return list of VMs')
		})

		test('2. Get detailed status for each VM', async function() {
			this.timeout(10000)

			const script = `
				tell application "UTM"
					set vmDetails to ""
					repeat with vm in virtual machines
						set vmName to name of vm
						set vmStatus to status of vm
						-- Status value: 0=stopped, 1=paused, 2=running, 3=saving, 4=restoring
						set vmDetails to vmDetails & vmName & " => status=" & vmStatus & "\\n"
					end repeat
					return vmDetails
				end tell
			`

			const result = await runAppleScript(script)
			console.log('\n=== VM Status Codes ===')
			console.log(result)
			console.log('=====================\n')
			console.log('Status codes: 0=stopped, 1=paused, 2=running, 3=saving, 4=restoring')

			assert.ok(result.includes('=>'), 'Should show status codes')
		})

		test('3. Test START operation on a stopped VM', async function() {
			this.timeout(15000)

			// First find a stopped VM
			const listScript = `
				tell application "UTM"
					set stoppedVMs to ""
					repeat with vm in virtual machines
						if (status of vm) = 0 then
							return name of vm
						end if
					end repeat
					error "No stopped VMs found"
				end tell
			`

			let vmName: string
			try {
				vmName = (await runAppleScript(listScript)).trim()
				console.log(`\nFound stopped VM: ${vmName}`)
			} catch {
				console.log('No stopped VMs available - skipping start test')
				this.skip()
				return
			}

			// Now try to start it
			const startScript = `
				tell application "UTM"
					set vmToStart to missing value
					repeat with vm in virtual machines
						if name of vm is "${escapeAppleScript(vmName)}" then
							set vmToStart to vm
							exit repeat
						end if
					end repeat
					
					if vmToStart is missing value then
						error "VM not found: ${escapeAppleScript(vmName)}"
					end if
					
					start vmToStart
					delay 1
					return "Started: " & name of vmToStart & " (status=" & status of vmToStart & ")"
				end tell
			`

			const result = await runAppleScript(startScript)
			console.log(`Start result: ${result}`)

			// Wait a moment for VM to fully start
			await new Promise(resolve => setTimeout(resolve, 2000))

			// Verify it's running
			const checkScript = `
				tell application "UTM"
					repeat with vm in virtual machines
						if name of vm is "${escapeAppleScript(vmName)}" then
							if (status of vm) = 2 then
								return "RUNNING"
							else
								return "NOT_RUNNING (status=" & status of vm & ")"
							end if
						end if
					end repeat
					error "VM not found"
				end tell
			`

			const checkResult = await runAppleScript(checkScript)
			console.log(`Verify result: ${checkResult}`)
			assert.ok(checkResult.includes('RUNNING'), 'VM should be running after start')
		})

		test('4. Test STOP operation on a running VM', async function() {
			this.timeout(15000)

			// Find a running VM
			const listScript = `
				tell application "UTM"
					repeat with vm in virtual machines
						if (status of vm) = 2 then
							return name of vm
						end if
					end repeat
					error "No running VMs found"
				end tell
			`

			let vmName: string
			try {
				vmName = (await runAppleScript(listScript)).trim()
				console.log(`\nFound running VM: ${vmName}`)
			} catch {
				console.log('No running VMs available - skipping stop test')
				this.skip()
				return
			}

			// Try to stop it
			const stopScript = `
				tell application "UTM"
					set vmToStop to missing value
					repeat with vm in virtual machines
						if name of vm is "${escapeAppleScript(vmName)}" then
							set vmToStop to vm
							exit repeat
						end if
					end repeat
					
					if vmToStop is missing value then
						error "VM not found: ${escapeAppleScript(vmName)}"
					end if
					
					stop vmToStop
					delay 1
					return "Stopped: " & name of vmToStop & " (status=" & status of vmToStop & ")"
				end tell
			`

			const result = await runAppleScript(stopScript)
			console.log(`Stop result: ${result}`)

			// Wait for stop to complete
			await new Promise(resolve => setTimeout(resolve, 2000))

			// Verify it's stopped
			const checkScript = `
				tell application "UTM"
					repeat with vm in virtual machines
						if name of vm is "${escapeAppleScript(vmName)}" then
							if (status of vm) = 0 then
								return "STOPPED"
							else
								return "NOT_STOPPED (status=" & status of vm & ")"
							end if
						end if
					end repeat
					error "VM not found"
				end tell
			`

			const checkResult = await runAppleScript(checkScript)
			console.log(`Verify result: ${checkResult}`)
			assert.ok(checkResult.includes('STOPPED'), 'VM should be stopped after stop')
		})

		test('5. Test DELETE operation on a stopped VM', async function() {
			this.timeout(15000)

			// Find a stopped VM
			const listScript = `
				tell application "UTM"
					repeat with vm in virtual machines
						if (status of vm) = 0 then
							return name of vm
						end if
					end repeat
					error "No stopped VMs found"
				end tell
			`

			let vmName: string
			try {
				vmName = (await runAppleScript(listScript)).trim()
				console.log(`\nAttempting to delete stopped VM: ${vmName}`)
			} catch {
				console.log('No stopped VMs available - skipping delete test')
				this.skip()
				return
			}

			// Verify it's actually stopped before attempting delete
			const statusCheckScript = `
				tell application "UTM"
					repeat with vm in virtual machines
						if name of vm is "${escapeAppleScript(vmName)}" then
							return "Status=" & status of vm
						end if
					end repeat
					error "VM not found"
				end tell
			`

			const statusResult = await runAppleScript(statusCheckScript)
			console.log(`Pre-delete status check: ${statusResult}`)

			// Now attempt delete with detailed error logging
			const deleteScript = `
				tell application "UTM"
					set vmToDelete to missing value
					repeat with vm in virtual machines
						if name of vm is "${escapeAppleScript(vmName)}" then
							set vmToDelete to vm
							exit repeat
						end if
					end repeat
					
					if vmToDelete is missing value then
						error "VM not found: ${escapeAppleScript(vmName)}"
					end if
					
					-- Log status before delete
					set preStatus to status of vmToDelete
					
					try
						delete vmToDelete
						delay 1
						return "SUCCESS: Deleted VM (was status=" & preStatus & ")"
					on error errorMessage
						return "FAILED: " & errorMessage & " (VM was status=" & preStatus & ")"
					end try
				end tell
			`

			try {
				const result = await runAppleScript(deleteScript)
				console.log(`Delete result: ${result}`)

				if (result.includes('SUCCESS')) {
					assert.ok(true, 'Delete succeeded')
				} else if (result.includes('FAILED')) {
					console.log('DELETE FAILED - Full output:', result)
					assert.fail(`Delete failed: ${result}`)
				}
			} catch (error) {
				const errorMsg = error instanceof Error ? error.message : String(error)
				console.log(`Delete threw error: ${errorMsg}`)

				// Parse detailed error info
				if (errorMsg.includes('must be stopped')) {
					console.error('ERROR: AppleScript says VM must be stopped, but pre-check showed status=0 (stopped)')
					console.error('This suggests UTM state detection issue or permission problem')
				}

				throw error
			}
		})

		test('6. Verify context value generation with actual status', async function() {
			this.timeout(10000)

			// Query all VMs
			const script = `
				tell application "UTM"
					set vmList to ""
					repeat with vm in virtual machines
						set vmName to name of vm
						set vmStatus to status of vm
						set statusString to "unknown"
						if vmStatus = 0 then
							set statusString to "stopped"
						else if vmStatus = 2 then
							set statusString to "running"
						else if vmStatus = 1 then
							set statusString to "paused"
						end if
						set vmList to vmList & vmName & "|" & statusString & "\\n"
					end repeat
					return vmList
				end tell
			`

			const result = await runAppleScript(script)
			console.log('\n=== VM Status to Context Value Mapping ===')
			const lines = result.trim().split('\n')
			lines.forEach(line => {
				const [name, status] = line.split('|')
				let contextValue = 'vm.chr'
				if (status === 'running') contextValue += '.running'
				else if (status === 'stopped') contextValue += '.stopped'

				console.log(`${name} (${status}) => contextValue="${contextValue}"`)
			})
			console.log('===========================================\n')
		})
	})
})
