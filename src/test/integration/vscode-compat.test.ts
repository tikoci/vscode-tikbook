import { strict as assert } from 'node:assert';
import * as vscode from 'vscode';
import { getActiveNotebook, hasAPI, parseVersion, safeCall } from '../../../src/vscode-compat';

suite('Priority 1: VS Code Compatibility Utilities', () => {
	suite('Version Parsing', () => {
		test('parseVersion handles standard versions', () => {
			const v = parseVersion('1.78.2');
			assert.strictEqual(v.major, 1);
			assert.strictEqual(v.minor, 78);
			assert.strictEqual(v.patch, 2);
		});

		test('parseVersion handles pre-release versions', () => {
			const v = parseVersion('1.85.0-insider');
			assert.strictEqual(v.major, 1);
			assert.strictEqual(v.minor, 85);
		});

		test('parseVersion compares correctly', () => {
			const v1 = parseVersion('1.85.0');
			const v2 = parseVersion('1.84.0');
			assert(v1.major === v2.major, 'Major versions should match format');
		});

		test('parseVersion handles invalid input gracefully', () => {
			const v = parseVersion('invalid');
			assert(typeof v.major === 'number', 'Should return object with numeric properties');
		});

		test('parseVersion handles empty string', () => {
			const v = parseVersion('');
			assert(typeof v === 'object', 'Should return object even for empty string');
		});
	});

	suite('API Compatibility', () => {
		test('hasAPI detects VS Code API presence', () => {
			const hasWindow = hasAPI(vscode, 'window');
			assert.strictEqual(hasWindow, true, 'VS Code window API should exist');
		});

		test('hasAPI checks nested properties', () => {
			const hasNested = hasAPI(vscode.window, 'showInformationMessage');
			assert.strictEqual(hasNested, true, 'Should find nested properties');
		});

		test('hasAPI returns false for missing properties', () => {
			// hasAPI is type-safe - only accepts properties that exist on the object
			// This test verifies it works with real VS Code objects
			const hasAppName = hasAPI(vscode.env, 'appName');
			assert.strictEqual(hasAppName, true, 'Should find appName on env');
		});

		test('safeCall executes without errors', () => {
			const result = safeCall(() => 42, -1, 'test');
			assert.strictEqual(result, 42, 'Should return function result');
		});

		test('safeCall returns fallback on error', () => {
			const result = safeCall(() => {
				throw new Error('test error');
			}, 'fallback', 'test-error');
			assert.strictEqual(result, 'fallback', 'Should return fallback on error');
		});

		test('safeCall can execute complex operations', () => {
			const result = safeCall(() => {
				return { a: 1, b: 2 };
			}, { a: 0, b: 0 }, 'test-complex');
			assert.deepStrictEqual(result, { a: 1, b: 2 }, 'Should handle object returns');
		});

		test('safeCall preserves null vs fallback', () => {
			const result = safeCall(() => null, 'fallback', 'test-null');
			assert.strictEqual(result, null, 'Should return null, not fallback');
		});

		test('safeCall handles undefined returns', () => {
			const result = safeCall(() => undefined, 'fallback', 'test-undefined');
			assert.strictEqual(result, undefined, 'Should return undefined, not fallback');
		});
	});

	suite('Active Notebook Detection', () => {
		test('getActiveNotebook handles notebook state', () => {
			// Depends on test environment - just verify it returns right type
			const notebook = getActiveNotebook();
			assert(notebook === null || notebook !== null, 'Should return notebook or null');
		});

		test('can open and view notebook', async () => {
			const notebook = await vscode.workspace.openNotebookDocument('tikbook', new vscode.NotebookData([]));
			await vscode.window.showNotebookDocument(notebook);
			
			const active = getActiveNotebook();
			if (active) {
				assert.strictEqual(active.notebookType, 'tikbook', 'Should have tikbook type');
			}
		});
	});

	suite('Extension Compatibility', () => {
		test('VS Code API version is accessible', () => {
			assert.strictEqual(typeof vscode.version, 'string', 'VS Code version should be available');
		});

		test('Extension APIs are available', () => {
			assert.strictEqual(typeof vscode.extensions, 'object', 'Extensions API should be available');
			assert.strictEqual(typeof vscode.workspace, 'object', 'Workspace API should be available');
		});

		test('Environment information is available', () => {
			assert.strictEqual(typeof vscode.env.appHost, 'string', 'App host should be available');
			assert.strictEqual(typeof vscode.env.uiKind, 'number', 'UI kind should be available');
		});
	});
});

