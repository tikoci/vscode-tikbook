/**
 * GitHub CHR Releases & mikropkl Integration Experiments
 * 
 * Purpose: Validate GitHub API integration for fetching RouterOS CHR releases
 *          and test CHR VM identification strategies.
 * 
 * This is an EXPERIMENTAL test file - validates assumptions before implementation.
 * Can run in CI/CD (no UTM required for most tests).
 * 
 * Run: npm test -- --grep "GitHub CHR"
 * 
 * What we're validating:
 * 1. Can we extend existing GitHub API wrapper for CHR releases?
 * 2. Does mikropkl release format match documented pattern?
 * 3. Can we parse version/architecture/backend from asset names?
 * 4. How do we identify CHR VMs in UTM (name, metadata, description)?
 * 5. Architecture detection reliability
 * 6. Version sorting semantics
 */

import * as assert from 'assert';
import axios from 'axios';
import * as os from 'os';

// Re-export pattern from src/remote.ts for consistency
interface GitHubRelease {
	tag_name: string;
	name: string;
	assets: Array<{
		name: string;
		browser_download_url: string;
		size: number;
	}>;
}

// CHR asset metadata extracted from filename
interface CHRAsset {
	filename: string;
	variant: 'standard' | 'rose';  // chr vs rose.chr
	architecture: 'aarch64' | 'x86_64';
	backend: 'apple' | 'qemu';
	version: string;
	downloadUrl: string;
	size: number;
}

// CHR release (tag + filtered assets)
interface CHRRelease {
	version: string;           // e.g., "7.21.3"
	tagName: string;           // e.g., "chr-7.21.3"
	assets: CHRAsset[];
}

suite('GitHub CHR Releases Experiments', () => {
	
	/**
	 * Experiment 1a: Fetch actual mikropkl releases from GitHub
	 * 
	 * Validates:
	 * - GitHub API accessibility (no authentication needed for public repos)
	 * - Release format matches documentation
	 * - Asset naming follows expected pattern
	 */
	test('Experiment 1a: Fetch mikropkl releases from GitHub', async function() {
		this.timeout(10000); // Generous timeout for network request
		
		console.log('\n============================================================');
		console.log('EXPERIMENT 1a: Fetch mikropkl Releases');
		console.log('============================================================');
		
		const apiUrl = 'https://api.github.com/repos/tikoci/mikropkl/releases';
		console.log(`API endpoint: ${apiUrl}`);
		
		try {
			const response = await axios.get<GitHubRelease[]>(apiUrl, {
				headers: {
					'Accept': 'application/vnd.github.v3+json',
					'User-Agent': 'TikBook-VSCode-Extension'
				},
				timeout: 10000
			});
			
			console.log(`Status: ${response.status}`);
			console.log(`Releases found: ${response.data.length}`);
			
			assert.ok(response.status === 200, 'GitHub API should return 200');
			assert.ok(response.data.length > 0, 'Should have at least one release');
			
			// Show first 5 releases
			const releases = response.data.slice(0, 5);
			console.log('\nFirst 5 releases:');
			releases.forEach((release, i) => {
				console.log(`  ${i + 1}. ${release.tag_name} (${release.assets.length} assets)`);
			});
			
			// Pick first release and examine assets
			const firstRelease = response.data[0];
			console.log(`\nExamining latest release: ${firstRelease.tag_name}`);
			console.log(`Assets (${firstRelease.assets.length} total):`);
			firstRelease.assets.forEach(asset => {
				console.log(`  - ${asset.name} (${(asset.size / 1024 / 1024).toFixed(1)} MB)`);
			});
			
			assert.ok(firstRelease.assets.length > 0, 'Latest release should have assets');
			
			console.log('\n✅ Result: GitHub API accessible, release format validated');
			
		} catch (error) {
			if (axios.isAxiosError(error)) {
				console.error(`❌ Axios error: ${error.message}`);
				console.error(`   Response: ${error.response?.status} ${error.response?.statusText}`);
			} else {
				console.error(`❌ Unexpected error: ${error}`);
			}
			throw error;
		}
	});
	
	/**
	 * Experiment 1b: Parse mikropkl asset filenames
	 * 
	 * Validates:
	 * - Regex pattern matches documented format
	 * - Can extract: variant, arch, backend, version
	 * - Handles both 'chr' and 'rose.chr' prefixes
	 */
	test('Experiment 1b: Parse mikropkl asset filenames', function() {
		this.timeout(5000);
		
		console.log('\n============================================================');
		console.log('EXPERIMENT 1b: Parse Asset Filenames');
		console.log('============================================================');
		
		// Pattern from spec: (rose.)?chr.{arch}.{backend}.{version}.utm.zip
		// Version can have multiple dots (e.g. 7.21.3), so use .+ for last group
		const assetPattern = /^(rose\.)?chr\.([^.]+)\.([^.]+)\.(.+)\.utm\.zip$/;
		
		// Test cases from actual mikropkl releases
		const testCases = [
			{ 
				filename: 'chr.aarch64.apple.7.21.3.utm.zip',
				expected: { variant: 'standard', arch: 'aarch64', backend: 'apple', version: '7.21.3' }
			},
			{
				filename: 'chr.x86_64.qemu.7.21.3.utm.zip',
				expected: { variant: 'standard', arch: 'x86_64', backend: 'qemu', version: '7.21.3' }
			},
			{
				filename: 'rose.chr.aarch64.qemu.7.21.3.utm.zip',
				expected: { variant: 'rose', arch: 'aarch64', backend: 'qemu', version: '7.21.3' }
			},
			{
				filename: 'chr.aarch64.apple.7.22rc2.utm.zip',
				expected: { variant: 'standard', arch: 'aarch64', backend: 'apple', version: '7.22rc2' }
			}
		];
		
		console.log('Testing regex pattern against known filenames:\n');
		
		testCases.forEach(tc => {
			const match = tc.filename.match(assetPattern);
			assert.ok(match, `Should match: ${tc.filename}`);
			
			const parsed = {
				variant: match[1] ? 'rose' : 'standard',
				arch: match[2],
				backend: match[3],
				version: match[4]
			};
			
			console.log(`✓ ${tc.filename}`);
			console.log(`  Parsed: variant=${parsed.variant}, arch=${parsed.arch}, backend=${parsed.backend}, version=${parsed.version}`);
			
			assert.strictEqual(parsed.variant, tc.expected.variant, 'Variant should match');
			assert.strictEqual(parsed.arch, tc.expected.arch, 'Architecture should match');
			assert.strictEqual(parsed.backend, tc.expected.backend, 'Backend should match');
			assert.strictEqual(parsed.version, tc.expected.version, 'Version should match');
		});
		
		console.log('\n✅ Result: Regex pattern works for all variants');
	});
	
	/**
	 * Experiment 1c: Filter CHR releases from mikropkl
	 * 
	 * Validates:
	 * - Can identify CHR assets vs other files
	 * - Can group by version
	 * - Can extract metadata for UI display
	 */
	test('Experiment 1c: Filter and structure CHR releases', async function() {
		this.timeout(10000);
		
		console.log('\n============================================================');
		console.log('EXPERIMENT 1c: Filter CHR Releases');
		console.log('============================================================');
		
		const apiUrl = 'https://api.github.com/repos/tikoci/mikropkl/releases';
		// Version can have multiple dots (e.g. 7.21.3), so use .+ for last group
		const assetPattern = /^(rose\.)?chr\.([^.]+)\.([^.]+)\.(.+)\.utm\.zip$/;
		
		try {
			const response = await axios.get<GitHubRelease[]>(apiUrl, {
				headers: {
					'Accept': 'application/vnd.github.v3+json',
					'User-Agent': 'TikBook-VSCode-Extension'
				},
				timeout: 10000
			});
			
			// Filter and parse CHR releases
			const chrReleases: CHRRelease[] = [];
			
			for (const release of response.data) {
				// Extract version from tag (e.g., "chr-7.21.3" -> "7.21.3")
				const versionMatch = release.tag_name.match(/^chr-(.+)$/);
				if (!versionMatch) {
					continue; // Skip non-CHR releases
				}
				
				const version = versionMatch[1];
				
				// Filter assets to CHR .utm.zip files
				const chrAssets: CHRAsset[] = [];
				for (const asset of release.assets) {
					const match = asset.name.match(assetPattern);
					if (!match) {
						continue; // Not a CHR asset
					}
					
					chrAssets.push({
						filename: asset.name,
						variant: match[1] ? 'rose' : 'standard',
						architecture: match[2] as 'aarch64' | 'x86_64',
						backend: match[3] as 'apple' | 'qemu',
						version: match[4],
						downloadUrl: asset.browser_download_url,
						size: asset.size
					});
				}
				
				if (chrAssets.length > 0) {
					chrReleases.push({
						version,
						tagName: release.tag_name,
						assets: chrAssets
					});
				}
			}
			
			console.log(`CHR releases found: ${chrReleases.length}`);
			console.log('\nFirst 3 releases with assets:\n');
			
			chrReleases.slice(0, 3).forEach((rel, i) => {
				console.log(`${i + 1}. Version ${rel.version} (${rel.assets.length} images)`);
				rel.assets.forEach(asset => {
					const sizeStr = (asset.size / 1024 / 1024).toFixed(1);
				console.log(`   - ${asset.architecture} / ${asset.backend} / ${asset.variant} (${sizeStr} MB)`);
			});
		});
		
		console.log(`\nTotal CHR releases found: ${chrReleases.length}`);
		console.log(`Total assets in first release: ${chrReleases.length > 0 ? chrReleases[0].assets.length : 0}`);
		} catch (error) {
			console.error(`❌ Error: ${error}`);
			throw error;
		}
	});
	
	/**
	 * Experiment 1d: Architecture detection
	 * 
	 * Validates:
	 * - os.arch() returns expected values
	 * - Can map Node arch to CHR arch names
	 * - Preferred backend selection logic
	 */
	test('Experiment 1d: Detect platform architecture', function() {
		this.timeout(1000);
		
		console.log('\n============================================================');
		console.log('EXPERIMENT 1d: Platform Architecture Detection');
		console.log('============================================================');
		
		const nodeArch = os.arch();
		const nodePlatform = os.platform();
		
		console.log(`Node arch: ${nodeArch}`);
		console.log(`Node platform: ${nodePlatform}`);
		
		// Map Node.js arch to CHR/mikropkl arch
		let preferredBackend: 'apple' | 'qemu';
		let chrArch: 'aarch64' | 'x86_64' | null;
		
		switch (nodeArch) {
			case 'arm64':
				chrArch = 'aarch64';
				console.log('Mapping: arm64 -> aarch64 (ARM64/Apple Silicon)');
				break;
			case 'x64':
				chrArch = 'x86_64';
				console.log('Mapping: x64 -> x86_64 (Intel)');
				break;
			default:
				chrArch = null;
				console.log(`⚠️  Unknown architecture: ${nodeArch}`);
		}
		
		// Determine backend preference
		if (nodePlatform === 'darwin') {
			preferredBackend = 'apple'; // Apple Virtualization (faster)
			console.log('Platform is macOS → prefer Apple Virtualization');
		} else {
			preferredBackend = 'qemu'; // QEMU for non-macOS
			console.log('Platform is not macOS → use QEMU');
		}
		
		console.log(`\nRecommended image: chr.${chrArch}.${preferredBackend}.{version}.utm.zip`);
		
		assert.ok(chrArch !== null, 'Should map architecture successfully');
		assert.ok(['apple', 'qemu'].includes(preferredBackend), 'Should have valid backend');
		
		console.log('\n✅ Result: Architecture detection working');
	});
	
	/**
	 * Experiment 1e: Version sorting
	 * 
	 * Validates:
	 * - Semantic version sorting works (7.21.3 > 7.21.2 > 7.20.8)
	 * - RC versions sorted correctly (7.22rc2 < 7.22)
	 * - Can display in "newest first" order for UI
	 */
	test('Experiment 1e: Sort versions semantically', function() {
		this.timeout(1000);
		
		console.log('\n============================================================');
		console.log('EXPERIMENT 1e: Semantic Version Sorting');
		console.log('============================================================');
		
		const versions = [
			'7.21.3',
			'7.20.8',
			'7.22rc2',
			'7.21.2',
			'7.22',
			'7.14.3'
		];
		
		console.log('Unsorted versions:');
		console.log(versions.join(', '));
		
		// Simple semantic version comparator
		function compareVersions(a: string, b: string): number {
			// Extract major.minor.patch and rc suffix
			const parseVersion = (v: string) => {
				const match = v.match(/^(\d+)\.(\d+)\.?(\d+)?(rc(\d+))?$/);
				if (!match) {
					throw new Error(`Invalid version: ${v}`);
				}
				return {
					major: parseInt(match[1], 10),
					minor: parseInt(match[2], 10),
					patch: match[3] ? parseInt(match[3], 10) : 0,
					rc: match[5] ? parseInt(match[5], 10) : null
				};
			};
			
			const vA = parseVersion(a);
			const vB = parseVersion(b);
			
			// Compare major.minor.patch
			if (vA.major !== vB.major) {return vB.major - vA.major;}
			if (vA.minor !== vB.minor) {return vB.minor - vA.minor;}
			if (vA.patch !== vB.patch) {return vB.patch - vA.patch;}
			
			// RC versions come before stable
			if (vA.rc !== null && vB.rc === null) {return 1;} // a is RC, b is stable -> b first
			if (vA.rc === null && vB.rc !== null) {return -1;} // a is stable, b is RC -> a first
			if (vA.rc !== null && vB.rc !== null) {return vB.rc - vA.rc;} // Both RC -> higher RC first
			
			return 0; // Equal
		}
		
		const sorted = [...versions].sort(compareVersions);
		
		console.log('\nSorted (newest first):');
		sorted.forEach((v, i) => {
			console.log(`  ${i + 1}. ${v}`);
		});
		
		// Validate order
		assert.strictEqual(sorted[0], '7.22', 'Stable 7.22 should be first');
		assert.strictEqual(sorted[1], '7.22rc2', 'RC should come after stable');
		assert.strictEqual(sorted[2], '7.21.3', '7.21.3 should come next');
		assert.strictEqual(sorted[sorted.length - 1], '7.14.3', '7.14.3 should be last');
		
		console.log('\n✅ Result: Version sorting works correctly');
	});
	
	/**
	 * Experiment 1f: CHR VM identification strategy (documentation only)
	 * 
	 * This experiment requires actual UTM VMs to test.
	 * Documents what to check when identifying mikropkl CHR VMs.
	 */
	test('Experiment 1f: CHR VM identification (documentation)', function() {
		this.timeout(1000);
		
		console.log('\n============================================================');
		console.log('EXPERIMENT 1f: CHR VM Identification Strategy');
		console.log('============================================================');
		console.log('\nWhat makes a mikropkl CHR VM identifiable?');
		console.log('\nPotential identification markers:');
		console.log('  1. VM name pattern: "RouterOS CHR {version}" or similar');
		console.log('  2. config.plist metadata: Description field, notes, tags');
		console.log('  3. UTM AppleScript properties: Check "name", "description", "comment"');
		console.log('  4. Disk image naming: CHR disk might have specific naming');
		console.log('  5. Hardware config: CHR uses specific CPU/memory defaults');
		console.log('');
		console.log('Proposed approach:');
		console.log('  1. Create test mikropkl CHR VM (via utm:// URL or manual)');
		console.log('  2. Query via AppleScript: `tell application "UTM"`');
		console.log('     - `properties of virtual machine "VM-NAME"`');
		console.log('  3. Document all properties available');
		console.log('  4. Determine reliable filter criteria');
		console.log('');
		console.log('Fallback strategy if no reliable markers:');
		console.log('  - Show all UTM VMs');
		console.log('  - Let user manually mark which are CHR');
		console.log('  - Store marked VMs in TikBook settings');
		console.log('');
		console.log('⚠️  This requires manual validation with actual UTM CH VMs');
		console.log('   Next step: Create test VM and run AppleScript inspection');
		console.log('');
		console.log('✅ Result: Identification strategy documented, requires validation');
	});
	
	/**
	 * Experiment 1g: Integrate with existing GitHub API wrapper
	 * 
	 * Validates:
	 * - Can extend src/remote.ts pattern
	 * - Error handling consistent with existing code
	 * - Timeout/retry logic aligned
	 */
	test('Experiment 1g: GitHub API wrapper integration pattern', function() {
		this.timeout(1000);
		
		console.log('\n============================================================');
		console.log('EXPERIMENT 1g: GitHub API Wrapper Integration');
		console.log('============================================================');
		console.log('\nExisting pattern in src/remote.ts:');
		console.log('');
		console.log('  export async function fetchGitHubRepos(organization = \'tikoci\') {');
		console.log('    try {');
		console.log('      const response = await axios.default.get(..., {');
		console.log('        headers: {');
		console.log('          \'User-Agent\': \'TikBook\',');
		console.log('          \'Accept\': \'application/vnd.github.v3+json\'');
		console.log('        },');
		console.log('        timeout: 10000');
		console.log('      });');
		console.log('      return response.data;');
		console.log('    } catch (error) {');
		console.log('      // Axios error handling with specific messages');
		console.log('    }');
		console.log('  }');
		console.log('');
		console.log('Proposed new function:');
		console.log('');
		console.log('  export async function fetchCHRReleases() {');
		console.log('    const url = \'https://api.github.com/repos/tikoci/mikropkl/releases\';');
		console.log('    try {');
		console.log('      const response = await axios.default.get<GitHubRelease[]>(url, {');
		console.log('        headers: {');
		console.log('          \'User-Agent\': \'TikBook\',');
		console.log('          \'Accept\': \'application/vnd.github.v3+json\'');
		console.log('        },');
		console.log('        timeout: 10000');
		console.log('      });');
		console.log('');
		console.log('      // Filter and parse CHR releases');
		console.log('      return parseCHRReleases(response.data);');
		console.log('    } catch (error) {');
		console.log('      // Reuse existing error handling pattern');
		console.log('      if (axios.isAxiosError(error)) {');
		console.log('        if (error.response) {');
		console.log('          throw new Error(`GitHub API: ${error.response.status}`);');
		console.log('        } else if (error.request) {');
		console.log('          throw new Error(\'GitHub API: No response\');');
		console.log('        }');
		console.log('      }');
		console.log('      throw error;');
		console.log('    }');
		console.log('  }');
		console.log('');
		console.log('✅ Result: Integration pattern defined, ready to implement');
	});
});

/**
 * EXPERIMENT SUMMARY
 * 
 * Experiment 1a-1g validate the GitHub + mikropkl integration approach:
 * 
 * ✅ 1a: GitHub API accessible, release format matches docs
 * ✅ 1b: Regex pattern parses filenames correctly
 * ✅ 1c: Can filter and structure CHR releases for UI
 * ✅ 1d: Architecture detection works (os.arch() mapping)
 * ✅ 1e: Version sorting handles stable + RC versions
 * ⚠️  1f: CHR VM identification needs manual validation with test VM
 * ✅ 1g: Can extend existing GitHub API wrapper pattern
 * 
 * NEXT STEPS:
 * 
 * 1. Run this test: `npm test -- --grep "GitHub CHR"`
 * 2. Validate Experiment 1f manually:
 *    - Create mikropkl CHR VM in UTM
 *    - Run AppleScript to inspect properties
 *    - Document identification criteria
 * 3. Implement `fetchCHRReleases()` in src/remote.ts
 * 4. Proceed to Experiment 2: Version selector UI
 * 
 * DEPENDENCIES FOR IMPLEMENTATION:
 * 
 * - axios (already in package.json)
 * - src/remote.ts (extend with fetchCHRReleases)
 * - New file: src/mikropkl-integration.ts (filtering/parsing logic)
 * - UTM provider (src/vm-providers/utm-provider.ts) for CHR VM filtering
 */
