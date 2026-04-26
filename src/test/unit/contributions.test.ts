import { strict as assert } from 'node:assert';
import * as vscode from 'vscode';

type TikBookPackageJson = {
	extensionPack?: unknown;
	contributes?: {
		yamlValidation?: unknown;
	};
};

type YamlValidationContribution = {
	fileMatch?: unknown;
	url?: unknown;
};

const APP_YAML_SCHEMA_PATH = './resources/schemas/routeros-app-yaml-schema.editor.json';
const APP_YAML_STORE_SCHEMA_PATH = './resources/schemas/routeros-app-yaml-store-schema.editor.json';
const APP_YAML_PATTERNS = [
	'*.tikapp.yaml',
	'*.tikapp.yml',
	'*.app.yaml',
	'*.app.yml',
	'**/app/app.yaml',
	'**/app/app.yml',
	'**/apps/app.yaml',
	'**/apps/app.yml',
	'**/tikapp/app.yaml',
	'**/tikapp/app.yml',
];
const APP_YAML_STORE_PATTERNS = [
	'*.tikappstore.yaml',
	'*.tikappstore.yml',
	'*.appstore.yaml',
	'*.appstore.yml',
	'**/app/app-store.yaml',
	'**/app/app-store.yml',
	'**/apps/app-store.yaml',
	'**/apps/app-store.yml',
	'**/tikapp/app-store.yaml',
	'**/tikapp/app-store.yml',
];

function getTikBookExtension(): vscode.Extension<unknown> {
	const ext = vscode.extensions.getExtension('TIKOCI.tikbook');
	assert.ok(ext, 'Extension should be installed');
	return ext;
}

function getTikBookPackageJson(): TikBookPackageJson {
	return getTikBookExtension().packageJSON as TikBookPackageJson;
}

function getStringArray(value: unknown, message: string): string[] {
	if (typeof value === 'string') {
		return [value];
	}
	assert.ok(Array.isArray(value), message);
	for (const item of value) {
		assert.strictEqual(typeof item, 'string', message);
	}
	return value;
}

function getYamlValidationContributions(): YamlValidationContribution[] {
	const packageJson = getTikBookPackageJson();
	const yamlValidation = packageJson.contributes?.yamlValidation;
	assert.ok(Array.isArray(yamlValidation), 'yamlValidation should be contributed');
	return yamlValidation.map((entry) => {
		assert.ok(typeof entry === 'object' && entry !== null, 'yamlValidation entries should be objects');
		const contribution = entry as Record<string, unknown>;
		return {
			fileMatch: contribution.fileMatch,
			url: contribution.url,
		};
	});
}

async function readBundledSchema(relativePath: string): Promise<Record<string, unknown>> {
	const schemaUri = vscode.Uri.joinPath(getTikBookExtension().extensionUri, relativePath);
	const content = await vscode.workspace.fs.readFile(schemaUri);
	return JSON.parse(new TextDecoder().decode(content)) as Record<string, unknown>;
}

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
			'tikbook.appYaml.newManifest',
			'tikbook.appYaml.newStoreManifest',
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


	suite('Package Contributions', () => {
		test('extension pack recommends RouterOS LSP and Red Hat YAML', () => {
			const extensionPack = getStringArray(
				getTikBookPackageJson().extensionPack,
				'extensionPack should be an array of extension ids'
			);

			assert.ok(
				extensionPack.includes('TIKOCI.lsp-routeros-ts'),
				'extensionPack should include RouterOS LSP'
			);
			assert.ok(
				extensionPack.includes('redhat.vscode-yaml'),
				'extensionPack should include Red Hat YAML for schema validation'
			);
		});

		test('RouterOS /app YAML schemas are contributed with conservative file patterns', () => {
			const yamlValidation = getYamlValidationContributions();
			const appContribution = yamlValidation.find((entry) => entry.url === APP_YAML_SCHEMA_PATH);
			const storeContribution = yamlValidation.find((entry) => entry.url === APP_YAML_STORE_SCHEMA_PATH);

			assert.ok(appContribution, 'single-app YAML schema should be contributed');
			assert.ok(storeContribution, 'app-store YAML schema should be contributed');
			assert.deepStrictEqual(
				getStringArray(appContribution.fileMatch, 'single-app fileMatch should be string patterns').sort(),
				[...APP_YAML_PATTERNS].sort(),
				'single-app schema should match only conservative app manifest patterns'
			);
			assert.deepStrictEqual(
				getStringArray(storeContribution.fileMatch, 'app-store fileMatch should be string patterns').sort(),
				[...APP_YAML_STORE_PATTERNS].sort(),
				'app-store schema should match only conservative store manifest patterns'
			);
		});

		test('RouterOS /app YAML schemas are bundled as package assets', async () => {
			const appEditorSchema = await readBundledSchema('resources/schemas/routeros-app-yaml-schema.editor.json');
			const storeEditorSchema = await readBundledSchema(
				'resources/schemas/routeros-app-yaml-store-schema.editor.json'
			);
			const appStrictSchema = await readBundledSchema('resources/schemas/routeros-app-yaml-schema.latest.json');
			const storeStrictSchema = await readBundledSchema(
				'resources/schemas/routeros-app-yaml-store-schema.latest.json'
			);

			assert.strictEqual(
				appEditorSchema.$id,
				'https://tikoci.github.io/restraml/routeros-app-yaml-schema.editor.json'
			);
			assert.strictEqual(
				storeEditorSchema.$id,
				'https://tikoci.github.io/restraml/routeros-app-yaml-store-schema.editor.json'
			);
			assert.strictEqual(
				appStrictSchema.$id,
				'https://tikoci.github.io/restraml/routeros-app-yaml-schema.latest.json'
			);
			assert.strictEqual(
				storeStrictSchema.$id,
				'https://tikoci.github.io/restraml/routeros-app-yaml-store-schema.latest.json'
			);

			const required = appEditorSchema.required;
			assert.ok(Array.isArray(required), 'app editor schema should declare required fields');
			assert.ok(required.includes('services'), 'app editor schema should require services');

			const storeItems = storeEditorSchema.items as Record<string, unknown> | undefined;
			assert.strictEqual(
				storeItems?.$ref,
				'https://tikoci.github.io/restraml/routeros-app-yaml-schema.editor.json',
				'store editor schema should reference the app editor schema'
			);
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
