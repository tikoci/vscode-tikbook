import { strict as assert } from 'assert'
import * as vscode from 'vscode'
import { NotebookCellKind } from 'vscode'
import { MarkdownSerializer, ScriptSerializer } from '../../notebook'

function createToken(): vscode.CancellationToken {
  return new vscode.CancellationTokenSource().token
}

async function deserializeScript(input: string): Promise<vscode.NotebookData> {
  return Promise.resolve(new ScriptSerializer().deserializeNotebook(new TextEncoder().encode(input), createToken()))
}

async function deserializeMarkdown(input: string): Promise<vscode.NotebookData> {
  return Promise.resolve(new MarkdownSerializer().deserializeNotebook(new TextEncoder().encode(input), createToken()))
}

async function serializeScript(notebook: vscode.NotebookData): Promise<Uint8Array> {
  return Promise.resolve(new ScriptSerializer().serializeNotebook(notebook, createToken()))
}

async function serializeMarkdown(notebook: vscode.NotebookData): Promise<Uint8Array> {
  return Promise.resolve(new MarkdownSerializer().serializeNotebook(notebook, createToken()))
}

suite('TikBook Notebook Parsing', () => {
  test('parses a simple .md.rsc (RouterOS TikBook) notebook', async () => {
    const input = `#.markdown\n#  # Title\n#.\n\n/ip/address/print\n#.\n`
    const nb = await deserializeScript(input)
    assert.strictEqual(nb.cells.length, 2)
    assert.strictEqual(nb.cells[0].kind, NotebookCellKind.Markup)
    assert.strictEqual(nb.cells[1].kind, NotebookCellKind.Code)
    assert.ok(nb.cells[0].value.includes('# Title'))
    assert.ok(nb.cells[1].value.includes('/ip/address/print'))
  })

  test('parses a .rsc.md (Markdown RouterOS) notebook', async () => {
    const input = `# Title\n\n\u0060\u0060\u0060routeros\n/ip/address/print\n\u0060\u0060\u0060\n`
    const nb = await deserializeMarkdown(input)
    assert.strictEqual(nb.cells.length, 2)
    assert.strictEqual(nb.cells[0].kind, NotebookCellKind.Markup)
    assert.strictEqual(nb.cells[1].kind, NotebookCellKind.Code)
    assert.ok(nb.cells[1].value.includes('/ip/address/print'))
  })

  test('handles explicit cell breaks in Markdown RouterOS', async () => {
    const input = `# Title\n\n[//]: #.\n\n## Section\n\n\u0060\u0060\u0060routeros\n:global foo "bar"\n\u0060\u0060\u0060\n`
    const nb = await deserializeMarkdown(input)
    assert.strictEqual(nb.cells.length, 3)
    assert.strictEqual(nb.cells[1].kind, NotebookCellKind.Markup)
    assert.strictEqual(nb.cells[2].kind, NotebookCellKind.Code)
  })

  test('serializes and parses round-trip for .md.rsc', async () => {
    const input = `#.markdown\n#  # Title\n#.\n\n/ip/address/print\n#.\n`
    const nb = await deserializeScript(input)
    const out = await serializeScript(nb)
    const nb2 = await Promise.resolve(new ScriptSerializer().deserializeNotebook(out, createToken()))
    assert.deepStrictEqual(nb2.cells, nb.cells)
  })

  test('serializes and parses round-trip for .rsc.md', async () => {
    const input = `# Title\n\n\u0060\u0060\u0060routeros\n/ip/address/print\n\u0060\u0060\u0060\n`
    const nb = await deserializeMarkdown(input)
    const out = await serializeMarkdown(nb)
    const nb2 = await Promise.resolve(new MarkdownSerializer().deserializeNotebook(out, createToken()))
    assert.deepStrictEqual(
      nb2.cells.map(cell => cell.kind),
      nb.cells.map(cell => cell.kind),
    )
    assert.strictEqual(nb2.cells.length, nb.cells.length)
    assert.ok(nb2.cells[0].value.includes('# Title'))
    assert.ok(nb2.cells[1].value.includes('/ip/address/print'))
  })

  test('handles edge cases: empty cells, multiple markdown/code in a row', async () => {
    const input = `#.markdown\n#  # Title\n#.\n#.markdown\n#  \n#.\n/ip/address/print\n#.\n/ip/route/print\n#.\n`
    const nb = await deserializeScript(input)
    assert.strictEqual(nb.cells.length, 3)
    assert.strictEqual(nb.cells[0].kind, NotebookCellKind.Markup)
    assert.strictEqual(nb.cells[1].kind, NotebookCellKind.Code)
    assert.strictEqual(nb.cells[2].kind, NotebookCellKind.Code)
  })

  test('handles edge cases: markdown with code fence inside', async () => {
    const input = `# Title\n\nHere is a code example:\n\n\u0060\u0060\u0060routeros\n/ip/address/print\n\u0060\u0060\u0060\n\nAnd more text.`
    const nb = await deserializeMarkdown(input)
    assert.strictEqual(nb.cells.length, 3)
    assert.strictEqual(nb.cells[0].kind, NotebookCellKind.Markup)
    assert.strictEqual(nb.cells[1].kind, NotebookCellKind.Code)
    assert.strictEqual(nb.cells[2].kind, NotebookCellKind.Markup)
  })

  test('parses shebang and notebook metadata in Markdown format', async () => {
    const input = '[//]: #!tikbook\n\n# Title\n\n\u0060\u0060\u0060routeros\n/ip/address/print\n\u0060\u0060\u0060\n'
    const nb = await deserializeMarkdown(input)
    assert.ok(Object.prototype.hasOwnProperty.call(nb.metadata, 'shebang'))
    assert.strictEqual(nb.cells[0].kind, NotebookCellKind.Markup)
    assert.strictEqual(nb.cells[1].kind, NotebookCellKind.Code)
  })

  test('handles excessive whitespace and empty lines', async () => {
    const input = `\n\n#.markdown\n#  # Title\n#.\n\n\n/ip/address/print\n#.\n\n`
    const nb = await deserializeScript(input)
    assert.strictEqual(nb.cells.length, 2)
    assert.ok(nb.cells[0].value.includes('# Title'))
    assert.ok(nb.cells[1].value.includes('/ip/address/print'))
  })

  test('handles malformed input gracefully', async () => {
    const input = `#.markdown\n#  # Title\n/ip/address/print\n#.\n`
    const nb = await deserializeScript(input)
    assert.ok(nb.cells.length > 0)
  })

  test('round-trips with cell metadata', async () => {
    const input = `# Title\n\n\u0060\u0060\u0060routeros\n/ip/address/print\n\u0060\u0060\u0060\n`
    const nb = await deserializeMarkdown(input)
    nb.cells[1].metadata = { foo: 'bar' }
    const out = await serializeMarkdown(nb)
    const nb2 = await Promise.resolve(new MarkdownSerializer().deserializeNotebook(out, createToken()))
    assert.ok(nb2.cells[1].value.includes('/ip/address/print'))
  })
})
