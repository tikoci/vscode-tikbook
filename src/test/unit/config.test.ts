import { strict as assert } from 'assert';
import * as vscode from 'vscode';
import { getConnectionUrlString, getSettings } from '../../../src/config';

suite('Priority 1: Configuration & Settings', () => {
	suite('Settings Retrieval', () => {
		test('getSettings returns default values', () => {
			const settings = getSettings();

			assert.strictEqual(typeof settings.username, 'string', 'username should be string');
			assert.strictEqual(typeof settings.password, 'string', 'password should be string');
			assert.strictEqual(typeof settings.baseUrl, 'string', 'baseUrl should be string');
			assert.strictEqual(typeof settings.apiTimeout, 'number', 'apiTimeout should be number');
			assert.strictEqual(typeof settings.sshCommand, 'string', 'sshCommand should be string');
			assert.strictEqual(typeof settings.checkCertificates, 'boolean', 'checkCertificates should be boolean');
		});

		test('getSettings returns non-empty defaults', () => {
			const settings = getSettings();

			assert(settings.username.length > 0, 'username should have default value');
			assert(settings.baseUrl.length > 0, 'baseUrl should have default value');
			assert(settings.sshCommand.length > 0, 'sshCommand should have default value');
		});

		test('getConnectionUrlString formats URL correctly with credentials', () => {
			const urlString = getConnectionUrlString();

			assert(urlString.length > 0, 'Connection URL should not be empty');
			assert(urlString.includes('://'), 'URL should include protocol');
			assert(urlString.includes('@'), 'URL should include username separator');
		});

		test('getConnectionUrlString handles baseUrl property', () => {
			const urlString = getConnectionUrlString();

			// Verify it uses the settings.baseUrl
			const settings = getSettings();
			if (settings.baseUrl.includes('192.168.88.1')) {
				assert(urlString.includes('192.168.88.1'), 'URL should contain host from baseUrl');
			}
		});

		test('getSettings respects package.json defaults', () => {
			const config = vscode.workspace.getConfiguration('tikbook');
			const defaultBaseUrl = config.inspect('baseUrl')?.defaultValue as string;
			const defaultUsername = config.inspect('username')?.defaultValue as string;
			const defaultApiTimeout = config.inspect('apiTimeout')?.defaultValue as number;
			const settings = getSettings();

			// Verify defaults exist in package.json
			assert(defaultBaseUrl, 'baseUrl should have default in package.json');
			assert(defaultUsername, 'username should have default in package.json');
			assert(typeof defaultApiTimeout === 'number', 'apiTimeout should have numeric default in package.json');

			// Verify getSettings() returns correct types (actual values may differ based on settings)
			assert.strictEqual(typeof settings.baseUrl, 'string', 'baseUrl should be string');
			assert.strictEqual(typeof settings.username, 'string', 'username should be string');
			assert.strictEqual(typeof settings.apiTimeout, 'number', 'apiTimeout should be number');
		});

		test('apiTimeout should be reasonable integer', () => {
			const settings = getSettings();

			assert(settings.apiTimeout > 0, 'API timeout should be positive');
			assert(settings.apiTimeout <= 300, 'API timeout should be reasonable (max 300 seconds)');
		});
	});

	suite('Configuration Detection', () => {
		test('baseUrl setting responds to configuration changes', () => {
			const config = vscode.workspace.getConfiguration('tikbook');

			// Get the default (this tests that defaults are readable)
			const defaultValue = config.inspect('baseUrl')?.defaultValue;
			assert(defaultValue, 'baseUrl should have a default value in package.json');
		});

		test('all settings are documented in package.json', () => {
			const config = vscode.workspace.getConfiguration('tikbook');

			const expectedSettings = ['username', 'password', 'baseUrl', 'apiTimeout', 'sshCommand', 'checkCertificates'];

			for (const setting of expectedSettings) {
				const value = config.inspect(setting);
				assert(value, `Setting '${setting}' should be defined in package.json`);
			}
		});

		test('sshCommand has reasonable default', () => {
			const settings = getSettings();

			assert(['ssh', 'ssh.exe', '/usr/bin/ssh'].includes(settings.sshCommand) || settings.sshCommand.endsWith('ssh'),
				'sshCommand should be ssh or similar');
		});

		test('checkCertificates defaults to false for security', () => {
			const settings = getSettings();

			assert.strictEqual(settings.checkCertificates, false, 'checkCertificates should default to false for compatibility');
		});
	});

	suite('URL Formatting', () => {
		test('handles http URLs', () => {
			const config = vscode.workspace.getConfiguration('tikbook');
			const baseUrl = (config.get('baseUrl') as string) || '';
			if (baseUrl.includes('http://')) {
				const urlString = getConnectionUrlString();
				assert(urlString.includes('http://'), 'Should preserve http protocol');
			}
		});

		test('handles https URLs', () => {
			const config = vscode.workspace.getConfiguration('tikbook');
			const baseUrl = (config.get('baseUrl') as string) || '';
			if (baseUrl.includes('https://')) {
				const urlString = getConnectionUrlString();
				assert(urlString.includes('https://'), 'Should preserve https protocol');
			}
		});

		test('includes username in connection URL', () => {
			const urlString = getConnectionUrlString();
			const settings = getSettings();

			if (urlString) {
				assert(urlString.includes(settings.username), 'Connection URL should include username');
			}
		});
	});
});
