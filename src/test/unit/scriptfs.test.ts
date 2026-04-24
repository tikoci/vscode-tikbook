import { strict as assert } from 'node:assert'
import * as vscode from 'vscode'
import { findSchemaForParts, getSchemaChildPaths, SystemScriptFS } from '../../../src/scriptfs'

suite('SystemScriptFS', () => {
  test('findSchemaForParts returns schema and relative parts for script item file', () => {
    const match = findSchemaForParts(['system', 'script', 'backup', 'source'])

    assert.ok(match)
    assert.equal(match?.schema.path, '/system/script')
    assert.deepEqual(match?.relParts, ['backup', 'source'])
  })

  test('getSchemaChildPaths returns top-level schema directories', () => {
    const children = getSchemaChildPaths([])

    assert.equal(children.has('system'), true)
    assert.equal(children.has('tool'), true)
    assert.equal(children.has('interface'), true)
  })

  test('stat treats schema roots and cached script items as directories/files', async () => {
    const provider = new SystemScriptFS()
    ;(provider as unknown as { setCachedItemNames: (schemaPath: string, names: Set<string>) => void })
      .setCachedItemNames('/system/script', new Set(['backup']))

    const schemaRoot = await Promise.resolve(provider.stat(vscode.Uri.from({ scheme: 'rscfile', path: '/system/script' })))
    const itemDir = await Promise.resolve(provider.stat(vscode.Uri.from({ scheme: 'rscfile', path: '/system/script/backup' })))
    const sourceFile = await Promise.resolve(provider.stat(vscode.Uri.from({ scheme: 'rscfile', path: '/system/script/backup/source' })))

    assert.equal(schemaRoot.type, vscode.FileType.Directory)
    assert.equal(itemDir.type, vscode.FileType.Directory)
    assert.equal(sourceFile.type, vscode.FileType.File)
  })

  test('stat rejects hidden, unknown, and invalid multi-file paths', () => {
    const provider = new SystemScriptFS()
    ;(provider as unknown as { setCachedItemNames: (schemaPath: string, names: Set<string>) => void })
      .setCachedItemNames('/system/script', new Set(['backup']))

    assert.throws(
      () => provider.stat(vscode.Uri.from({ scheme: 'rscfile', path: '/system/script/.hidden' })),
      (error: unknown) => error instanceof vscode.FileSystemError,
    )

    assert.throws(
      () => provider.stat(vscode.Uri.from({ scheme: 'rscfile', path: '/system/script/missing' })),
      (error: unknown) => error instanceof vscode.FileSystemError,
    )

    assert.throws(
      () => provider.stat(vscode.Uri.from({ scheme: 'rscfile', path: '/system/script/backup/comment' })),
      (error: unknown) => error instanceof vscode.FileSystemError,
    )
  })

  test('stat supports singleton multi-file schemas', async () => {
    const provider = new SystemScriptFS()

    const buttonDir = await Promise.resolve(provider.stat(vscode.Uri.from({ scheme: 'rscfile', path: '/system/routerboard/mode-button' })))
    const buttonFile = await Promise.resolve(provider.stat(vscode.Uri.from({ scheme: 'rscfile', path: '/system/routerboard/mode-button/on-event' })))

    assert.equal(buttonDir.type, vscode.FileType.Directory)
    assert.equal(buttonFile.type, vscode.FileType.File)
  })
})
