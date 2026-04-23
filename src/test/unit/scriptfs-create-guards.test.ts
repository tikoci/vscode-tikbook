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

  test('single-file schema stat does not pretend unknown children already exist', async () => {
    const provider = new SystemScriptFS()
    ;(provider as unknown as { setCachedItemNames: (schemaPath: string, names: Set<string>) => void })
      .setCachedItemNames('/ip/dhcp-client', new Set(['ether1']))

    const existing = await Promise.resolve(provider.stat(vscode.Uri.from({ scheme: 'rscfile', path: '/ip/dhcp-client/ether1' })))

    assert.equal(existing.type, vscode.FileType.File)
    assert.throws(
      () => provider.stat(vscode.Uri.from({ scheme: 'rscfile', path: '/ip/dhcp-client/not-a-real-item' })),
      (error: unknown) => error instanceof vscode.FileSystemError,
    )
  })
})
