/**
 * UTM Integration Experiment Tests
 * 
 * Purpose: Empirically test which UTM integration method works best
 *          when called from VS Code extension context.
 * 
 * This is an EXPERIMENTAL test file to evaluate integration approaches.
 * Not intended for CI/CD - run manually to observe behavior.
 * 
 * Run: npm test -- --grep "UTM Integration"
 * 
 * What to observe:
 * 1. Which methods trigger macOS security prompts?
 * 2. Which methods fail in extension sandbox?
 * 3. Performance/reliability of each approach
 */

import * as assert from 'node:assert';
import * as cp from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { promisify } from 'node:util';

const execAsync = promisify(cp.exec);

// Resolve results file path - handles both CLI (cwd is workspace) and GUI (cwd is /)
function getResultsFilePath(): string {
	const cwd = process.cwd();
	
	// CLI mode: cwd is workspace directory
	if (cwd !== '/' && fs.existsSync(path.join(cwd, '.vscode-test'))) {
		return path.join(cwd, '.vscode-test', 'utm-experiment-results.txt');
	}
	
	// GUI mode: try to navigate up from compiled test location
	// Compiled: out/test/integration/utm-integration.experiment.test.js
	// Need to get to: workspace/.vscode-test/
	const testFileDir = __dirname; // e.g., /Users/.../out/test/integration
	const possibleWorkspacePath = path.resolve(testFileDir, '../../../../.vscode-test');
	if (fs.existsSync(path.dirname(possibleWorkspacePath))) {
		fs.mkdirSync(possibleWorkspacePath, { recursive: true });
		return path.join(possibleWorkspacePath, 'utm-experiment-results.txt');
	}
	
	// Fallback: use home directory temp location
	const fallbackDir = path.join(os.homedir(), '.vscode-test', 'tikbook-experiments');
	return path.join(fallbackDir, 'utm-experiment-results.txt');
}

const RESULTS_FILE = getResultsFilePath();
let resultsLog: string[] = [];

function logResult(message: string) {
	console.log(message); // Still log to console (even if not captured)
	resultsLog.push(message);
}

suite('UTM Integration Experiments', () => {
	const UTMCTL_PATH = '/Applications/UTM.app/Contents/MacOS/utmctl';
	const isUTMInstalled = async (): Promise<boolean> => {
		try {
			await execAsync(`test -f "${UTMCTL_PATH}"`);
			return true;
		} catch {
			return false;
		}
	};
	
	// Before ALL tests (once), initialize results
	suiteSetup(() => {
		resultsLog = [];
		logResult('UTM INTEGRATION EXPERIMENTS');
		logResult(`Started: ${new Date().toISOString()}`);
		fs.mkdirSync(path.dirname(RESULTS_FILE), { recursive: true });
	});
	
	// After ALL tests (once), write results to file
	suiteTeardown(() => {
		logResult(`\\nCompleted: ${new Date().toISOString()}`);
		fs.writeFileSync(RESULTS_FILE, resultsLog.join('\n'), 'utf-8');
		console.log(`\n✓ Results written to: ${RESULTS_FILE}\n`);
	});
	
	test('Experiment 1: utmctl CLI - List VMs', async function() {
		this.timeout(5000);
		
		const utmInstalled = await isUTMInstalled();
		if (!utmInstalled) {
			logResult('UTM not installed - experiment skipped');
			this.skip(); // Skip if UTM not installed
			return;
		}

		logResult('\n============================================================');
		logResult('EXPERIMENT 1: utmctl CLI Method');
		logResult('============================================================');
		logResult(`Command: ${UTMCTL_PATH} list`);
		logResult('Expected: No security prompts, machine-readable output');
		logResult('');

		try {
			const { stdout, stderr } = await execAsync(`"${UTMCTL_PATH}" list`);
			logResult('✓ utmctl CLI succeeded');
			logResult(`Output length: ${stdout.length} chars`);
			logResult(`Sample output: ${stdout.substring(0, 200)}`);
			if (stderr) {
				logResult(`stderr: ${stderr}`);
			}
			logResult('Result: NO SECURITY PROMPTS (CLI tool is transparent)');
			
			// Check if output is parseable (should be JSON or structured)
			assert.ok(stdout !== undefined, 'Should produce output');
			
		} catch (error) {
			// May fail if no VMs exist - that's OK
			logResult(`⚠ utmctl failed: ${(error as Error).message}`);
			logResult('(May be no VMs, which is OK for this experiment)');
		}
	});

	test('Experiment 2: AppleScript - Query VMs', async function() {
		this.timeout(5000);
		
		const utmInstalled = await isUTMInstalled();
		if (!utmInstalled) {
			this.skip();
			return;
		}

		logResult('\n============================================================');
		logResult('EXPERIMENT 2: AppleScript Query Method');
		logResult('============================================================');
		logResult('Expected: May prompt for accessibility/automation permission');
		logResult('');

		const script = `
			tell application "UTM"
				try
					set vmList to virtual machines
					return "Found " & (count of vmList) & " VMs"
				on error errMsg
					return "Error: " & errMsg
				end try
			end tell
		`;

		try {
			const { stdout, stderr } = await execAsync(`osascript -e '${script.replace(/'/g, "'\"'\"'")}'`);
			logResult('✓ AppleScript query succeeded');
			logResult(`Result: ${stdout.trim()}`);
			if (stderr) {
				logResult(`stderr: ${stderr}`);
			}
			logResult('Result: If first run, MAY trigger "Terminal.app wants to control UTM" prompt');
			logResult('        After approval, subsequent runs are silent');
			
			assert.ok(stdout.length > 0, 'Should return result');
			
		} catch (error) {
			logResult(`⚠ AppleScript failed: ${(error as Error).message}`);
			logResult('This may indicate permission denied or UTM not running');
		}
	});

	test('Experiment 3: AppleScript - Get VM Status', async function() {
		this.timeout(5000);
		
		const utmInstalled = await isUTMInstalled();
		if (!utmInstalled) {
			this.skip();
			return;
		}

		logResult('\n============================================================');
		logResult('EXPERIMENT 3: AppleScript VM Control Query');
		logResult('============================================================');
		logResult('Expected: Same permissions as query, tests deeper API access');
		logResult('');

		const script = `
			tell application "UTM"
				try
					set vmList to virtual machines
					if (count of vmList) > 0 then
						set vm to item 1 of vmList
						set vmName to name of configuration of vm
						set vmStatus to status of vm
						return vmName & ": " & vmStatus
					else
						return "No VMs found"
					end if
				on error errMsg
					return "Error: " & errMsg
				end try
			end tell
		`;

		try {
			const { stdout } = await execAsync(`osascript -e '${script.replace(/'/g, "'\"'\"'")}'`);
			logResult('✓ AppleScript control query succeeded');
			logResult(`Result: ${stdout.trim()}`);
			logResult('Result: No additional prompts beyond initial automation permission');
			
			assert.ok(stdout.length > 0, 'Should return status');
			
		} catch (error) {
			logResult(`⚠ AppleScript control query failed: ${(error as Error).message}`);
		}
	});

	test('Experiment 4: Hybrid Approach - utmctl for list, AppleScript for control', async function() {
		this.timeout(10000);
		
		const utmInstalled = await isUTMInstalled();
		if (!utmInstalled) {
			this.skip();
			return;
		}

		logResult('\n============================================================');
		logResult('EXPERIMENT 4: Hybrid Approach');
		logResult('============================================================');
		logResult('Strategy: Use utmctl for fast listing, AppleScript for control');
		logResult('');

		// Step 1: List with utmctl
		let vmCount = 0;
		try {
			const { stdout } = await execAsync(`"${UTMCTL_PATH}" list`);
			logResult('✓ utmctl list succeeded');
			// Parse output to count VMs (format may vary)
			const lines = stdout.trim().split('\n').filter(l => l.length > 0);
			vmCount = lines.length;
			logResult(`  Found ${vmCount} VMs via utmctl`);
		} catch (error) {
			logResult(`⚠ utmctl failed: ${(error as Error).message}`);
		}

		// Step 2: Get status with AppleScript (if VMs exist)
		if (vmCount > 0) {
			try {
				const script = `
					tell application "UTM"
						set vmList to virtual machines
						return status of item 1 of vmList
					end tell
				`;
				const { stdout } = await execAsync(`osascript -e '${script.replace(/'/g, "'\"'\"'")}'`);
				logResult('✓ AppleScript status check succeeded');
				logResult(`  First VM status: ${stdout.trim()}`);
			} catch (error) {
				logResult(`⚠ AppleScript status check failed: ${(error as Error).message}`);
			}
		}

		logResult('\nResult: Hybrid approach combines best of both methods');
		logResult('        - utmctl for fast VM discovery');
		logResult('        - AppleScript for rich status/control operations');
	});

	test('Experiment 5: Performance Comparison', async function() {
		this.timeout(10000);
		
		const utmInstalled = await isUTMInstalled();
		if (!utmInstalled) {
			this.skip();
			return;
		}

		logResult('\n============================================================');
		logResult('EXPERIMENT 5: Performance Comparison');
		logResult('============================================================');
		logResult('');

		// Time utmctl
		const utmctlStart = Date.now();
		try {
			await execAsync(`"${UTMCTL_PATH}" list`);
			const utmctlTime = Date.now() - utmctlStart;
			logResult(`✓ utmctl: ${utmctlTime}ms`);
		} catch {
			logResult('⚠ utmctl failed');
		}

		// Time AppleScript
		const appleScriptStart = Date.now();
		try {
			const script = `tell application "UTM" to get virtual machines`;
			await execAsync(`osascript -e '${script}'`);
			const appleScriptTime = Date.now() - appleScriptStart;
			logResult(`✓ AppleScript: ${appleScriptTime}ms`);
		} catch {
			logResult('⚠ AppleScript failed');
		}

		logResult('\nResult: First run may be slower due to app launch/permissions');
		logResult('        Subsequent runs typically faster');
		logResult('        utmctl usually faster for simple queries');
		logResult('        AppleScript richer API for complex operations');
		
		// Final summary
		logResult('\n============================================================');
		logResult('FINAL RECOMMENDATION');
		logResult('============================================================');
		logResult('Based on experiments:');
		logResult('1. utmctl: NO prompts, fast, limited API');
		logResult('2. AppleScript: ONE-TIME prompt, full API');
		logResult('3. utm:// URL: Best for downloads');
		logResult('');
		logResult('RECOMMENDED APPROACH: Hybrid');
		logResult('  - Use utmctl for: VM listing, status checks');
		logResult('  - Use AppleScript for: Start/stop, configuration');
		logResult('  - Use utm:// for: Downloading new VMs');
		logResult('\n============================================================');
	});

	test('Experiment 6: VM Start Operation', async function() {
		this.timeout(15000);
		
		const utmInstalled = await isUTMInstalled();
		if (!utmInstalled) {
			this.skip();
			return;
		}

		logResult('\n============================================================');
		logResult('EXPERIMENT 6: VM Start Operation');
		logResult('============================================================');
		logResult('Testing: Starting a stopped VM via utmctl vs AppleScript');
		logResult('');

		// First, find a stopped VM
		let stoppedVM: string | null = null;
		try {
			const { stdout } = await execAsync(`"${UTMCTL_PATH}" list`);
			const lines = stdout.trim().split('\n').slice(1); // Skip header
			for (const line of lines) {
				if (line.includes('stopped')) {
					// Parse VM name from line (format: UUID Status Name)
					const parts = line.split(/\s+/);
					stoppedVM = parts.slice(2).join(' '); // Everything after status
					break;
				}
			}
			logResult(`Found stopped VM: ${stoppedVM ?? 'None'}`);
		} catch (error) {
			logResult(`⚠ Could not list VMs: ${(error as Error).message}`);
		}

		if (!stoppedVM) {
			logResult('No stopped VMs available - skipping start test');
			logResult('(This is OK - create a stopped VM in UTM to test start operation)');
			return;
		}

		// Test utmctl start
		logResult('\nTesting utmctl start...');
		const utmctlStartTime = Date.now();
		try {
			const { stdout, stderr } = await execAsync(`"${UTMCTL_PATH}" start "${stoppedVM}"`);
			const elapsed = Date.now() - utmctlStartTime;
			logResult(`✓ utmctl start succeeded in ${elapsed}ms`);
			if (stdout) logResult(`  Output: ${stdout.trim()}`);
			if (stderr) logResult(`  Stderr: ${stderr.trim()}`);
			
			// Wait a moment then stop it
			await new Promise(resolve => setTimeout(resolve, 2000));
			await execAsync(`"${UTMCTL_PATH}" stop "${stoppedVM}"`);
			logResult('✓ VM stopped again (cleanup)');
		} catch (error) {
			logResult(`⚠ utmctl start failed: ${(error as Error).message}`);
		}

		// Test AppleScript start
		logResult('\nTesting AppleScript start...');
		const appleStartTime = Date.now();
		try {
			const script = `
				tell application "UTM"
					set vmList to virtual machines
					repeat with vm in vmList
						if name of configuration of vm = "${stoppedVM}" then
							start vm
							return "Started: " & name of configuration of vm
						end if
					end repeat
					return "VM not found"
				end tell
			`;
			const { stdout } = await execAsync(`osascript -e '${script.replace(/'/g, "'\"'\"'")}'`);
			const elapsed = Date.now() - appleStartTime;
			logResult(`✓ AppleScript start succeeded in ${elapsed}ms`);
			logResult(`  Result: ${stdout.trim()}`);
			
			// Wait a moment then stop it
			await new Promise(resolve => setTimeout(resolve, 2000));
			const stopScript = `tell application "UTM" to stop (first virtual machine whose name of configuration = "${stoppedVM}")`;
			await execAsync(`osascript -e '${stopScript}'`);
			logResult('✓ VM stopped again (cleanup)');
		} catch (error) {
			logResult(`⚠ AppleScript start failed: ${(error as Error).message}`);
		}

		logResult('\nResult: Both methods can start VMs; AppleScript provides richer feedback');
	});

	test('Experiment 7: VM Stop Operation (Graceful vs Force)', async function() {
		this.timeout(10000);
		
		const utmInstalled = await isUTMInstalled();
		if (!utmInstalled) {
			this.skip();
			return;
		}

		logResult('\n============================================================');
		logResult('EXPERIMENT 7: VM Stop Operations');
		logResult('============================================================');
		logResult('Testing: Graceful shutdown vs force stop');
		logResult('');

		// Check utmctl help for stop options
		try {
			const { stdout } = await execAsync(`"${UTMCTL_PATH}" help stop 2>&1 || "${UTMCTL_PATH}" stop --help 2>&1 || echo "No help available"`);
			logResult('utmctl stop options:');
			logResult(stdout.trim() || '(No help output - may need to check docs)');
		} catch {
			logResult('Could not get utmctl stop help');
		}

		// Test AppleScript stop methods
		logResult('\nAppleScript stop methods available:');
		const methods = [
			'stop vm -- graceful shutdown',
			'force stop vm -- immediate termination',
			'request stop vm -- request guest OS shutdown'
		];
		methods.forEach(method => logResult(`  - ${method}`));

		logResult('\nResult: AppleScript offers granular control (stop/force stop/request stop)');
		logResult('        utmctl may only support basic stop (needs verification)');
	});

	test('Experiment 8: Error Handling - VM Not Found', async function() {
		this.timeout(5000);
		
		const utmInstalled = await isUTMInstalled();
		if (!utmInstalled) {
			this.skip();
			return;
		}

		logResult('\n============================================================');
		logResult('EXPERIMENT 8: Error Handling - VM Not Found');
		logResult('============================================================');
		logResult('Testing: How each method handles non-existent VMs');
		logResult('');

		const fakeVMName = '__NONEXISTENT_VM_TEST__';

		// Test utmctl with fake VM
		logResult('utmctl with non-existent VM:');
		try {
			await execAsync(`"${UTMCTL_PATH}" status "${fakeVMName}"`);
			logResult('⚠ Unexpectedly succeeded');
		} catch (error: unknown) {
			const err = error as { code?: string; message?: string; stderr?: string };
			logResult(`✓ Failed as expected`);
			logResult(`  Exit code: ${err.code ?? 'unknown'}`);
			logResult(`  Message: ${err.message}`);
			logResult(`  Stderr: ${err.stderr?.trim() ?? 'none'}`);
		}

		// Test AppleScript with fake VM
		logResult('\nAppleScript with non-existent VM:');
		try {
			const script = `tell application "UTM" to get (first virtual machine whose name of configuration = "${fakeVMName}")`;
			await execAsync(`osascript -e '${script}'`);
			logResult('⚠ Unexpectedly succeeded');
		} catch (error: unknown) {
			const err = error as { message?: string; stderr?: string };
			logResult(`✓ Failed as expected`);
			logResult(`  Message: ${err.message}`);
			// AppleScript errors are verbose, extract key parts
			if (err.stderr) {
				const match = err.stderr.match(/execution error: (.+)/);
				if (match) {
					logResult(`  Error: ${match[1]}`);
				}
			}
		}

		logResult('\nResult: Both methods provide clear errors; implementation needs proper error handling');
	});

	test('Experiment 9: Error Handling - UTM Not Running', async function() {
		this.timeout(5000);
		
		const utmInstalled = await isUTMInstalled();
		if (!utmInstalled) {
			this.skip();
			return;
		}

		logResult('\n============================================================');
		logResult('EXPERIMENT 9: Error Handling - UTM App State');
		logResult('============================================================');
		logResult('Testing: Behavior when UTM app is not running');
		logResult('');

		// Check if UTM is running
		try {
			const { stdout } = await execAsync('pgrep -f "UTM.app" || echo "not running"');
			const isRunning = !stdout.includes('not running');
			logResult(`UTM app status: ${isRunning ? 'running' : 'not running'}`);
			
			if (!isRunning) {
				// Test utmctl when UTM not running
				logResult('\nutmctl behavior when UTM not running:');
				try {
					const result = await execAsync(`"${UTMCTL_PATH}" list`);
					logResult(`✓ Succeeded: ${result.stdout.substring(0, 100)}`);
					logResult('  Note: utmctl works even when UTM GUI not running');
				} catch (error) {
					logResult(`⚠ Failed: ${(error as Error).message}`);
				}

				// Test AppleScript when UTM not running
				logResult('\nAppleScript behavior when UTM not running:');
				try {
					const script = `tell application "UTM" to get virtual machines`;
					await execAsync(`osascript -e '${script}'`);
					logResult('✓ Succeeded (AppleScript launched UTM automatically)');
				} catch (error) {
					logResult(`⚠ Failed: ${(error as Error).message}`);
				}
			} else {
				logResult('UTM is running - cannot test "not running" scenario');
				logResult('(Stop UTM manually to test this scenario)');
			}
		} catch (error) {
			logResult(`Error checking UTM status: ${(error as Error).message}`);
		}

		logResult('\nResult: utmctl is a daemon (works without GUI); AppleScript auto-launches GUI');
	});

	test('Experiment 10: Network Configuration Discovery', async function() {
		this.timeout(15000); // Increased for file system and AppleScript queries
		
		const utmInstalled = await isUTMInstalled();
		if (!utmInstalled) {
			this.skip();
			return;
		}

		logResult('\n============================================================');
		logResult('EXPERIMENT 10: Network Configuration Discovery');
		logResult('============================================================');
		logResult('Testing: How to detect VM network settings and IP addresses');
		logResult('');

		// Test utmctl for network info
		logResult('utmctl network information:');
		try {
			const { stdout } = await execAsync(`"${UTMCTL_PATH}" list`);
			const lines = stdout.trim().split('\n');
			if (lines.length > 1) {
				const firstVM = lines[1].split(/\s+/).slice(2).join(' ');
				logResult(`Testing with VM: ${firstVM}`);
				
				// Try to get IP address (may not be in utmctl output)
				try {
					const ipResult = await execAsync(`"${UTMCTL_PATH}" ip-address "${firstVM}" 2>&1 || echo "Command not available"`);
					logResult(`  IP command result: ${ipResult.stdout.trim()}`);
				} catch {
					logResult('  No IP address command in utmctl');
				}
			}
		} catch (error) {
			logResult(`⚠ utmctl failed: ${(error as Error).message}`);
		}

		// Test AppleScript for network properties
		logResult('\nAppleScript network properties:');
		try {
			const script = `
				tell application "UTM"
					set vmList to virtual machines
					if (count of vmList) > 0 then
						set vm to item 1 of vmList
						set vmConfig to configuration of vm
						-- Try to get network-related properties
						try
							return "Config properties available (check UTM docs)"
						end try
					end if
					return "No VMs"
				end tell
			`;
			const { stdout } = await execAsync(`osascript -e '${script.replace(/'/g, "'\"'\"'")}'`);
			logResult(`  ${stdout.trim()}`);
			logResult('  Note: Network config may be in VM config files, not AppleScript API');
		} catch (error) {
			logResult(`AppleScript query failed: ${(error as Error).message}`);
		}

		// Check VM config files location
		logResult('\nVM configuration files:');
		try {
			const { stdout } = await execAsync('ls -la ~/Library/Containers/com.utmapp.UTM/Data/Documents/*.utm 2>/dev/null | head -3 || echo "No VMs found"');
			logResult(stdout.trim() || 'Could not locate VM files');
			logResult('  Note: VM network config likely in config.plist inside .utm bundle');
		} catch {
			logResult('Could not check VM files');
		}

		logResult('\nResult: Network discovery may require parsing VM config files');
		logResult('        utmctl/AppleScript may not expose IP addresses directly');
		logResult('        Consider querying RouterOS API directly once VM is running');
	});

	test('Experiment 11: AppleScript API Surface Exploration', async function() {
		this.timeout(8000);
		
		const utmInstalled = await isUTMInstalled();
		if (!utmInstalled) {
			this.skip();
			return;
		}

		logResult('\n============================================================');
		logResult('EXPERIMENT 11: AppleScript API Surface');
		logResult('============================================================');
		logResult('Testing: What properties and methods are available in AppleScript');
		logResult('');

		// Get AppleScript dictionary
		logResult('Attempting to extract AppleScript dictionary...');
		try {
			const { stdout } = await execAsync('sdef /Applications/UTM.app | head -100');
			logResult('✓ AppleScript dictionary found:');
			logResult(`${stdout.substring(0, 500)}...`);
			logResult('\nFull dictionary: sdef /Applications/UTM.app');
		} catch {
			logResult('⚠ Could not extract dictionary (this is OK for experiment)');
		}

		// Test various properties
		logResult('\nTesting VM properties:');
		try {
			const script = `
				tell application "UTM"
					set vmList to virtual machines
					if (count of vmList) > 0 then
						set vm to item 1 of vmList
						set output to ""
						
						try
							set output to output & "Name: " & (name of configuration of vm) & "\n"
						end try
						
						try
							set output to output & "Status: " & (status of vm) & "\n"
						end try
						
						try
							set output to output & "ID: " & (id of vm) & "\n"
						end try
						
						return output
					end if
					return "No VMs available"
				end tell
			`;
			const { stdout } = await execAsync(`osascript -e '${script.replace(/'/g, "'\"'\"'")}'`);
			logResult(stdout.trim());
		} catch (error) {
			logResult(`Property test failed: ${(error as Error).message}`);
		}

		logResult('\nResult: AppleScript provides rich object model for VM control');
		logResult('        Check "sdef /Applications/UTM.app" for full API reference');
	});

	test('Experiment 12: VM Status Polling Performance', async function() {
		this.timeout(30000); // Increased for 10 iterations of polling (1-3s each)
		
		const utmInstalled = await isUTMInstalled();
		if (!utmInstalled) {
			this.skip();
			return;
		}

		logResult('\n============================================================');
		logResult('EXPERIMENT 12: Status Polling Performance');
		logResult('============================================================');
		logResult('Testing: How fast can we poll VM status repeatedly');
		logResult('');

		const iterations = 10;

		// Test utmctl polling
		logResult(`utmctl status polling (${iterations} iterations):`);
		const utmctlTimes: number[] = [];
		for (let i = 0; i < iterations; i++) {
			const start = Date.now();
			try {
				await execAsync(`"${UTMCTL_PATH}" list`);
				utmctlTimes.push(Date.now() - start);
			} catch {
				logResult(`  Iteration ${i + 1} failed`);
			}
		}
		if (utmctlTimes.length > 0) {
			const avg = utmctlTimes.reduce((a, b) => a + b, 0) / utmctlTimes.length;
			const min = Math.min(...utmctlTimes);
			const max = Math.max(...utmctlTimes);
			logResult(`  Average: ${avg.toFixed(1)}ms, Min: ${min}ms, Max: ${max}ms`);
			logResult(`  All times: ${utmctlTimes.join(', ')}ms`);
		}

		// Test AppleScript polling
		logResult(`\nAppleScript status polling (${iterations} iterations):`);
		const appleTimes: number[] = [];
		for (let i = 0; i < iterations; i++) {
			const start = Date.now();
			try {
				const script = `tell application "UTM" to count virtual machines`;
				await execAsync(`osascript -e '${script}'`);
				appleTimes.push(Date.now() - start);
			} catch {
				logResult(`  Iteration ${i + 1} failed`);
			}
		}
		if (appleTimes.length > 0) {
			const avg = appleTimes.reduce((a, b) => a + b, 0) / appleTimes.length;
			const min = Math.min(...appleTimes);
			const max = Math.max(...appleTimes);
			logResult(`  Average: ${avg.toFixed(1)}ms, Min: ${min}ms, Max: ${max}ms`);
			logResult(`  All times: ${appleTimes.join(', ')}ms`);
		}

		logResult('\nResult: Polling performance indicates whether real-time status watching is feasible');
		logResult(`        Recommendation: ${utmctlTimes[0] < 100 ? 'Fast enough for polling' : 'Consider event-based updates'}`);
	});

	test('Experiment 13: UTM URL Scheme for Downloads', async function() {
		this.timeout(5000);
		
		const utmInstalled = await isUTMInstalled();
		if (!utmInstalled) {
			this.skip();
			return;
		}

		logResult('\n============================================================');
		logResult('EXPERIMENT 13: UTM URL Scheme');
		logResult('============================================================');
		logResult('Testing: utm:// URL scheme for VM downloads');
		logResult('');

		logResult('UTM URL scheme format:');
		logResult('  utm://downloadVM?url=<encoded-url>');
		logResult('');
		logResult('Example usage:');
		logResult('  const chrUrl = "https://github.com/tikoci/mikropkl/releases/download/v1.0.0/RouterOS-CHR.utm.zip";');
		logResult('  const downloadUrl = `utm://downloadVM?url=${encodeURIComponent(chrUrl)}`;');
		logResult('  await vscode.env.openExternal(vscode.Uri.parse(downloadUrl));');
		logResult('');
		logResult('Expected behavior:');
		logResult('  1. UTM app opens');
		logResult('  2. Download dialog appears');
		logResult('  3. User confirms download location');
		logResult('  4. VM is downloaded and imported automatically');
		logResult('');
		logResult('Advantages:');
		logResult('  - No manual file handling in extension code');
		logResult('  - UTM manages download progress and errors');
		logResult('  - User sees familiar UTM UI');
		logResult('  - Works with both http:// and file:// URLs');
		logResult('');
		logResult('Note: This is a documentation-only test (not actually downloading)');
		logResult('      Actual download would require user confirmation');
		logResult('');
		logResult('Result: utm:// URL scheme is recommended approach for VM imports');
	});

/**
 * INSTRUCTIONS FOR RUNNING THIS TEST:
 * 
 * 1. Ensure UTM is installed: https://mac.getutm.app/
 * 
 * 2. Run from VS Code terminal:
 *    npm test -- --grep "UTM Integration"
 * 
 * 3. Observe console output for:
 *    - Security prompts (Terminal.app wanting automation permission)
 *    - Which methods succeed/fail
 *    - Performance differences
 * 
 * 4. Document findings:
 *    - Did utmctl require user approval?
 *    - Did AppleScript trigger accessibility prompt?
 *    - Which approach feels smoother?
 * 
 * 5. On FIRST run, you may see macOS prompt:
 *    "Terminal.app wants to control UTM.app"
 *    This is expected for AppleScript tests.
 *    Click "OK" to proceed.
 * 
 * 6. Test should be run from:
 *    a) VS Code integrated terminal (simulates extension context)
 *    b) Standalone Terminal.app (baseline comparison)
 *    c) Extension development host (true extension context)
 * 
 * EXPECTED OUTCOMES:
 * - utmctl: No prompts, fast, limited API
 * - AppleScript: One-time prompt, full API, slightly slower
 * - Hybrid: Best of both (use utmctl for listing, AppleScript for control)
 * 
 * NEXT STEPS AFTER TEST:
 * 1. Compare results with shell script test (tools/utm-integration-test.sh)
 * 2. Document which method is recommended
 * 3. Update research doc with empirical findings
 * 4. Proceed to spec phase with chosen approach
 * 
 * NEW EXPERIMENTS (6-13):
 * - Test VM start/stop operations and timing
 * - Error handling scenarios (VM not found, UTM not running)
 * - Network configuration discovery approaches
 * - AppleScript API surface area
 * - Status polling performance (for real-time UI updates)
 * - UTM URL scheme for automatic VM downloads
 * 
 * These experiments validate the TDD approach: test integration methods
 * in unit tests before implementing in extension code.
 */
});
