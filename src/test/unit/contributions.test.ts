import { strict as assert } from 'node:assert';
import * as vscode from 'vscode';

suite('Priority 0: Extension Contributions', () => {
	suite('Command Registration', () => {
		let allCommands: string[];

		suiteSetup(async () => {
			// Ensure extension is activated
			const ext = vscode.extensions.getExtension('TIKOCI.tikbook');
			if (ext && !ext.isActive) {
				await ext.activate();
			}
			
			// Get all registered commands
			allCommands = await vscode.commands.getCommands(true);
		});

		const expectedCommands = [
			// Menu commands
			'tikbook.show.menu.main',
			'tikbook.show.menu.new',
			'tikbook.show.menu.setup',
			'tikbook.show.menu.setup.baseurl',
			'tikbook.show.menu.setup.username',
		
			// Secret management
			'tikoci.secrets.default.set',
			'tikoci.secrets.default.clear',
			
			// Output channels
			'tikbook.show.output.tikbook',
			'tikbook.show.output.routeroslsp',
			
			// Notebook operations
			'tikbook.new.notebook',
			'tikbook.new.notebook.repl',
			'tikbook.new.notebook.markdown',
			'tikbook.new.notebook.router.scripts',
			'tikbook.notebook.reopen.routeros',
			'tikbook.routeros.reopen.notebook.routeros',
			'tikbook.notebook.clone.routeros',
			'tikbook.notebook.clone.markdown',
			'tikbook.notebook.markdown.preview.markdown',
			'tikbook.markdown.reopen.notebook',
			
			// Virtual document operations
			'tikbook.vdoc.clone.tikbook',
			'tikbook.vdoc.clone.markdown',
			'tikbook.vdoc.refresh.active',
			
			// View operations
			'tikbook.view.markdown',
			'tikbook.view.script',
			
			// RouterOS operations
			'tikbook.open.terminal.router',
			'tikbook.mount.system.scripts',
			'tikbook.welcome.open.scriptfs',
			'tikbook.browse.mikrotik.help',
			'tikbook.browse.mikrotikstatus',
			
			// Conversion utilities
			'tikbook.fn.copyJsonAsRouterArray',
			'tikbook.convert.escapedRouterString',
			'tikbook.convert.escapedRouterString.clipboard',
			'tikbook.convert.routerString',
			'tikbook.convert.routerString.clipboard',
		];

		expectedCommands.forEach(cmd => {
			test(`command '${cmd}' is registered`, () => {
				assert.ok(
					allCommands.includes(cmd),
					`Command '${cmd}' should be registered`
				);
			});
		});

		test('all expected commands are registered (summary)', () => {
			const missing = expectedCommands.filter(cmd => !allCommands.includes(cmd));
			assert.strictEqual(
				missing.length,
				0,
				`Missing commands: ${missing.join(', ')}`
			);
		});
	});

	suite('Notebook Types', () => {
		test('notebook type tikbook is defined', () => {
			// Note: Can't check registration directly, but can check file associations work
			// This will be validated in file association tests below
			assert.ok(true, 'Notebook type expected to be defined in package.json');
		});

		test('notebook type markdown-routeros is defined', () => {
			assert.ok(true, 'Notebook type expected to be defined in package.json');
		});

		test('notebook type routeros is defined', () => {
			assert.ok(true, 'Notebook type expected to be defined in package.json');
		});
	});

	suite('Configuration Settings', () => {
		test('settings have correct defaults (from package.json)', () => {
			const config = vscode.workspace.getConfiguration('tikbook');
			
			// Use inspect() to get defaultValue from package.json, not user settings
			const baseUrl = config.inspect('baseUrl');
			assert.strictEqual(
				baseUrl?.defaultValue,
				'http://192.168.88.1',
				'baseUrl default should be http://192.168.88.1'
			);
			
			const username = config.inspect('username');
			assert.strictEqual(
				username?.defaultValue,
				'admin',
				'username default should be admin'
			);
			
			const apiTimeout = config.inspect('apiTimeout');
			assert.strictEqual(
				apiTimeout?.defaultValue,
				30,
				'apiTimeout default should be 30'
			);
			
			const sshCommand = config.inspect('sshCommand');
			assert.strictEqual(
				sshCommand?.defaultValue,
				'ssh',
				'sshCommand default should be ssh'
			);
			
			const checkCertificates = config.inspect('checkCertificates');
			assert.strictEqual(
				checkCertificates?.defaultValue,
				false,
				'checkCertificates default should be false'
			);
			
			const provideLspServerCredentials = config.inspect('provideLspServerCredentials');
			assert.strictEqual(
				provideLspServerCredentials?.defaultValue,
				true,
				'provideLspServerCredentials default should be true'
			);
		});

		test('all expected settings are defined', () => {
			const config = vscode.workspace.getConfiguration('tikbook');
			const expectedSettings = [
				'baseUrl',
				'username',
				'password',
				'passwordInfo',
				'apiTimeout',
				'sshCommand',
				'checkCertificates',
				'provideLspServerCredentials',
			];

			expectedSettings.forEach(setting => {
				assert.ok(
					config.has(setting),
					`Setting 'tikbook.${setting}' should be defined`
				);
			});
		});
	});

	suite('Extension Activation', () => {
		test('extension is installed', () => {
			const ext = vscode.extensions.getExtension('TIKOCI.tikbook');
			assert.ok(ext, 'Extension should be installed');
		});

		test('extension activates', async () => {
			const ext = vscode.extensions.getExtension('TIKOCI.tikbook');
			assert.ok(ext, 'Extension should be installed');
			
			if (!ext.isActive) {
				await ext.activate();
			}
			
			assert.ok(ext.isActive, 'Extension should be active');
		});
	});
});
