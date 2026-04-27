import { strict as assert } from 'node:assert';
import * as vscode from 'vscode';
import { NotebookCellData, NotebookCellKind, NotebookData } from 'vscode';
import { MarkdownSerializer, ScriptSerializer } from '../../notebook';
import { installRestMock, mockExecuteResponse } from '../helpers/rest-mock';

suite('Notebook Kernel', () => {
	suite('Notebook Controllers', () => {
		// Controllers are registered by extension activation; we verify them via
		// the public VS Code API rather than instantiating new ones.

		test('tikbook controller is registered', async () => {
			const notebook = await vscode.workspace.openNotebookDocument('tikbook', new NotebookData([]));
			assert.strictEqual(notebook.notebookType, 'tikbook');
		});

		test('routeros controller is registered', async () => {
			const notebook = await vscode.workspace.openNotebookDocument('routeros', new NotebookData([]));
			assert.strictEqual(notebook.notebookType, 'routeros');
		});

		test('markdown-routeros controller is registered', async () => {
			const notebook = await vscode.workspace.openNotebookDocument('markdown-routeros', new NotebookData([]));
			assert.strictEqual(notebook.notebookType, 'markdown-routeros');
		});

		test('all notebook types are registered', async () => {
			const types = ['tikbook', 'routeros', 'markdown-routeros'];
			for (const type of types) {
				const notebook = await vscode.workspace.openNotebookDocument(type, new NotebookData([]));
				assert.strictEqual(notebook.notebookType, type);
			}
		});
	});

	suite('Script Serializer', () => {
		const serializer = new ScriptSerializer();

		test('deserializes .tikbook/.rsc format correctly', async () => {
			const content = new TextEncoder().encode(`#!tikbook

# My RouterOS Script
#.markdown
# This is a comment
#.

/system identity set name="test"

#.

/ip address print
`);

			const notebook = await Promise.resolve(serializer.deserializeNotebook(content, new vscode.CancellationTokenSource().token));

			// Script format creates 4 cells: comment line, markdown section, 2 code sections
			assert.strictEqual(notebook.cells.length, 4, 'Should have 4 cells');

			const codeCells = notebook.cells.filter(c => c.kind === NotebookCellKind.Code);
			const markupCells = notebook.cells.filter(c => c.kind === NotebookCellKind.Markup);

			assert(codeCells.length >= 2, 'Should have at least 2 code cells');
			assert(markupCells.length >= 1, 'Should have at least 1 markup cell');

			const allText = notebook.cells.map(c => c.value).join('\n');
			assert(allText.includes('set name='));
			assert(allText.includes('print'));
		});

		test('serializes notebook to .tikbook format correctly', async () => {
			const notebook = new NotebookData([
				new NotebookCellData(NotebookCellKind.Markup, '# Setup', 'markdown'),
				new NotebookCellData(NotebookCellKind.Code, '/system reboot', 'routeros'),
			]);

			const bytes = await Promise.resolve(serializer.serializeNotebook(notebook, new vscode.CancellationTokenSource().token));
			const text = new TextDecoder().decode(bytes);

			assert(text.includes('#!tikbook'));
			assert(text.includes('#.markdown'));
			assert(text.includes('Setup'));
			assert(text.includes('/system reboot'));
		});

		test('handles empty cells correctly', async () => {
			const content = new TextEncoder().encode(`#!tikbook



/system identity print
`);

			const notebook = await Promise.resolve(serializer.deserializeNotebook(content, new vscode.CancellationTokenSource().token));
			assert(notebook.cells.length <= 1, 'Empty cells should not be included');
		});
	});

	suite('Markdown Serializer', () => {
		const serializer = new MarkdownSerializer();

		test('deserializes markdown notebook correctly', async () => {
			const content = new TextEncoder().encode(`[//]: #!tikbook

# RouterOS Configuration

\`\`\`routeros
/system identity set name="device"
\`\`\`

## Notes

\`\`\`routeros
/ip address print
\`\`\`
`);

			const notebook = await Promise.resolve(serializer.deserializeNotebook(content, new vscode.CancellationTokenSource().token));

			assert.strictEqual(notebook.cells.length, 4);
			assert.strictEqual(notebook.cells[0].kind, NotebookCellKind.Markup);
			assert.strictEqual(notebook.cells[1].kind, NotebookCellKind.Code);
			assert.strictEqual(notebook.cells[2].kind, NotebookCellKind.Markup);
			assert.strictEqual(notebook.cells[3].kind, NotebookCellKind.Code);
		});

		test('serializes notebook to markdown format correctly', async () => {
			const notebook = new NotebookData([
				new NotebookCellData(NotebookCellKind.Markup, '# Setup\n\nConfigure the device', 'markdown'),
				new NotebookCellData(NotebookCellKind.Code, '/system identity print', 'routeros'),
			]);

			const bytes = await Promise.resolve(serializer.serializeNotebook(notebook, new vscode.CancellationTokenSource().token));
			const text = new TextDecoder().decode(bytes);

			assert(text.includes('[//]: #!tikbook'));
			assert(text.includes('```routeros'));
			assert(text.includes('Setup'));
			assert(text.includes('/system identity print'));
		});

		test('handles consecutive markdown cells correctly', async () => {
			const content = new TextEncoder().encode(`[//]: #!tikbook

# Section 1

[//]: #.

This is additional markdown

\`\`\`routeros
/system print
\`\`\`
`);

			const notebook = await Promise.resolve(serializer.deserializeNotebook(content, new vscode.CancellationTokenSource().token));
			assert(notebook.cells.some(c => c.kind === NotebookCellKind.Code));
		});
	});

	suite('Notebook Creation', () => {
		test('can create new tikbook notebook', async () => {
			const notebook = await vscode.workspace.openNotebookDocument('tikbook', new NotebookData([]));
			assert.strictEqual(notebook.notebookType, 'tikbook');
			assert.strictEqual(notebook.cellCount, 0);
		});

		test('can create new routeros notebook', async () => {
			const notebook = await vscode.workspace.openNotebookDocument('routeros', new NotebookData([]));
			assert.strictEqual(notebook.notebookType, 'routeros');
		});

		test('can create new markdown-routeros notebook', async () => {
			const notebook = await vscode.workspace.openNotebookDocument('markdown-routeros', new NotebookData([]));
			assert.strictEqual(notebook.notebookType, 'markdown-routeros');
		});

		test('notebook with cells can be created', async () => {
			const cells = [
				new NotebookCellData(NotebookCellKind.Code, '/system print', 'routeros'),
				new NotebookCellData(NotebookCellKind.Markup, '# Result', 'markdown'),
			];
			const notebook = await vscode.workspace.openNotebookDocument('tikbook', new NotebookData(cells));
			assert.strictEqual(notebook.cellCount, 2);
		});
	});

	// REST mock seam tests — exercise RouterRestClient through the same code
	// path the notebook kernel uses (`client.run()` → `_execute` → axios POST
	// `/execute`), with axios-mock-adapter standing in for the network.
	//
	// Note on scope: VS Code extension tests run in a separate bundle from the
	// activated extension, so this test exercises the **test bundle's copy**
	// of the REST client, not the live singleton inside the running extension.
	// That makes this an isolated-unit verification of the request shape and
	// response handling — which catches regressions in our REST code — but
	// does NOT prove the live extension pipeline end-to-end. A future integration
	// test using `nock` (patches node http/https globally, crosses bundle
	// boundaries) is the right tool for that — see docs/testing-layout.md.
	suite('REST transport (axios-mock-adapter)', () => {
		const mock = installRestMock();

		setup(() => {
			mock.reset();
		});

		test('routes /execute through the mock and returns the wrapped ret value', async () => {
			mockExecuteResponse(mock, 'mocked-router-output');

			// Use the same singleton the kernel uses; importing dynamically
			// avoids loading the module before the mock is installed.
			const { RouterRestClient } = await import('../../routeros');
			const result = await RouterRestClient.default.run(':put "hello"', new AbortController().signal);

			assert.strictEqual(result, 'mocked-router-output');
		});

		test('preserves request body so RouterOS sees the cell text', async () => {
			let capturedBody: unknown;
			mock.onPost('/execute').reply((config) => {
				capturedBody = JSON.parse(config.data as string);
				return [200, { ret: 'ok' }];
			});

			const { RouterRestClient } = await import('../../routeros');
			await RouterRestClient.default.run('/system identity print', new AbortController().signal);

			assert.deepStrictEqual(capturedBody, {
				'as-string': true,
				script: '/system identity print',
			});
		});

		test('propagates HTTP errors as exceptions for the kernel to surface', async () => {
			mock.onPost('/execute').reply(401, { detail: 'unauthorized' });

			const { RouterRestClient } = await import('../../routeros');
			await assert.rejects(
				() => RouterRestClient.default.run(':put "x"', new AbortController().signal),
				/401|unauthorized|Request failed/i,
			);
		});
	});
});
