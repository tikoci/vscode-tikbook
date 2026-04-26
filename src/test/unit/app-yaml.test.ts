import { strict as assert } from 'node:assert';
import * as vscode from 'vscode';
import { classifyAppYamlPath, getAppYamlDiagnostics, hasMixedPortProtocolStyles } from '../../app-yaml';

suite('RouterOS /app YAML support', () => {
	suite('file matching', () => {
		test('matches single-app filename conventions', () => {
			const paths = [
				'/workspace/my-app.tikapp.yaml',
				'/workspace/my-app.tikapp.yml',
				'/workspace/my-app.app.yaml',
				'/workspace/my-app.app.yml',
				'/workspace/apps/app.yaml',
				'/workspace/app/app.yml',
				'/workspace/tikapp/app.yaml',
			];

			for (const path of paths) {
				assert.strictEqual(classifyAppYamlPath(path), 'app', `${path} should be a single /app YAML file`);
			}
		});

		test('matches app-store filename conventions', () => {
			const paths = [
				'/workspace/my-store.tikappstore.yaml',
				'/workspace/my-store.tikappstore.yml',
				'/workspace/my-store.appstore.yaml',
				'/workspace/my-store.appstore.yml',
				'/workspace/apps/app-store.yaml',
				'/workspace/app/app-store.yml',
				'/workspace/tikapp/app-store.yaml',
			];

			for (const path of paths) {
				assert.strictEqual(classifyAppYamlPath(path), 'store', `${path} should be an app-store YAML file`);
			}
		});

		test('does not match generic app.yaml outside app-shaped directories', () => {
			assert.strictEqual(classifyAppYamlPath('/workspace/app.yaml'), undefined);
			assert.strictEqual(classifyAppYamlPath('/workspace/service/config.yaml'), undefined);
		});
	});

	suite('diagnostics', () => {
		test('warns when a single-app schema header is used with store-shaped YAML', async () => {
			const document = await vscode.workspace.openTextDocument({
				language: 'yaml',
				content: [
					'# yaml-language-server: $schema=https://tikoci.github.io/restraml/routeros-app-yaml-schema.editor.json',
					'- name: app-one',
					'  services:',
					'    web:',
					'      image: nginx:alpine',
				].join('\n'),
			});

			const diagnostics = getAppYamlDiagnostics(document);

			assert.ok(
				diagnostics.some(diagnostic => diagnostic.message.includes('single /app YAML expects one object')),
				'should warn about array root in single-app mode'
			);
		});

		test('warns when a store schema header is used with single-app YAML', async () => {
			const document = await vscode.workspace.openTextDocument({
				language: 'yaml',
				content: [
					'# yaml-language-server: $schema=https://tikoci.github.io/restraml/routeros-app-yaml-store-schema.editor.json',
					'name: app-one',
					'services:',
					'  web:',
					'    image: nginx:alpine',
				].join('\n'),
			});

			const diagnostics = getAppYamlDiagnostics(document);

			assert.ok(
				diagnostics.some(diagnostic => diagnostic.message.includes('app-store YAML expects a top-level array')),
				'should warn about object root in app-store mode'
			);
		});

		test('surfaces RouterOS-specific guidance for unsupported compose habits and device mappings', async () => {
			const document = await vscode.workspace.openTextDocument({
				language: 'yaml',
				content: [
					'# yaml-language-server: $schema=https://tikoci.github.io/restraml/routeros-app-yaml-schema.editor.json',
					'version: "3.9"',
					'services:',
					'  web:',
					'    image: nginx:alpine',
					'    devices:',
					'      - /dev/ttyACM0:/dev/ttyACM0',
				].join('\n'),
			});

			const diagnostics = getAppYamlDiagnostics(document);

			assert.ok(
				diagnostics.some(diagnostic => diagnostic.message.includes('does not use a top-level version key')),
				'should warn about docker-compose version key'
			);
			assert.ok(
				diagnostics.some(diagnostic => diagnostic.message.includes('container device-mode')),
				'should add device-mode guidance for device mappings'
			);
		});

		test('warns when a port string mixes old and new protocol styles', async () => {
			const document = await vscode.workspace.openTextDocument({
				language: 'yaml',
				content: [
					'# yaml-language-server: $schema=https://tikoci.github.io/restraml/routeros-app-yaml-schema.editor.json',
					'services:',
					'  web:',
					'    image: nginx:alpine',
					'    ports:',
					'      - "8080:80/tcp:web:tcp"',
				].join('\n'),
			});

			const diagnostics = getAppYamlDiagnostics(document);

			assert.ok(
				diagnostics.some(diagnostic => diagnostic.message.includes('Do not mix OCI-style')),
				'should warn about mixed protocol styles'
			);
		});
	});

	suite('port style checks', () => {
		test('detects mixed old/new port protocol styles only within the same mapping', () => {
			assert.strictEqual(hasMixedPortProtocolStyles('8080:80/tcp:web:tcp'), true);
			assert.strictEqual(hasMixedPortProtocolStyles('8080:80/tcp:web'), false);
			assert.strictEqual(hasMixedPortProtocolStyles('8080:80:web:tcp'), false);
		});
	});
});
