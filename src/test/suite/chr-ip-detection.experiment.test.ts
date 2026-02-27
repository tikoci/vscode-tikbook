/**
 * CHR IP Address Detection Experiments
 * 
 * Purpose: Validate IP address detection approaches for RouterOS CHR VMs in UTM
 * 
 * Background:
 * - Research (docs/chr-qemu-guest-agent-research.md) suggests QEMU guest agent works
 * - Community evidence from Proxmox/KVM shows guest agent in CHR
 * - NOT YET TESTED in practice with UTM + CHR combo
 * 
 * This experiment will test:
 * 1. UTM guest agent `query ip` command with CHR VMs
 * 2. Requirements and limitations (virtio-serial, running VM, etc.)
 * 3. Alternative approaches if guest agent doesn't work
 * 4. What features this unlocks (REST API auto-connect, command execution, etc.)
 * 
 * Run: npm test -- --grep "CHR IP Detection"
 * 
 * IMPORTANT: These tests require:
 * - UTM installed on macOS
 * - At least one CHR VM (we'll try to create one if needed)
 * - AppleScript permission granted (one-time prompt)
 */

import { exec, execFile } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { ensureRunningQemuCHRVM } from './chr-vm-provisioning';

const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);

const UTMCTL_PATH = '/Applications/UTM.app/Contents/MacOS/utmctl';
const RESULTS_FILE = path.join(__dirname, '../../../chr-ip-detection-experiments-results.md');

// Helper to write results to file for analysis
function logResult(message: string): void {
	const content = `${message}\n`;
	fs.appendFileSync(RESULTS_FILE, content, 'utf-8');
	console.log(message); // Also log to console
}

// Helper: Check if UTM is installed
async function isUTMInstalled(): Promise<boolean> {
	try {
		await execFileAsync(UTMCTL_PATH, ['list']);
		return true;
	} catch {
		return false;
	}
}

// Helper: Escape strings for AppleScript
function escapeAppleScript(str: string): string {
	return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

// Helper: Execute AppleScript and return stdout
async function execAppleScript(script: string): Promise<string> {
	const { stdout } = await execAsync(`osascript -e '${script.replace(/'/g, "'\"'\"'")}'`);
	return stdout.trim();
}

async function queryGuestIPs(vmName: string): Promise<string> {
	const queryScript = `
		tell application "UTM"
			set vm to virtual machine named "${escapeAppleScript(vmName)}"
			set ipList to query ip of vm
			return ipList as list
		end tell
	`;
	return execAppleScript(queryScript);
}

async function queryRuntimeSerialInfo(vmName: string): Promise<string> {
	const serialScript = `
		tell application "UTM"
			set vm to virtual machine named "${escapeAppleScript(vmName)}"
			set out to ""
			repeat with sp in serial ports of vm
				set out to out & "serial id=" & (id of sp as string) & ", iface=" & ((interface of sp) as string) & ", addr=" & ((address of sp) as string) & ", port=" & (port of sp as string) & linefeed
			end repeat
			return out
		end tell
	`;
	return execAppleScript(serialScript);
}

function sleep(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

suite('CHR IP Detection Experiments', function() {
	// Increase timeout for all tests (AppleScript prompts can be slow)
	this.timeout(30000);

	suiteSetup(function() {
		// Clear previous results
		if (fs.existsSync(RESULTS_FILE)) {
			fs.unlinkSync(RESULTS_FILE);
		}
		
		logResult('================================================================================');
		logResult('CHR IP ADDRESS DETECTION EXPERIMENTS');
		logResult('================================================================================');
		logResult(`Date: ${new Date().toISOString()}`);
		logResult(`Platform: ${process.platform} ${process.arch}`);
		logResult(`UTM Path: ${UTMCTL_PATH}`);
		logResult('');
		logResult('Purpose: Determine best approach for getting CHR VM IP addresses in UTM');
		logResult('');
		logResult('Research Context:');
		logResult('  - docs/chr-qemu-guest-agent-research.md suggests guest agent works');
		logResult('  - Community evidence from Proxmox/KVM confirms guest agent in CHR');
		logResult('  - NOT YET TESTED in practice with UTM + CHR');
		logResult('');
		logResult('What we will test:');
		logResult('  1. UTM guest agent "query ip" command');
		logResult('  2. Requirements: virtio-serial device, VM running, guest agent enabled');
		logResult('  3. Alternative approaches if guest agent fails');
		logResult('  4. What features this unlocks for TikBook');
		logResult('');
		logResult('================================================================================\n');
	});

	suiteTeardown(function() {
		logResult('\n================================================================================');
		logResult('EXPERIMENTS COMPLETE');
		logResult('================================================================================');
		logResult(`\n✓ Results written to: ${RESULTS_FILE}\n`);
		console.log(`\n✓ Results written to: ${RESULTS_FILE}\n`);
	});

	test('Experiment 1: Detect Available CHR VMs', async function() {
		const utmInstalled = await isUTMInstalled();
		if (!utmInstalled) {
			logResult('⚠️  UTM not installed - skipping all experiments');
			this.skip();
			return;
		}

		logResult('\n============================================================');
		logResult('EXPERIMENT 1: Detect Available CHR VMs');
		logResult('============================================================');
		logResult('Goal: Find CHR VMs to test with\n');

		// List all VMs
		try {
			const script = `
				tell application "UTM"
					set vmData to {}
					repeat with vm in virtual machines
						set vmName to name of vm as string
						set vmStatus to (get status of vm) as string
						set vmInfo to vmName & "|" & vmStatus
						set end of vmData to vmInfo
					end repeat
					
					set output to ""
					repeat with info in vmData
						set output to output & info & linefeed
					end repeat
					return output
				end tell
			`;
			
			const result = await execAppleScript(script);
			const lines = result.split('\n').filter(line => line.trim().length > 0);
			
			logResult(`Total VMs found: ${lines.length}`);
			logResult('');
			
			if (lines.length === 0) {
				logResult('❌ No VMs found in UTM');
				logResult('');
				logResult('Next steps:');
				logResult('  1. Create a CHR VM manually in UTM, or');
				logResult('  2. Use TikBook "Add CHR VM" command (if implemented), or');
				logResult('  3. Download CHR from mikrotik.com and import to UTM');
				logResult('');
				logResult('For testing, we recommend:');
				logResult('  - CHR version 7.22 or later (stable)');
				logResult('  - QEMU backend (not Apple Virtualization)');
				logResult('  - Default network settings (NAT mode)');
				return;
			}
			
			// Parse and display all VMs
			const vms: Array<{name: string, status: string, isCHR: boolean}> = [];
			for (const line of lines) {
				const [name, status] = line.split('|');
				const isCHR = name.toLowerCase().includes('chr') || 
				              name.toLowerCase().includes('routeros') ||
				              /\d+\.\d+/.test(name); // Version pattern like 7.22
				
				vms.push({ name, status, isCHR });
				
				const chrMarker = isCHR ? '✓ CHR?' : '';
				logResult(`  ${status.padEnd(10)} ${name} ${chrMarker}`);
			}
			
			logResult('');
			const chrVMs = vms.filter(v => v.isCHR);
			const runningCHR = chrVMs.filter(v => v.status === 'started');
			
			if (chrVMs.length === 0) {
				logResult('⚠️  No CHR VMs detected (heuristic: name contains "chr", "routeros", or version number)');
				logResult('');
				logResult('If you have CHR VMs but they were not detected:');
				logResult('  - This is OK - detection is name-based heuristic');
				logResult('  - You can manually specify VM name in later experiments');
			} else {
				logResult(`✓ Found ${chrVMs.length} potential CHR VM(s)`);
				logResult(`  - Running: ${runningCHR.length}`);
				logResult(`  - Stopped: ${chrVMs.length - runningCHR.length}`);
			}
			
			logResult('');
			logResult('Result: VM detection successful');
			if (runningCHR.length > 0) {
				logResult(`        Ready to test with: "${runningCHR[0].name}"`);
			} else if (chrVMs.length > 0) {
				logResult(`        Need to start VM: "${chrVMs[0].name}"`);
			}
			
		} catch (error) {
			logResult(`❌ Error listing VMs: ${(error as Error).message}`);
			throw error;
		}
	});

	test('Experiment 2: Test QEMU Guest Agent - Query IP', async function() {
		const utmInstalled = await isUTMInstalled();
		if (!utmInstalled) {
			this.skip();
			return;
		}

		logResult('\n============================================================');
		logResult('EXPERIMENT 2: QEMU Guest Agent - Query IP');
		logResult('============================================================');
		logResult('Goal: Test UTM\'s "query ip" command with CHR VM\n');
		
		logResult('Background:');
		logResult('  - UTM supports QEMU guest agent via AppleScript');
		logResult('  - Command: query ip <vm> returns list of IP addresses');
		logResult('  - Requires: VM running, virtio-serial device, guest agent in VM');
		logResult('  - Research suggests CHR includes guest agent (qemu-ga)');
		logResult('');

		// First, find a running CHR VM
		let testVM: string;
		try {
			const provisioned = await ensureRunningQemuCHRVM({ logger: logResult });
			testVM = provisioned.name;
			
			logResult(`Testing with VM: "${testVM}"`);
			logResult(`Provision info: backend=${provisioned.backend} arch=${provisioned.architecture} version=${provisioned.version} created=${provisioned.wasCreated}`);
			try {
				const serialInfo = await queryRuntimeSerialInfo(testVM);
				if (serialInfo.trim().length > 0) {
					logResult('Runtime serial ports:');
					for (const line of serialInfo.split('\n').filter(l => l.trim().length > 0)) {
						logResult(`  ${line}`);
					}
				}
			} catch (serialError) {
				logResult(`Could not query runtime serial ports: ${(serialError as Error).message}`);
			}
			logResult('');
			
		} catch (error) {
			logResult(`❌ Error provisioning/running QEMU VM: ${(error as Error).message}`);
			this.skip();
			return;
		}

		// Test guest agent query ip command
		logResult('Testing: query ip command...');
		try {
			const ipResult = await queryGuestIPs(testVM);
			
			logResult('✅ SUCCESS! Guest agent query ip WORKS!');
			logResult('');
			logResult(`Raw result: ${ipResult}`);
			logResult('');
			
			// Parse IP addresses
			const ips = ipResult.split(', ').map(ip => ip.trim());
			const ipv4 = ips.filter(ip => !ip.includes(':') && !ip.startsWith('fe80'));
			const ipv6 = ips.filter(ip => ip.includes(':'));
			
			logResult(`IP addresses found: ${ips.length} total`);
			if (ipv4.length > 0) {
				logResult(`  IPv4: ${ipv4.join(', ')}`);
			}
			if (ipv6.length > 0) {
				logResult(`  IPv6: ${ipv6.join(', ')}`);
			}
			logResult('');
			
			logResult('What this means:');
			logResult('  ✅ CHR does include QEMU guest agent');
			logResult('  ✅ UTM can query IP addresses via guest agent');
			logResult('  ✅ No need for network scanning or config parsing');
			logResult('  ✅ This is the recommended approach for Phase 3');
			logResult('');
			
			logResult('Implementation notes:');
			logResult('  - VM must be running for guest agent to respond');
			logResult('  - May return multiple IPs (all interfaces)');
			logResult('  - Filter out link-local (fe80::) and loopback (127.0.0.1)');
			logResult('  - Use first non-loopback IPv4 for REST API connection');
			
		} catch (error) {
			const errorMsg = (error as Error).message;
			logResult('❌ Guest agent query ip FAILED');
			logResult('');
			logResult(`Error: ${errorMsg}`);
			logResult('');

			if (errorMsg.includes('guest agent is not running or not installed')) {
				logResult('Readiness retry: waiting up to 120s for guest agent startup...');
				let becameReady = false;
				for (let attempt = 1; attempt <= 12; attempt++) {
					await sleep(10000);
					try {
						const delayedResult = await queryGuestIPs(testVM);
						logResult(`✅ Guest agent became available after ${attempt * 10}s: ${delayedResult}`);
						becameReady = true;
						break;
					} catch (delayedError) {
						const delayedMsg = delayedError instanceof Error ? delayedError.message : String(delayedError);
						logResult(`  retry ${attempt}/12: still unavailable (${delayedMsg.includes('guest agent is not running') ? 'guest agent not running' : 'error'})`);
					}
				}
				if (becameReady) {
					logResult('Result: guest agent appears to be delayed-start, not absent.');
					return;
				}

				logResult('Version-matrix retry: testing an alternate CHR version (7.21.2)');
				try {
					const retryProvision = await ensureRunningQemuCHRVM({
						preferredVersion: '7.21.2',
						forceCreate: true,
						logger: logResult,
					});

					const retryResult = await queryGuestIPs(retryProvision.name);
					logResult(`✅ Alternate version succeeded: ${retryProvision.version}`);
					logResult(`Alternate version IP result: ${retryResult}`);
				} catch (retryError) {
					logResult(`❌ Alternate version also failed: ${(retryError as Error).message}`);
				}
				logResult('');
			}
			
			// Analyze the error
			if (errorMsg.includes('not available') || errorMsg.includes('not supported')) {
				logResult('Possible causes:');
				logResult('  1. VM backend is Apple Virtualization (not QEMU)');
				logResult('     - Guest agent only works with QEMU backend');
				logResult('     - Check VM settings: Architecture > System > Backend');
				logResult('     - Use x86_64 QEMU or ARM64 QEMU (not Apple)');
				logResult('');
				logResult('  2. virtio-serial device not configured');
				logResult('     - UTM should add this automatically for QEMU VMs');
				logResult('     - Check VM config.plist for virtio-serial entries');
				logResult('');
				logResult('  3. Guest agent not running in CHR');
				logResult('     - Less likely (research confirms it\'s included)');
				logResult('     - May need to wait longer after boot');
			} else if (errorMsg.includes('timeout') || errorMsg.includes('no response')) {
				logResult('Possible causes:');
				logResult('  1. VM still booting (guest agent not ready yet)');
				logResult('     - Wait 30-60 seconds after starting VM');
				logResult('     - Retry query ip command');
				logResult('');
				logResult('  2. Guest agent communication channel broken');
				logResult('     - Check UTM logs for virtio-serial errors');
			} else {
				logResult('Unexpected error - please investigate');
			}
			logResult('');
			logResult('Result: Guest agent query FAILED - see error analysis above');
		}
	});

	test('Experiment 3: Test Guest Agent - Execute Command', async function() {
		const utmInstalled = await isUTMInstalled();
		if (!utmInstalled) {
			this.skip();
			return;
		}

		logResult('\n============================================================');
		logResult('EXPERIMENT 3: QEMU Guest Agent - Execute Command');
		logResult('============================================================');
		logResult('Goal: Test executing RouterOS commands via guest agent\n');
		
		logResult('Background:');
		logResult('  - UTM guest agent supports "execute" command');
		logResult('  - Can run arbitrary commands inside CHR');
		logResult('  - RouterOS commands must be valid CLI syntax');
		logResult('  - This unlocks powerful automation features');
		logResult('');

		// Find running CHR VM
		let testVM: string;
		try {
			const provisioned = await ensureRunningQemuCHRVM({ logger: logResult });
			testVM = provisioned.name;
			
			logResult(`Testing with VM: "${testVM}"`);
			logResult(`Provision info: backend=${provisioned.backend} arch=${provisioned.architecture} version=${provisioned.version} created=${provisioned.wasCreated}`);
			logResult('');
			
		} catch (error) {
			logResult(`❌ Error provisioning/running QEMU VM: ${(error as Error).message}`);
			this.skip();
			return;
		}

		// Test execute command
		logResult('Testing: execute command (get system identity)...');
		try {
			// Simple RouterOS command to get identity
			const cmd = ':put [/system identity get name]';
			
			const executeScript = `
				tell application "UTM"
					set vm to virtual machine named "${escapeAppleScript(testVM)}"
					tell (execute of vm at "/system/bin/routeros-cli" with arguments {"${cmd}"} with output capturing)
						repeat
							set res to get result
							if exited of res then exit repeat
						end repeat
						return output text of res
					end tell
				end tell
			`;
			
			const output = await execAppleScript(executeScript);
			
			logResult('✅ SUCCESS! Guest agent execute command WORKS!');
			logResult('');
			logResult(`Command: ${cmd}`);
			logResult(`Output: ${output}`);
			logResult('');
			
			logResult('What this unlocks:');
			logResult('  ✅ Run any RouterOS CLI command remotely');
			logResult('  ✅ Automation scripts without REST API');
			logResult('  ✅ Diagnostics and troubleshooting');
			logResult('  ✅ Configuration export/backup');
			logResult('  ✅ Status monitoring (interfaces, resources, etc.)');
			logResult('');
			
			logResult('Use cases for TikBook:');
			logResult('  - Auto-configure CHR for first use (set identity, enable REST API)');
			logResult('  - Export configuration before dangerous operations');
			logResult('  - Run health checks before connecting');
			logResult('  - Automated testing workflows');
			
		} catch (error) {
			const errorMsg = (error as Error).message;
			logResult('❌ Guest agent execute FAILED');
			logResult('');
			logResult(`Error: ${errorMsg}`);
			logResult('');
			logResult('Note: Execute may fail even if query ip works');
			logResult('  - Depends on RouterOS CLI being accessible');
			logResult('  - May require specific guest agent version');
			logResult('  - Less critical than query ip for Phase 3');
			logResult('');
			logResult('Result: Execute command failed - query ip is sufficient for MVP');
		}
	});

	test('Experiment 4: Alternative Approach - Parse UTM Config', async function() {
		const utmInstalled = await isUTMInstalled();
		if (!utmInstalled) {
			this.skip();
			return;
		}

		logResult('\n============================================================');
		logResult('EXPERIMENT 4: Alternative - Parse UTM Configuration');
		logResult('============================================================');
		logResult('Goal: Get network config from VM config files (fallback approach)\n');
		
		logResult('Background:');
		logResult('  - UTM stores VM configs in ~/Library/Containers/...');
		logResult('  - config.plist contains network settings');
		logResult('  - Can determine network mode and expected IP range');
		logResult('  - Does NOT give actual IP, but can predict default IP');
		logResult('');

		// List VM bundles
		try {
			const vmPath = path.join(
				process.env.HOME ?? '',
				'Library/Containers/com.utmapp.UTM/Data/Documents'
			);
			
			logResult(`Checking VM configs in: ${vmPath}`);
			logResult('');
			
			if (!fs.existsSync(vmPath)) {
				logResult('❌ UTM config directory not found');
				logResult('   UTM may not be installed or never launched');
				return;
			}
			
			const entries = fs.readdirSync(vmPath);
			const vmBundles = entries.filter(e => e.endsWith('.utm'));
			
			logResult(`Found ${vmBundles.length} VM bundle(s)`);
			
			if (vmBundles.length === 0) {
				logResult('   No VMs found (expected if none created yet)');
				return;
			}
			
			logResult('');
			
			// Examine first VM config
			const firstBundle = vmBundles[0];
			const configPath = path.join(vmPath, firstBundle, 'config.plist');
			
			if (!fs.existsSync(configPath)) {
				logResult(`⚠️  config.plist not found in ${firstBundle}`);
				logResult('   VM may be in old format or corrupted');
				return;
			}
			
			logResult(`Examining: ${firstBundle}`);
			logResult('');
			
			// Read config (plist is XML or binary)
			const configContent = fs.readFileSync(configPath, 'utf-8');
			
			// Look for network-related keys (simplified parsing)
			const hasNAT = configContent.includes('NAT') || configContent.includes('nat');
			const hasBridge = configContent.includes('bridge') || configContent.includes('Bridged');
			const hasShared = configContent.includes('shared') || configContent.includes('Shared');
			
			logResult('Network configuration indicators:');
			logResult(`  NAT mode: ${hasNAT ? '✓' : '✗'}`);
			logResult(`  Bridged mode: ${hasBridge ? '✓' : '✗'}`);
			logResult(`  Shared mode: ${hasShared ? '✓' : '✗'}`);
			logResult('');
			
			if (hasNAT) {
				logResult('Default NAT network (UTM typical):');
				logResult('  - Subnet: 192.168.64.0/24');
				logResult('  - VM IP (typical): 192.168.64.x (varies)');
				logResult('  - Gateway: 192.168.64.1');
				logResult('  - DNS: 192.168.64.3');
				logResult('');
				logResult('Limitation: Cannot determine exact IP from config');
				logResult('            Guest agent query ip is more reliable');
			}
			
			logResult('');
			logResult('Result: Config parsing possible but limited');
			logResult('        Recommend guest agent as primary approach');
			logResult('        Config parsing useful for documentation/hints only');
			
		} catch (error) {
			logResult(`❌ Error examining config: ${(error as Error).message}`);
		}
	});

	test('Experiment 5: Comprehensive Strategy Recommendation', function() {
		logResult('\n============================================================');
		logResult('EXPERIMENT 5: Strategy Recommendation & Roadmap');
		logResult('============================================================');
		logResult('Goal: Determine best implementation approach for TikBook\n');
		
		logResult('## Summary of Findings\n');
		
		logResult('### Approach A: QEMU Guest Agent (RECOMMENDED)\n');
		logResult('Status: See Experiment 2 results above');
		logResult('');
		logResult('Pros:');
		logResult('  ✅ Official UTM API (maintains compatibility)');
		logResult('  ✅ Fast and reliable (if guest agent available)');
		logResult('  ✅ No network scanning or guessing');
		logResult('  ✅ Returns all IPs (can filter for primary)');
		logResult('  ✅ Works even if REST API not configured yet');
		logResult('');
		logResult('Cons:');
		logResult('  ❌ Requires VM to be running');
		logResult('  ❌ QEMU backend only (not Apple Virtualization)');
		logResult('  ❌ May fail if guest agent not available');
		logResult('');
		logResult('Implementation:');
		logResult('  ```typescript');
		logResult('  async getVMIPAddress(vmName: string): Promise<string | null> {');
		logResult('    const script = `');
		logResult('      tell application "UTM"');
		logResult('        set vm to virtual machine named "${vmName}"');
		logResult('        set ipList to query ip vm');
		logResult('        return ipList as list');
		logResult('      end tell');
		logResult('    `;');
		logResult('    const result = await execAppleScript(script);');
		logResult('    const ips = result.split(", ");');
		logResult('    // Filter for first non-loopback IPv4');
		logResult('    return ips.find(ip => !ip.startsWith("127.") && !ip.includes(":")) || null;');
		logResult('  }');
		logResult('  ```');
		logResult('');
		
		logResult('### Approach B: Parse UTM Config (FALLBACK)\n');
		logResult('Status: Tested in Experiment 4');
		logResult('');
		logResult('Pros:');
		logResult('  ✅ Works when VM is stopped');
		logResult('  ✅ No guest agent needed');
		logResult('  ✅ Can document expected network settings');
		logResult('');
		logResult('Cons:');
		logResult('  ❌ Does not give actual IP, only network mode');
		logResult('  ❌ UTM config format may change');
		logResult('  ❌ Requires file system access');
		logResult('');
		logResult('Use case:');
		logResult('  - Show expected IP range in tree view when VM stopped');
		logResult('  - Documentation hints ("VM will get IP in 192.168.64.x range")');
		logResult('  - Not suitable for automatic connection');
		logResult('');
		
		logResult('### Approach C: Query RouterOS REST API (COMPLEMENTARY)\n');
		logResult('Status: Already used in TikBook for connection management');
		logResult('');
		logResult('Pros:');
		logResult('  ✅ Always accurate (source of truth)');
		logResult('  ✅ Works with any RouterOS device');
		logResult('  ✅ Already implemented in TikBook');
		logResult('');
		logResult('Cons:');
		logResult('  ❌ Requires knowing IP beforehand (chicken-and-egg)');
		logResult('  ❌ Requires REST API to be configured and accessible');
		logResult('');
		logResult('Use case:');
		logResult('  - Verify IP after guest agent detection');
		logResult('  - Update IP if changed (DHCP renewal)');
		logResult('  - Get additional network info (interfaces, addresses)');
		logResult('');
		
		logResult('## Recommended Implementation Plan\n');
		logResult('');
		logResult('### Phase 3a: Basic IP Detection (2-4 hours)\n');
		logResult('1. Implement getVMIPAddress() in utm-provider.ts');
		logResult('   - Try guest agent query ip first');
		logResult('   - Return null if guest agent unavailable');
		logResult('   - Log clear error messages for troubleshooting');
		logResult('');
		logResult('2. Show IP in tree view for running VMs');
		logResult('   - TreeItem description: "running - 192.168.64.10"');
		logResult('   - Tooltip: Full IP list + network mode');
		logResult('   - Refresh on VM start/stop');
		logResult('');
		logResult('3. Add context menu: "Connect to CHR"');
		logResult('   - Get IP via guest agent');
		logResult('   - Update TikBook connection settings');
		logResult('   - Test REST API connectivity');
		logResult('   - Show success/error notification');
		logResult('');
		
		logResult('### Phase 3b: Enhanced Networking (4-6 hours)\n');
		logResult('1. Detect backend type (QEMU vs Apple)');
		logResult('   - Show warning if guest agent won\'t work');
		logResult('   - Suggest reconfiguring VM for QEMU');
		logResult('');
		logResult('2. Config parsing for documentation');
		logResult('   - Show expected IP range when stopped');
		logResult('   - Display network mode (NAT/Bridged)');
		logResult('');
		logResult('3. Automatic connection workflow');
		logResult('   - Start VM → wait for boot → query IP → test REST API → connect');
		logResult('   - Progress notifications at each step');
		logResult('   - Error recovery (retry, manual IP entry)');
		logResult('');
		
		logResult('### Phase 3c: Advanced Features (Optional, 6-10 hours)\n');
		logResult('1. Guest agent command execution (Experiment 3)');
		logResult('   - Run RouterOS commands remotely');
		logResult('   - Export configuration');
		logResult('   - Automated setup scripts');
		logResult('');
		logResult('2. Network monitoring');
		logResult('   - Track IP changes (DHCP renewal)');
		logResult('   - Detect connection loss');
		logResult('   - Auto-reconnect on network change');
		logResult('');
		logResult('3. Multi-VM orchestration');
		logResult('   - Start multiple CHR VMs');
		logResult('   - Coordinate network setup');
		logResult('   - Test scenarios (CHR as router for other VMs)');
		logResult('');
		
		logResult('## Next Steps\n');
		logResult('');
		logResult('1. Review experiment results above (especially Experiment 2)');
		logResult('2. If guest agent WORKS:');
		logResult('   → Proceed with Phase 3a implementation');
		logResult('   → Update utm-provider.ts with getVMIPAddress()');
		logResult('   → Add IP display in tree view');
		logResult('');
		logResult('3. If guest agent FAILS:');
		logResult('   → Investigate cause (backend type, virtio-serial, CHR version)');
		logResult('   → Test with different CHR versions');
		logResult('   → Consider config parsing + manual IP entry as fallback');
		logResult('');
		logResult('4. Document findings:');
		logResult('   → Update docs/chr-qemu-guest-agent-research.md with test results');
		logResult('   → Update docs/applescript-patterns.md with working examples');
		logResult('   → Create docs/chr-ip-detection-guide.md for users');
		logResult('');
		
		logResult('## Feature Impact Analysis\n');
		logResult('');
		logResult('### What Guest Agent IP Detection Unlocks:\n');
		logResult('');
		logResult('1. **One-Click CHR Connection**');
		logResult('   - User starts VM in TikBook tree view');
		logResult('   - Extension queries IP automatically');
		logResult('   - Connection settings updated');
		logResult('   - User just clicks "Run" on .rsc file');
		logResult('   - No manual IP configuration needed');
		logResult('');
		logResult('2. **Seamless CHR Development Workflow**');
		logResult('   - Download CHR via "Add CHR VM" command');
		logResult('   - UTM imports and configures automatically');
		logResult('   - Start VM from TikBook');
		logResult('   - Extension detects IP and connects');
		logResult('   - Write/test RouterOS scripts immediately');
		logResult('');
		logResult('3. **Multi-CHR Testing**');
		logResult('   - Run multiple CHR VMs (different versions)');
		logResult('   - Each gets detected and listed with IP');
		logResult('   - Switch between CHR instances easily');
		logResult('   - Test compatibility across RouterOS versions');
		logResult('');
		logResult('4. **Integration with Copilot/AI Features**');
		logResult('   - Copilot can suggest: "Start CHR VM and run this script"');
		logResult('   - Extension handles VM start + IP detection + connection');
		logResult('   - User gets instant feedback on script results');
		logResult('   - AI can iterate on script based on CHR output');
		logResult('');
		logResult('5. **Automated Testing/CI-CD**');
		logResult('   - Start CHR VM programmatically');
		logResult('   - Query IP when ready');
		logResult('   - Run test scripts via REST API');
		logResult('   - Validate script behavior');
		logResult('   - Stop VM and cleanup');
		logResult('');
		logResult('6. **Better UX for Beginners**');
		logResult('   - No need to know what an IP address is');
		logResult('   - No manual network configuration');
		logResult('   - No guessing or scanning');
		logResult('   - "It just works" experience like Docker/containers');
		logResult('');
		
		logResult('## Conclusion\n');
		logResult('');
		logResult('The ability to detect CHR IP addresses via guest agent is a');
		logResult('**critical enabler** for TikBook\'s vision of seamless RouterOS');
		logResult('development in VS Code.');
		logResult('');
		logResult('It transforms CHR VMs from "VMs you manage separately" to');
		logResult('"first-class development environments" that work like');
		logResult('containers but provide full RouterOS functionality.');
		logResult('');
		logResult('**Recommendation:**');
		logResult('- Prioritize Phase 3a if Experiment 2 succeeds');
		logResult('- This unlocks major UX improvements');
		logResult('- Differentiates TikBook from manual VM workflows');
		logResult('- Enables future AI/Copilot features');
		logResult('');
	});
});
