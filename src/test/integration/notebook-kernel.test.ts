import { strict as assert } from 'assert';
import * as vscode from 'vscode';
import { NotebookCellData, NotebookCellKind, NotebookData } from 'vscode';
import { MarkdownSerializer, ScriptSerializer } from '../../../src/notebook';

suite('Priority 1: Notebook Kernel', () => {
	suite('Notebook Controllers', () => {
		// NOTE: Controllers are already registered by extension activation
		// We test that they exist via VS Code API, not by instantiating new ones
		// (per SARB: don't mock VS Code APIs, test real behavior)
		
		test('tikbook controller is registered', async () => {
			// Controllers register with notebook types; verify we can create notebooks
			const notebook = await vscode.workspace.openNotebookDocument('tikbook', new NotebookData([]));
			assert.strictEqual(notebook.notebookType, 'tikbook', 'tikbook notebook type should be available');
		});

		test('routeros controller is registered', async () => {
			const notebook = await vscode.workspace.openNotebookDocument('routeros', new NotebookData([]));
			assert.strictEqual(notebook.notebookType, 'routeros', 'routeros notebook type should be available');
		});

		test('markdown-routeros controller is registered', async () => {
			const notebook = await vscode.workspace.openNotebookDocument('markdown-routeros', new NotebookData([]));
			assert.strictEqual(notebook.notebookType, 'markdown-routeros', 'markdown-routeros notebook type should be available');
		});

		test('all notebook types are registered', async () => {
			// Verify all 3 notebook types work
			const types = ['tikbook', 'routeros', 'markdown-routeros'];
			for (const type of types) {
				const notebook = await vscode.workspace.openNotebookDocument(type, new NotebookData([]));
				assert.strictEqual(notebook.notebookType, type, `${type} should be registered`);
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
			
			// Verify we have both code and markup cells
			const codeCells = notebook.cells.filter(c => c.kind === NotebookCellKind.Code);
			const markupCells = notebook.cells.filter(c => c.kind === NotebookCellKind.Markup);
			
			assert(codeCells.length >= 2, 'Should have at least 2 code cells');
			assert(markupCells.length >= 1, 'Should have at least 1 markup cell');
			
			// Verify code cells contain expected commands
			const allText = notebook.cells.map(c => c.value).join('\n');
			assert(allText.includes('set name='), 'Should contain set command');
			assert(allText.includes('print'), 'Should contain print command');
		});

		test('serializes notebook to .tikbook format correctly', async () => {
			const notebook = new NotebookData([
				new NotebookCellData(NotebookCellKind.Markup, '# Setup', 'markdown'),
				new NotebookCellData(NotebookCellKind.Code, '/system reboot', 'routeros'),
			]);

			const bytes = await Promise.resolve(serializer.serializeNotebook(notebook, new vscode.CancellationTokenSource().token));
			const text = new TextDecoder().decode(bytes);

			assert(text.includes('#!tikbook'), 'Should include tikbook header');
			assert(text.includes('#.markdown'), 'Should have markdown section marker');
			assert(text.includes('Setup'), 'Should contain markup content');
			assert(text.includes('/system reboot'), 'Should contain code content');
		});

		test('handles empty cells correctly', async () => {
			const content = new TextEncoder().encode(`#!tikbook

   

/system identity print
`);

			const notebook = await Promise.resolve(serializer.deserializeNotebook(content, new vscode.CancellationTokenSource().token));

			// Empty cells should be filtered out during deserialization
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

			assert.strictEqual(notebook.cells.length, 4, 'Should have 4 cells');
			
			// Check alternating markup and code cells
			assert.strictEqual(notebook.cells[0].kind, NotebookCellKind.Markup, 'First cell should be markup');
			assert.strictEqual(notebook.cells[1].kind, NotebookCellKind.Code, 'Second cell should be code');
			assert.strictEqual(notebook.cells[2].kind, NotebookCellKind.Markup, 'Third cell should be markup');
			assert.strictEqual(notebook.cells[3].kind, NotebookCellKind.Code, 'Fourth cell should be code');
		});

		test('serializes notebook to markdown format correctly', async () => {
			const notebook = new NotebookData([
				new NotebookCellData(NotebookCellKind.Markup, '# Setup\n\nConfigure the device', 'markdown'),
				new NotebookCellData(NotebookCellKind.Code, '/system identity print', 'routeros'),
			]);

			const bytes = await Promise.resolve(serializer.serializeNotebook(notebook, new vscode.CancellationTokenSource().token));
			const text = new TextDecoder().decode(bytes);

			assert(text.includes('[//]: #!tikbook'), 'Should include tikbook header');
			assert(text.includes('```routeros'), 'Should have code fence');
			assert(text.includes('Setup'), 'Should contain markup content');
			assert(text.includes('/system identity print'), 'Should contain code content');
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

			// Should properly handle consecutive markup cells separated by [//]: #.
			assert(notebook.cells.some(c => c.kind === NotebookCellKind.Code), 'Should have at least one code cell');
		});
	});

	suite('Notebook Creation', () => {
		test('can create new tikbook notebook', async () => {
			const notebook = await vscode.workspace.openNotebookDocument('tikbook', new NotebookData([]));
			assert.strictEqual(notebook.notebookType, 'tikbook', 'Notebook type should be tikbook');
			assert.strictEqual(notebook.cellCount, 0, 'New notebook should be empty');
		});

		test('can create new routeros notebook', async () => {
			const notebook = await vscode.workspace.openNotebookDocument('routeros', new NotebookData([]));
			assert.strictEqual(notebook.notebookType, 'routeros', 'Notebook type should be routeros');
		});

		test('can create new markdown-routeros notebook', async () => {
			const notebook = await vscode.workspace.openNotebookDocument('markdown-routeros', new NotebookData([]));
			assert.strictEqual(notebook.notebookType, 'markdown-routeros', 'Notebook type should be markdown-routeros');
		});

		test('notebook with cells can be created', async () => {
			const cells = [
				new NotebookCellData(NotebookCellKind.Code, '/system print', 'routeros'),
				new NotebookCellData(NotebookCellKind.Markup, '# Result', 'markdown'),
			];
			const notebook = await vscode.workspace.openNotebookDocument('tikbook', new NotebookData(cells));

			assert.strictEqual(notebook.cellCount, 2, 'Notebook should have 2 cells');
		});
	});
});
