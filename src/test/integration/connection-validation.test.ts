/**
 * Connection Validation Tests
 * 
 * These tests run FIRST to validate RouterOS connectivity before other integration tests.
 * They help diagnose connection issues by separating URL problems from authentication problems.
 * 
 * Test failure types:
 * - Timeout/ECONNREFUSED: URL is invalid or RouterOS device is unreachable
 * - HTTP 401: URL is valid but username/password is incorrect
 * - HTTP 200: Both URL and credentials are correct
 */

import * as assert from 'assert';
import { getRouterOSTestConfig, hasRouterOSTestConfig } from './integration-test-config';

suite('RouterOS Connection Validation', function() {
	// Increase timeout for network operations
	this.timeout(10000);

	const config = getRouterOSTestConfig();

	// Skip entire suite if skipLiveTests is true
	if (config.skipLiveTests) {
		console.log('\u2298 RouterOS tests skipped (skipLiveTests: true in .sarbsettings)');
		console.log('\u2298 Set skipLiveTests to true in .sarbsettings to skip when device unavailable');
	}

	test('has RouterOS test configuration', function() {
		if (config.skipLiveTests) {
			this.skip();
		}
		
		const hasConfig = hasRouterOSTestConfig();
		if (!hasConfig) {
			console.warn('⚠️  No .sarbsettings found - using default config (http://192.168.88.1)');
			console.warn('⚠️  Create .sarbsettings from .sarbsettings.example to configure test device');
		}
		// Don't fail - just warn. Tests will fail later if device is unreachable.
		assert.ok(true, 'Configuration loaded');
	});

	test('URL is reachable (HTTP base URL)', async function() {
		if (config.skipLiveTests) {
			this.skip();
		}
		
		// Test if the base URL responds (expect 200-299 or 401)
		// Timeout or connection refused means URL is wrong
		
		const url = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
		
		try {
			// Use Node.js fetch (or https module if pre-Node 18)
			const response = await fetch(url, {
				method: 'GET',
				signal: AbortSignal.timeout(config.apiTimeout)
			});

			// Any HTTP response (even 401) means URL is valid
			assert.ok(
				response.status >= 200 && response.status < 600,
				`URL is reachable (status: ${response.status})`
			);

			console.log(`✓ URL is reachable: ${url} (status: ${response.status})`);
		} catch (error: unknown) {
			const err = error as Error & { code?: string };
			
			const isNetworkError = err.name === 'AbortError' || err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT';
			if (isNetworkError) {
				assert.fail(
					`❌ URL is NOT reachable: ${url}\n` +
					`   Error: ${err.message}\n` +
					`   → Check that baseUrl in .sarbsettings is correct\n` +
					`   → Verify RouterOS device is running and accessible\n` +
					`   → Check network connectivity and firewall rules`
				);
			}
			
			// Re-throw unexpected errors
			throw error;
		}
	});

	test('REST API endpoint is accessible (/rest)', async function() {
		if (config.skipLiveTests) {
			this.skip();
		}
		
		// Test if the REST API endpoint specifically responds
		const url = `${config.baseUrl}/rest`;
		
		try {
			const response = await fetch(url, {
				method: 'GET',
				signal: AbortSignal.timeout(config.apiTimeout)
			});

			// REST API should return 401 (auth required) or 200 (if no auth needed - rare)
			const isValidStatus = response.status === 401 || response.status === 200;
			assert.ok(
				isValidStatus,
				`REST API endpoint responds (status: ${response.status})`
			);

			console.log(`✓ REST API accessible: ${url} (status: ${response.status})`);
		} catch (error: unknown) {
			const err = error as Error & { code?: string };
			
			const isNetworkError = err.name === 'AbortError' || err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT';
			if (isNetworkError) {
				assert.fail(
					`❌ REST API endpoint NOT accessible: ${url}\n` +
					`   Error: ${err.message}\n` +
					`   → Check that RouterOS REST API is enabled\n` +
					`   → Verify port is correct (default: 7080 for HTTP, 7081 for HTTPS)\n` +
					`   → Check /ip/service in RouterOS to enable REST API`
				);
			}
			
			throw error;
		}
	});

	test('Authentication works (GET /rest/system/identity)', async function() {
		if (config.skipLiveTests) {
			this.skip();
		}
		
		// Test if credentials are valid by getting system identity
		const url = `${config.baseUrl}/rest/system/identity`;
		
		// Create Basic Auth header
		const auth = Buffer.from(`${config.username}:${config.password}`).toString('base64');
		
		try {
			const response = await fetch(url, {
				method: 'GET',
				headers: {
					'Authorization': `Basic ${auth}`,
					'Accept': 'application/json'
				},
				signal: AbortSignal.timeout(config.apiTimeout)
			});

			if (response.status === 401) {
				assert.fail(
					`❌ Authentication FAILED (HTTP 401)\n` +
					`   URL: ${url}\n` +
					`   Username: ${config.username}\n` +
					`   → Check that username in .sarbsettings is correct\n` +
					`   → Check that password in .sarbsettings is correct\n` +
					`   → Verify user has REST API permissions in RouterOS\n` +
					`   Note: URL is reachable, so this is an AUTH problem, not a URL problem`
				);
			}

			assert.strictEqual(
				response.status,
				200,
				`Authentication should succeed (got status: ${response.status})`
			);

			// Parse response to verify it's valid JSON
			const data = await response.json() as { name?: string };
			assert.ok(data, 'Response should contain JSON data');
			
			// System identity should have a 'name' field
			assert.ok(
				data.name !== undefined,
				'System identity should have a "name" field'
			);

			console.log(`✓ Authentication successful: ${config.username}@${config.baseUrl}`);
			console.log(`✓ RouterOS device name: ${data.name}`);
		} catch (error: unknown) {
			const err = error as Error & { code?: string };
			
			const isNetworkError = err.name === 'AbortError' || err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT';
			if (isNetworkError) {
				assert.fail(
					`❌ Connection timeout (authentication check failed)\n` +
					`   URL: ${url}\n` +
					`   → This might be a URL problem (check previous test)\n` +
					`   → Or RouterOS REST API is not responding`
				);
			}
			
			throw error;
		}
	});
});
