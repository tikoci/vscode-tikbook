import { strict as assert } from 'assert'
import * as vscode from 'vscode'
import { SystemScriptFS } from '../../../src/scriptfs'

suite('SystemScriptFS create guards', () => {
  test('directory stats are readonly so create affordances stay disabled', async () => {
    const provider = new SystemScriptFS()

    const root = await Promise.resolve(provider.stat(vscode.Uri.from({ scheme: 'rscfile', path: '/' })))
    const schemaRoot = await Promise.resolve(provider.stat(vscode.Uri.from({ scheme: 'rscfile', path: '/system/script' })))

    assert.equal(root.permissions, vscode.FilePermission.Readonly)
    assert.equal(schemaRoot.permissions, vscode.FilePermission.Readonly)
  })

  test('writeFile rejects create requests', async () => {
    const provider = new SystemScriptFS()
    const uri = vscode.Uri.from({ scheme: 'rscfile', path: '/system/script/new-script/source' })

    await assert.rejects(
      () => provider.writeFile(uri, new TextEncoder().encode(':put "hi"'), { create: true, overwrite: false }),
      (error: unknown) => error instanceof vscode.FileSystemError,
    )
  })
})
