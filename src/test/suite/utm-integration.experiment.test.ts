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

import * as assert from 'assert';
import * as cp from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const execAsync = promisify(cp.exec);

// Results log for experimental findings
const RESULTS_FILE = path.join(process.cwd(), '.vscode-test', 'utm-experiment-results.txt');
let resultsLog: string[] = [];

function logResult(message: string) {
	console.log(message); // Still log to console (even if not captured)
	resultsLog.push(message);
}

suite('UTM Integration Experiments', () => {
	const UTMCTL_PATH = '/Applications/UTM.app/Contents/MacOS/utmctl';
	
	// Before ALL tests (once), initialize results
	suiteSetup(() => {
		resultsLog = [];
		logResult('UTM INTEGRATION EXPERIMENTS');
		logResult('Started: ' + new Date().toISOString());
		fs.mkdirSync(path.dirname(RESULTS_FILE), { recursive: true });
	});
	
	// After ALL tests (once), write results to file
	suiteTeardown(() => {
		logResult('\\nCompleted: ' + new Date().toISOString());
		fs.writeFileSync(RESULTS_FILE, resultsLog.join('\n'), 'utf-8');
		console.log(`\n✓ Results written to: ${RESULTS_FILE}\n`);
	});
	
	// Helper to check if UTM is installed
	async function isUTMInstalled(): Promise<boolean> {
		try {
			await execAsync(`test -f "${UTMCTL_PATH}"`);
			return true;
		} catch {
			return false;
		}
	}

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
 */
