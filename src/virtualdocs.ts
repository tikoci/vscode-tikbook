import { DateTime } from 'luxon';
import * as path from 'node:path';
import type { CancellationToken, Disposable, TextDocumentContentProvider } from 'vscode';
import { CancellationTokenSource, commands, EventEmitter, Uri, ViewColumn, window, workspace } from 'vscode';
import { MarkdownSerializer, ScriptSerializer } from './notebook';
import type { RouterOSExportType } from './routeros';
import { RouterRestClient } from './routeros';
import { log } from './shared';
import { getActiveNotebook } from './vscode-compat';

export function initializeVirtualDocs(): Disposable[] {
  const provider = new RouterConfigProvider()
  return [
    provider,
    workspace.registerTextDocumentContentProvider('rscena', provider),
    commands.registerCommand('tikbook.view.markdown', async () => {
      const activeNotebook = getActiveNotebook()
      const doc = activeNotebook ?? window.activeTextEditor?.document
      if (!doc) {
        log.warn(`<vdoc> [tikbook.view.markdown] an active editor or notebook is required, but none was found, command aborted`)
        return
      }
      if (doc.isUntitled) {
        void window.showWarningMessage(`Untitled documents cannot previewed. Save file to enable Markdown preview.`, 'Save As...', 'Cancel')
          .then((selection) => {
            if (selection === 'Save As...') void commands.executeCommand('workbench.action.files.save').then(e => log.info(JSON.stringify(e)))
          })
        return
      }
      const frag = activeNotebook ? 'tikbook2md' : 'rsc2md'
      const vdoc = await workspace.openTextDocument(Uri.parse(`rscena:${path.posix.basename(doc.uri.path)}-view.md/?${frag}#${doc.uri}`))
      await window.showTextDocument(vdoc, { preview: false, preserveFocus: false, viewColumn: ViewColumn.Two })
      // disable automatic preview of markdown HTML, just show markdown as editor text, allow user to hit preview themselves
      // ... creates a mess of columns, would require some "preview controller" to deal with side-effects but ideally
      // commands.executeCommand('markdown.showPreviewToSide', doc.uri)
    }),
    commands.registerCommand('tikbook.view.script', async () => {
      const nb = getActiveNotebook()
      if (!nb) {
        log.warn(`<vdoc> [tikbook.view.script] found no active notebook`)
        return
      }
      if (nb.isUntitled) {
        void window.showWarningMessage(`Untitled notebooks cannot previewed. Save file to enable RouterOS script preview.`, 'Save As...', 'Cancel')
          .then((selection) => {
            if (selection === 'Save As...') void commands.executeCommand('workbench.action.files.save').then(e => log.info(JSON.stringify(e)))
          })
        return
      }
      const vdoc = await workspace.openTextDocument(Uri.parse(`rscena:${path.posix.basename(nb.uri.path)}-view.rsc/?md2rsc#${nb.uri}`))
      await window.showTextDocument(vdoc, { preview: false, preserveFocus: false, viewColumn: ViewColumn.Beside })
    }),
    commands.registerCommand('tikbook.open.router.export', async (type: RouterOSExportType = 'compact') => {
      const vdoc = await workspace.openTextDocument(Uri.parse(`rscena:export-${type}.rsc?export#${type}`))
      await window.showTextDocument(vdoc, { preview: false })
    }),
    commands.registerCommand('tikbook.open.router.script', async (name, id) => {
      const vdoc = await workspace.openTextDocument(Uri.parse(`rscena:${encodeURIComponent(name)}.rsc?script#${encodeURIComponent(id)}`))
      await window.showTextDocument(vdoc, { preview: false })
    }),
    commands.registerCommand('tikbook.open.router.scripts.globals', async () => {
      const vdoc = await workspace.openTextDocument(Uri.parse(`rscena:all-script-as-globals.rsc?scripts.globals`))
      await window.showTextDocument(vdoc, { preview: false })
    }),
    commands.registerCommand('tikbook.open.router.scripts.tikbook', async () => {
      const vdoc = await workspace.openTextDocument(Uri.parse(`rscena:all-scripts.md.rsc?scripts.tikbook`))
      await window.showTextDocument(vdoc, { preview: false })
    }),
    commands.registerCommand('tikbook.open.router.default-configuration.script', async () => {
      const vdoc = await workspace.openTextDocument(Uri.parse(`rscena:defconf.rsc?default-configuration#script`))
      await window.showTextDocument(vdoc, { preview: false })
    }),
    commands.registerCommand('tikbook.open.router.default-configuration.caps-mode-script', async () => {
      const vdoc = await workspace.openTextDocument(Uri.parse(`rscena:defconf-capsman.rsc?default-configuration#caps-mode-script`))
      await window.showTextDocument(vdoc, { preview: false })
    }),
    commands.registerCommand('tikbook.open.router.default-configuration.custom-script', async () => {
      const vdoc = await workspace.openTextDocument(Uri.parse(`rscena:defconf-custom.rsc?default-configuration#script`))
      await window.showTextDocument(vdoc, { preview: false })
    }),
    commands.registerCommand('tikbook.open.router.ip.neighbor.print.detail.csv', async () => {
      const vdoc = await workspace.openTextDocument(Uri.parse(`rscena:ip-neighbor.csv?ip-neighbor#detail`))
      await window.showTextDocument(vdoc, { preview: false })
    }),
    commands.registerCommand('tikbook.open.router.csv', async (cmd, name) => {
      const vdoc = await workspace.openTextDocument(Uri.parse(`rscena:${encodeURIComponent(name)}.csv?csv#${encodeURIComponent(cmd)}`))
      await window.showTextDocument(vdoc, { preview: false })
    }),
    commands.registerCommand('tikbook.vdoc.refresh', (uri) => {
      provider.refresh(uri)
    }),
    commands.registerCommand('tikbook.vdoc.refresh.active', () => {
      const activeEditor = window.activeTextEditor
      if (activeEditor?.document.uri.scheme === RouterConfigProvider.scheme) {
        void commands.executeCommand('tikbook.vdoc.refresh', activeEditor.document.uri)
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
  private isDisposed = false

  static readonly scheme = 'rscena'

  constructor() {
    log.trace('<RouterConfigProvider> {constructor} registering listeners')
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

  refresh(uri: Uri): void {
    log.trace(`<RouterConfigProvider> {refresh} uri=${uri.toString()}`)
    this.onDidChangeEmitter.fire(uri)
  }

  refreshAll(): void {
    log.trace('<RouterConfigProvider> {refreshAll} invoked')
    this.urimap.rawKeys.forEach((k) => {
      this.refresh(Uri.parse(k))
    })
  }

  // MARK: get vdoc

  async provideTextDocumentContent(uri: Uri, _token: CancellationToken): Promise<string | undefined> {
    log.info(`<RouterConfigProvider> {provideTextDocumentContent} got request scheme ${uri.scheme} authority ${uri.authority} path ${uri.path} query ${uri.query} fragment ${uri.fragment}`)
    if (this.isCanceled(_token)) return undefined
    const client = RouterRestClient.default
    const cancelDisposable = _token.onCancellationRequested(() => {})
    try {
      switch (uri.query) {
        case 'tikbook2md':
          this.urimap.set(Uri.parse(uri.fragment).toString(), uri.toString())
          return await this.getMarkdownFromNotebook(Uri.parse(uri.fragment), _token)
        case 'rsc2md':
          this.urimap.set(Uri.parse(uri.fragment).toString(), uri.toString())
          return await this.getMarkdownFromScript(Uri.parse(uri.fragment), _token)
        case 'md2rsc':
          this.urimap.set(Uri.parse(uri.fragment).toString(), uri.toString())
          return await this.getScriptFromNotebook(Uri.parse(uri.fragment), _token)
        case 'export':
          if (this.isCanceled(_token)) return undefined
          return await client.exportConfig(uri.fragment as RouterOSExportType, this.killswitch.signal)
        case 'script': {
          const script = await client.getSystemScript(uri.fragment)
          if (this.isCanceled(_token)) return undefined
          return script.source
        }
        case 'scripts.tikbook': {
          const scripts = await client.systemScripts
          if (this.isCanceled(_token)) return undefined
          return scripts.map((script: unknown) => {
            const s = script as Record<string, unknown>
            return `\n#.markdown\n`
              + `#   ### ${s.name}\n`
              + (s.comment
                ? `#   #### ${s.comment}\n`
                : '')
              + `#   * **owner** ${s.owner}\n`
              + `#   * **dont-require-permissions** ${s['dont-require-permissions']}\n`
              + `#   * **policy** ${s.policy}\n`
              + `#   > _Script captured at_ ${DateTime.now().toLocaleString(DateTime.DATETIME_SHORT)}\n`
              + `#.\n`
              + `${s.source}\n`
          }).join('\n#.\n')
        }
        case 'scripts.globals': {
          const scripts = await client.systemScripts
          if (this.isCanceled(_token)) return undefined
          return scripts.map((script: unknown) => {
            const s = script as Record<string, unknown>
            return `\n# ${(s.name as string).toUpperCase()} - ${s.comment}\n`
              + `#\towner=${s.owner} ${(s['dont-require-permissions'] && s['dont-require-permissions'] === 'yes') ? `dont-require-permissions=yes` : `policy=${s.policy}`}\n`
              + `:global "run-${s.name}" do={\n`
              + `${(s.source as string)?.split(`\n`).join(`\n    `)}\n`
              + `}\n`
          }).join('\n#.\n')
        }
        case 'default-configuration': {
          const config = await client.defaultConfiguration
          if (this.isCanceled(_token)) return undefined
          switch (uri.fragment) {
            case 'caps-mode-script':
              return String(config?.['caps-mode-script'] ?? '')
            case 'custom':
              return String(config?.custom ?? '')
            default:
              return String(config?.script ?? '')
          }
        }
        case 'ip-neighbor': {
          return await client._asCSV('/ip/neighbor/print detail')
        }
        case 'csv': {
          return await client._asCSV(uri.fragment)
        }
      }
    }
    finally {
      cancelDisposable.dispose()
    }
  }

  dispose(): void {
    if (this.isDisposed) return
    this.isDisposed = true
    log.trace('<RouterConfigProvider> {dispose} invoked')
    this.disposables.forEach(e => e.dispose())
    this.onDidChangeEmitter.dispose()
    this.killswitch.abort('killing export, disposed <RouterConfigProvider>')
  }

  // MARK: get md

  async getMarkdownFromScript(uri: Uri, token?: CancellationToken): Promise<string> {
    if (!uri) throw new Error('URI must be to a valid notebook document')
    if (this.isCanceled(token)) throw new Error('Request cancelled')
    const killswitch = new CancellationTokenSource()
    const text = (await workspace.openTextDocument(uri)).getText()
    if (this.isCanceled(token)) throw new Error('Request cancelled')
    const scriptSerializer = new ScriptSerializer()
    const markdownSerializer = new MarkdownSerializer()
    const notebookData = await Promise.resolve(
      scriptSerializer.deserializeNotebook(new TextEncoder().encode(text), killswitch.token),
    )
    const serialized = await Promise.resolve(markdownSerializer.serializeNotebook(notebookData, killswitch.token))
    return new TextDecoder().decode(serialized)
  }

  async getMarkdownFromNotebook(uri: Uri, token?: CancellationToken): Promise<string> {
    if (this.isCanceled(token)) throw new Error('Request cancelled')
    const nb = await workspace.openNotebookDocument(uri)
    if (!nb) throw new Error('URI must be to a valid notebook document')
    if (this.isCanceled(token)) throw new Error('Request cancelled')
    const killswitch = new CancellationTokenSource()
    const text = (await workspace.openTextDocument(nb.uri)).getText()
    if (this.isCanceled(token)) throw new Error('Request cancelled')
    const scriptSerializer = new ScriptSerializer()
    const markdownSerializer = new MarkdownSerializer()
    switch (nb.notebookType) {
      case 'tikbook':
      case 'routeros':
        return new TextDecoder().decode(await Promise.resolve(markdownSerializer.serializeNotebook(
          await Promise.resolve(scriptSerializer.deserializeNotebook(new TextEncoder().encode(text), killswitch.token)),
          killswitch.token)))
      case 'markdown-routeros':
        return text
      default:
        log.error('<RouterConfigProvider> {getMarkdownFromNotebook} got invalid notebookType, throwing')
        throw new Error('Notebook must be a known type.  Currently TikBook or Markdown RouterOS')
    }
  }

  // MARK: get rsc

  async getScriptFromNotebook(uri: Uri, token?: CancellationToken): Promise<string> {
    // const nb = window.activeNotebookEditor?.notebook
    // if (!nb) return
    if (this.isCanceled(token)) throw new Error('Request cancelled')
    const nb = await workspace.openNotebookDocument(uri)
    if (!nb) throw new Error('URI must be to a valid notebook document')
    if (this.isCanceled(token)) throw new Error('Request cancelled')
    const killswitch = new CancellationTokenSource()
    const text = (await workspace.openTextDocument(nb.uri)).getText()
    if (this.isCanceled(token)) throw new Error('Request cancelled')
    const scriptSerializer = new ScriptSerializer()
    const markdownSerializer = new MarkdownSerializer()
    switch (nb.notebookType) {
      case 'tikbook':
      case 'routeros':
        return text
      case 'markdown-routeros':
        return new TextDecoder().decode(await Promise.resolve(scriptSerializer.serializeNotebook(
          await Promise.resolve(markdownSerializer.deserializeNotebook(new TextEncoder().encode(text), killswitch.token)),
          killswitch.token)))
      default:
        log.error(`<getScriptFromNotebook> got invalid notebookType, throwing`, uri)
        throw new Error('Notebook must be a known type.  Currently TikBook or Markdown RouterOS')
    }
  }

  private isCanceled(token?: CancellationToken): boolean {
    return this.isDisposed || token?.isCancellationRequested === true
  }
}

// MARK: BiMap

export class BiMap<K, V> {
  private keyToValue = new Map<K, V>()
  private valueToKey = new Map<V, K>()

  get rawKeys(): Map<K, V> { return this.keyToValue }

  set(key: K, value: V): void {
    // Remove old mappings if they exist
    const existingValue = this.keyToValue.get(key)
    if (existingValue !== undefined) {
      this.valueToKey.delete(existingValue)
    }
    const existingKey = this.valueToKey.get(value)
    if (existingKey !== undefined) {
      this.keyToValue.delete(existingKey)
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
