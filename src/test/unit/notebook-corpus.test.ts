import { strict as assert } from 'node:assert'
import { readdir, readFile } from 'node:fs/promises'
import * as path from 'node:path'
import * as vscode from 'vscode'
import { NotebookCellKind } from 'vscode'
import { MarkdownSerializer } from '../../notebook'

function createToken(): vscode.CancellationToken {
  return new vscode.CancellationTokenSource().token
}

const repoRoot = path.resolve(__dirname, '../../..')
const corpusDir = path.join(repoRoot, 'test-corpus', 'discourse-bookmarks')
const manifestPath = path.join(corpusDir, 'manifest.json')

suite('Discourse TikBook corpus', () => {
  test('manifest tracks the checked-in discourse notebooks', async () => {
    const files = (await readdir(corpusDir)).filter(file => file.endsWith('.rsc.md')).sort()
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as {
      entries: Array<{ file: string }>
      skippedBookmarks: number[]
    }

    assert.ok(files.length >= 10, 'expected the discourse corpus to include a meaningful notebook set')
    assert.deepStrictEqual(
      manifest.entries.map(entry => entry.file).sort(),
      files,
      'manifest.json should enumerate the checked-in discourse notebooks',
    )
    assert.ok(
      manifest.skippedBookmarks.includes(1184835),
      'manifest should record the unresolved bookmarked post that was intentionally skipped',
    )
  })

  test('all discourse notebooks deserialize into runnable TikBook cells', async () => {
    const files = (await readdir(corpusDir)).filter(file => file.endsWith('.rsc.md')).sort()
    const serializer = new MarkdownSerializer()
    let totalCodeCells = 0

    for (const file of files) {
      const input = await readFile(path.join(corpusDir, file), 'utf8')
      const notebook = await Promise.resolve(
        serializer.deserializeNotebook(new TextEncoder().encode(input), createToken()),
      )

      assert.ok(notebook.cells.length > 0, `${file} should produce at least one notebook cell`)
      assert.strictEqual(
        notebook.cells[0].kind,
        NotebookCellKind.Markup,
        `${file} should start with markdown metadata/content`,
      )

      const codeCells = notebook.cells.filter(cell => cell.kind === NotebookCellKind.Code)
      totalCodeCells += codeCells.length
      assert.ok(codeCells.length > 0, `${file} should expose at least one RouterOS code cell`)
    }

    assert.ok(
      totalCodeCells >= files.length,
      'expected the discourse corpus to contribute at least one code cell per notebook on average',
    )
  })
})
