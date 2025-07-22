import { commands, EventEmitter, Disposable, TextDocumentContentProvider, Uri, ViewColumn, window, workspace, CancellationToken, CancellationTokenSource } from 'vscode'
import { RouterOSExportType, RouterRestClient } from './routeros'
import { log } from './shared'
import { DateTime } from 'luxon'
import * as path from 'path'
import { MarkdownSerializer, ScriptSerializer } from './notebook'

export function initializeVirtualDocs() {
  const provider = new RouterConfigProvider()
  return [
    workspace.registerTextDocumentContentProvider('rscena', provider),
    commands.registerCommand('tikbook.view.markdown', async () => {
      const doc = window.activeNotebookEditor ? window.activeNotebookEditor?.notebook : window.activeTextEditor?.document
      if (!doc) {
        log.warn(`<vdoc> [tikbook.view.markdown] an active editor or notebook is required, but none was found, command aborted`)
        return
      }
      if (doc.isUntitled) {
        window.showWarningMessage(`Untitled documents cannot previewed. Save file to enable Markdown preview.`, 'Save As...', 'Cancel')
          .then((selection) => {
            if (selection === 'Save As...') commands.executeCommand('workbench.action.files.save').then(e => log.info(JSON.stringify(e)))
          })
        return
      }
      const frag = window.activeNotebookEditor ? 'tikbook2md' : 'rsc2md'
      await workspace.openTextDocument(Uri.parse(`rscena:${path.posix.basename(doc.uri.path)}-view.md/?${frag}#${doc.uri}`)).then(
        (doc) => {
          window.showTextDocument(doc, { preview: false, preserveFocus: false, viewColumn: ViewColumn.Two })
          // disable automatic preview of markdown HTML, just show markdown as editor text, allow user to hit preview themselves
          // ... creates a mess of columns, would require some "preview controller" to deal with side-effects but ideally
          // commands.executeCommand('markdown.showPreviewToSide', doc.uri)
        })
    }),
    commands.registerCommand('tikbook.view.script', async () => {
      const nb = window.activeNotebookEditor?.notebook
      if (!nb) {
        log.warn(`<vdoc> [tikbook.view.script] found no active notebook`)
        return
      }
      if (nb.isUntitled) {
        window.showWarningMessage(`Untitled notebooks cannot previewed. Save file to enable RouterOS script preview.`, 'Save As...', 'Cancel')
          .then((selection) => {
            if (selection === 'Save As...') commands.executeCommand('workbench.action.files.save').then(e => log.info(JSON.stringify(e)))
          })
        return
      }
      await workspace.openTextDocument(Uri.parse(`rscena:${path.posix.basename(nb.uri.path)}-view.rsc/?md2rsc#${nb.uri}`)).then(
        (doc) => {
          window.showTextDocument(doc, { preview: false, preserveFocus: false, viewColumn: ViewColumn.Beside })
        })
    }),
    commands.registerCommand('tikbook.open.router.export', async (type: RouterOSExportType = 'compact') => {
      await workspace.openTextDocument(Uri.parse(`rscena:export-${type}.rsc?export#${type}`)).then(
        doc => window.showTextDocument(doc, { preview: false }))
    }),
    commands.registerCommand('tikbook.open.router.script', async (name, id) => {
      await workspace.openTextDocument(Uri.parse(`rscena:${encodeURIComponent(name)}.rsc?script#${encodeURIComponent(id)}`)).then(
        doc => window.showTextDocument(doc, { preview: false }))
    }),
    commands.registerCommand('tikbook.open.router.scripts.globals', async () => {
      await workspace.openTextDocument(Uri.parse(`rscena:all-script-as-globals.rsc?scripts.globals`)).then(
        doc => window.showTextDocument(doc, { preview: false }))
    }),
    commands.registerCommand('tikbook.open.router.scripts.tikbook', async () => {
      await workspace.openTextDocument(Uri.parse(`rscena:all-scripts.md.rsc?scripts.tikbook`)).then(
        doc => window.showTextDocument(doc, { preview: false }))
    }),
    commands.registerCommand('tikbook.open.router.default-configuration.script', async () => {
      await workspace.openTextDocument(Uri.parse(`rscena:defconf.rsc?default-configuration#script`)).then(
        doc => window.showTextDocument(doc, { preview: false }))
    }),
    commands.registerCommand('tikbook.open.router.default-configuration.caps-mode-script', async () => {
      await workspace.openTextDocument(Uri.parse(`rscena:defconf-capsman.rsc?default-configuration#caps-mode-script`)).then(
        doc => window.showTextDocument(doc, { preview: false }))
    }),
    commands.registerCommand('tikbook.open.router.default-configuration.custom-script', async () => {
      await workspace.openTextDocument(Uri.parse(`rscena:defconf-custom.rsc?default-configuration#script`)).then(
        doc => window.showTextDocument(doc, { preview: false }))
    }),
    commands.registerCommand('tikbook.open.router.ip.neighbor.print.detail.csv', async () => {
      await workspace.openTextDocument(Uri.parse(`rscena:ip-neighbor.csv?ip-neighbor#detail`)).then(
        doc => window.showTextDocument(doc, { preview: false }))
    }),
    commands.registerCommand('tikbook.open.router.csv', async (cmd, name) => {
      await workspace.openTextDocument(Uri.parse(`rscena:${encodeURIComponent(name)}.csv?csv#${encodeURIComponent(cmd)}`)).then(
        doc => window.showTextDocument(doc, { preview: false }))
    }),
    commands.registerCommand('tikbook.vdoc.refresh', async (uri) => {
      provider.refresh(uri)
    }),
    commands.registerCommand('tikbook.vdoc.refresh.active', () => {
      const activeEditor = window.activeTextEditor
      if (activeEditor && activeEditor.document.uri.scheme === RouterConfigProvider.scheme) {
        commands.executeCommand('tikbook.vdoc.refresh', activeEditor.document.uri)
      }
    }),
    commands.registerCommand('tikbook.vdoc.refresh.all', () => {
      provider.refreshAll()
    }),
  ]
}

// MARK: provider

export class RouterConfigProvider implements TextDocumentContentProvider {
  disposables: Disposable[] = []
  killswitch = new AbortController()
  onDidChangeEmitter = new EventEmitter<Uri>()
  readonly onDidChange = this.onDidChangeEmitter.event
  urimap = new BiMap<string, string>()

  static readonly scheme = 'rscena'

  constructor() {
    // this.onDidChange = this.onDidChangeEmitter.event
    // if vdoc is closed, remove it from urimap as it no longer needs to be updated
    this.disposables.push(workspace.onDidCloseTextDocument(
      doc => this.urimap.deleteByValue(doc.uri.toString())))
    // and if one our vdocs "associated" real doc saved, tell VSCode to update us
    this.disposables.push(workspace.onDidSaveTextDocument((doc) => {
      const savedocuri = this.urimap.getValue(doc.uri.toString())
      if (savedocuri) {
        this.onDidChangeEmitter.fire(Uri.parse(savedocuri))
      }
    }))
    // same for notebooks...
    // if vdoc is closed, remove it from urimap as it no longer needs to be updated
    this.disposables.push(workspace.onDidCloseNotebookDocument(
      doc => this.urimap.deleteByValue(doc.uri.toString())))
    // and if one our vdocs "associated" real doc saved, tell VSCode to update us
    this.disposables.push(workspace.onDidSaveNotebookDocument(
      (doc) => {
        const savedocuri = this.urimap.getValue(doc.uri.toString())
        if (savedocuri) {
          this.onDidChangeEmitter.fire(Uri.parse(savedocuri))
        }
      }))
  }

  refresh(uri: Uri) {
    this.onDidChangeEmitter.fire(uri)
  }

  refreshAll() {
    this.urimap.rawKeys.forEach((k) => {
      this.refresh(Uri.parse(k))
    })
  }

  // MARK: get vdoc

  async provideTextDocumentContent(uri: Uri, _token: CancellationToken): Promise<string | undefined> {
    log.info(`<RouterConfigProvider> {provideTextDocumentContent} got request scheme ${uri.scheme} authority ${uri.authority} path ${uri.path} query ${uri.query} fragment ${uri.fragment}`)
    const client = RouterRestClient.default
    switch (uri.query) {
      case 'tikbook2md':
        this.urimap.set(Uri.parse(uri.fragment).toString(), uri.toString())
        return await this.getMarkdownFromNotebook(Uri.parse(uri.fragment))
      case 'rsc2md':
        this.urimap.set(Uri.parse(uri.fragment).toString(), uri.toString())
        return await this.getMarkdownFromScript(Uri.parse(uri.fragment))
      case 'md2rsc':
        this.urimap.set(Uri.parse(uri.fragment).toString(), uri.toString())
        return await this.getScriptFromNotebook(Uri.parse(uri.fragment))
      case 'export':
        return await client.exportConfig(uri.fragment as RouterOSExportType, this.killswitch.signal)
      case 'script':
        return (await client.getSystemScript(uri.fragment)).source
      case 'scripts.tikbook':
        return (await client.systemScripts).map((script: Record<string, { 'name': string, 'comment'?: string, 'owner'?: string, 'policy'?: string[], 'dont-require-permissions'?: string }>) => {
          return `\n#.markdown\n`
            + `#   ### ${script.name}\n`
            + (script.comment
              ? `#   #### ${script.comment}\n`
              : '')
            + `#   * **owner** ${script.owner}\n`
            + `#   * **dont-require-permissions** ${script['dont-require-permissions']}\n`
            + `#   * **policy** ${script.policy}\n`
            + `#   > _Script captured at_ ${DateTime.now().toLocaleString(DateTime.DATETIME_SHORT)}\n`
            + `#.\n`
            + `${script.source}\n`
        }).join('\n#.\n')
      case 'scripts.globals':
        return (await client.systemScripts).map((script: Record<string, unknown>) => {
          return `\n# ${(script.name as string).toUpperCase()} - ${script.comment}\n`
            + `#\towner=${script.owner} ${(script['dont-require-permissions'] && script['dont-require-permissions'] === 'yes') ? `dont-require-permissions=yes` : `policy=${script.policy}`}\n`
            + `:global "run-${script.name}" do={\n`
            + `${(script.source as string)?.split(`\n`).join(`\n    `)}\n`
            + `}\n`
        }).join('\n#.\n')
      case 'default-configuration':
        switch (uri.fragment) {
          case 'caps-mode-script':
            return (await client.defaultConfiguration)['caps-mode-script']
          case 'custom':
            return (await client.defaultConfiguration).custom
          default:
            return (await client.defaultConfiguration).script
        }
      case 'ip-neighbor': {
        return await client._asCSV('/ip/neighbor/print detail')
      }
      case 'csv': {
        return await client._asCSV(uri.fragment)
      }
    }
  }

  dispose() {
    this.disposables.forEach(e => e.dispose())
    this.killswitch.abort('killing export, disposed <RouterConfigProvider>')
  }

  // MARK: get md

  async getMarkdownFromScript(uri: Uri) {
    if (!uri) throw new Error('URI must be to a valid notebook document')
    const killswitch = new CancellationTokenSource()
    const text = (await workspace.openTextDocument(uri)).getText()
    const scriptSerializer = new ScriptSerializer()
    const markdownSerializer = new MarkdownSerializer()
    return new TextDecoder().decode(await markdownSerializer.serializeNotebook(
      await scriptSerializer.deserializeNotebook(new TextEncoder().encode(text), killswitch.token),
      killswitch.token))
  }

  async getMarkdownFromNotebook(uri: Uri) {
    const nb = await workspace.openNotebookDocument(uri)
    if (!nb) throw new Error('URI must be to a valid notebook document')
    const killswitch = new CancellationTokenSource()
    const text = (await workspace.openTextDocument(nb.uri)).getText()
    const scriptSerializer = new ScriptSerializer()
    const markdownSerializer = new MarkdownSerializer()
    switch (nb.notebookType) {
      case 'tikbook':
      case 'routeros':
        return new TextDecoder().decode(await markdownSerializer.serializeNotebook(
          await scriptSerializer.deserializeNotebook(new TextEncoder().encode(text), killswitch.token),
          killswitch.token))
      case 'markdown-routeros':
        return text
      default:
        log.error('<RouterConfigProvider> {getMarkdownFromNotebook} got invalid notebookType, throwing')
        throw new Error('Notebook must be a known type.  Currently TikBook or Markdown RouterOS')
    }
  }

  // MARK: get rsc

  async getScriptFromNotebook(uri: Uri) {
    // const nb = window.activeNotebookEditor?.notebook
    // if (!nb) return
    const nb = await workspace.openNotebookDocument(uri)
    if (!nb) throw new Error('URI must be to a valid notebook document')
    const killswitch = new CancellationTokenSource()
    const text = (await workspace.openTextDocument(nb.uri)).getText()
    const scriptSerializer = new ScriptSerializer()
    const markdownSerializer = new MarkdownSerializer()
    switch (nb.notebookType) {
      case 'tikbook':
      case 'routeros':
        return text
      case 'markdown-routeros':
        return new TextDecoder().decode(await scriptSerializer.serializeNotebook(
          await markdownSerializer.deserializeNotebook(new TextEncoder().encode(text), killswitch.token),
          killswitch.token))
      default:
        log.error(`<getScriptFromNotebook> got invalid notebookType, throwing`, uri)
        throw new Error('Notebook must be a known type.  Currently TikBook or Markdown RouterOS')
    }
  }
}

// MARK: BiMap

export class BiMap<K, V> {
  private keyToValue = new Map<K, V>()
  private valueToKey = new Map<V, K>()

  get rawKeys(): Map<K, V> { return this.keyToValue }

  set(key: K, value: V): void {
    // Remove old mappings if they exist
    if (this.keyToValue.has(key)) {
      this.valueToKey.delete(this.keyToValue.get(key)!)
    }
    if (this.valueToKey.has(value)) {
      this.keyToValue.delete(this.valueToKey.get(value)!)
    }
    this.keyToValue.set(key, value)
    this.valueToKey.set(value, key)
  }

  getValue(key: K): V | undefined {
    return this.keyToValue.get(key)
  }

  getKey(value: V): K | undefined {
    return this.valueToKey.get(value)
  }

  deleteByKey(key: K): boolean {
    const value = this.keyToValue.get(key)
    const deleted = this.keyToValue.delete(key)
    if (value !== undefined) {
      this.valueToKey.delete(value)
    }
    return deleted
  }

  deleteByValue(value: V): boolean {
    const key = this.valueToKey.get(value)
    const deleted = this.valueToKey.delete(value)
    if (key !== undefined) {
      this.keyToValue.delete(key)
    }
    return deleted
  }

  hasKey(key: K): boolean {
    return this.keyToValue.has(key)
  }

  hasValue(value: V): boolean {
    return this.valueToKey.has(value)
  }

  keys(): IterableIterator<K> {
    return this.keyToValue.keys()
  }

  values(): IterableIterator<V> {
    return this.keyToValue.values()
  }

  clear(): void {
    this.keyToValue.clear()
    this.valueToKey.clear()
  }

  get size(): number {
    return this.keyToValue.size
  }
}
