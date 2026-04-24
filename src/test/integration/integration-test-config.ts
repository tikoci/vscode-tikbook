/**
 * Integration Test Configuration Helper
 * 
 * Loads configuration from .sarbsettings JSONC file for RouterOS connection testing.
 * Create a .sarbsettings file from .sarbsettings.example to test against your RouterOS device.
 * 
 * Note: This file uses Node APIs (path, process, fs) which are available in test environment.
 * 
 * Long-term solution: Docker-based testing (see docs/integration-testing-strategy.md)
 * - Substantial RouterOS configuration changes needed for testing
 * - Need to reset RouterOS state between tests
 * - Especially important for notebook tests (can do anything based on credentials)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * RouterOS connection configuration for integration tests
 */
export interface RouterOSTestConfig {
	/** Base URL of RouterOS device (default: http://192.168.88.1) */
	baseUrl: string;
	/** Username for REST API authentication (default: admin) */
	username: string;
	/** Password for REST API authentication (default: empty string) */
	password: string;
	/** Timeout for RouterOS requests in milliseconds (default: 5000) */
	apiTimeout: number;
	/** Test framework timeout in milliseconds (default: 30000) */
	testTimeout: number;
	/** Skip tests requiring live external resources like RouterOS (default: false) */
	skipLiveTests: boolean;
}

/**
 * Strip comments from JSONC content without touching string literals.
 */
function stripJsonComments(jsonc: string): string {
	let result = '';
	let inString = false;
	let isEscaped = false;
	let i = 0;

	while (i < jsonc.length) {
		const char = jsonc[i];
		const next = jsonc[i + 1];

		if (inString) {
			result += char;
			if (isEscaped) {
				isEscaped = false;
			} else if (char === '\\') {
				isEscaped = true;
			} else if (char === '"') {
				inString = false;
			}
			i += 1;
			continue;
		}

		if (char === '"') {
			inString = true;
			result += char;
			i += 1;
			continue;
		}

		// Line comment
		if (char === '/' && next === '/') {
			while (i < jsonc.length && jsonc[i] !== '\n') {
				i += 1;
			}
			continue;
		}

		// Block comment
		if (char === '/' && next === '*') {
			i += 2;
			while (i < jsonc.length && !(jsonc[i] === '*' && jsonc[i + 1] === '/')) {
				i += 1;
			}
			i += 2;
			continue;
		}

		result += char;
		i += 1;
	}

	return result;
}

/**
 * Load and parse .sarbsettings JSONC file
 */
function loadSarbSettings(): Partial<RouterOSTestConfig> | null {
	const configPath = path.resolve(__dirname, '../../../.sarbsettings');
	
	try {
		if (!fs.existsSync(configPath)) {
			return null;
		}
		
		const content = fs.readFileSync(configPath, 'utf-8');
		const stripped = stripJsonComments(content);
		const config = JSON.parse(stripped);
		
		return {
			baseUrl: config.tikbook?.baseUrl,
			username: config.tikbook?.username,
			password: config.tikbook?.password,
			apiTimeout: config.tikbook?.apiTimeout,
			testTimeout: config['vscode-test']?.timeout,
			skipLiveTests: config['vscode-test']?.skipLiveTests
		};
	} catch {
		// Fail silently - let tests skip or use defaults
		return null;
	}
}

/**
 * Get RouterOS test configuration from .sarbsettings
 * Falls back to safe defaults if .sarbsettings is not present
 * 
 * Default behavior: run live tests and fail if resources are unavailable.
 * Set skipLiveTests to true in .sarbsettings to skip external resource tests.
 * Use connection validation tests to identify URL vs authentication issues.
 */
export function getRouterOSTestConfig(): RouterOSTestConfig {
	const settings = loadSarbSettings();
	
	return {
		baseUrl: settings?.baseUrl ?? 'http://192.168.88.1',
		username: settings?.username ?? 'admin',
		password: settings?.password ?? '',
		apiTimeout: settings?.apiTimeout ?? 5000,
		testTimeout: settings?.testTimeout ?? 30000,
		skipLiveTests: settings?.skipLiveTests ?? false
	};
}

/**
 * Check if RouterOS connection configuration is available
 * Returns false if using defaults (no .sarbsettings configured)
 */
export function hasRouterOSTestConfig(): boolean {
	const settings = loadSarbSettings();
	// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
	return !!(settings?.baseUrl || settings?.password);
}
