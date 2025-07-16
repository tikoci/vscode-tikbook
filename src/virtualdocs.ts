import { commands, EventEmitter, TextDocumentContentProvider, Uri, ViewColumn, window, workspace } from 'vscode'
import { RouterRestClient } from './routeros'
import { log } from './shared'
import { DateTime } from 'luxon'
import * as path from 'path'
import { MarkdownSerializer, ScriptSerializer } from './notebook'
import { BiMap } from './bimap'

export function initializeVirtualDocs() {
  return [
    workspace.registerTextDocumentContentProvider('rscena', new RouterConfigProvider()),
    commands.registerCommand('tikbook.view.markdown', async () => {
      const doc = window.activeNotebookEditor ? window.activeNotebookEditor?.notebook : window.activeTextEditor.document
      const frag = window.activeNotebookEditor ? 'tikbook2md' : 'rsc2md'
      await workspace.openTextDocument(Uri.parse(`rscena:${path.posix.basename(doc.uri.path)}-view.md/?${frag}#${doc.uri}`)).then(
        (doc) => {
          window.showTextDocument(doc, { preview: false, preserveFocus: false, viewColumn: ViewColumn.Two })
          commands.executeCommand('markdown.showPreviewToSide', doc.uri)
        })
    }),
    commands.registerCommand('tikbook.view.script', async () => {
      const nb = window.activeNotebookEditor?.notebook
      await workspace.openTextDocument(Uri.parse(`rscena:${path.posix.basename(nb.uri.path)}-view.rsc/?md2rsc#${nb.uri}`)).then(
        (doc) => {
          window.showTextDocument(doc, { preview: false, preserveFocus: false, viewColumn: ViewColumn.Beside })
        })
    }),
    commands.registerCommand('tikbook.open.router.export', async () => {
      await workspace.openTextDocument(Uri.parse(`rscena:export.rsc?export#compact`)).then(
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
  ]
}

export class RouterConfigProvider implements TextDocumentContentProvider {
  disposables = []
  killswitch = new AbortController()
  onDidChangeEmitter = new EventEmitter<Uri>()
  onDidChange = this.onDidChangeEmitter.event
  urimap = new BiMap<string, string>()

  constructor() {
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

  async provideTextDocumentContent(uri: Uri, _token): Promise<string> {
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
        return await client.exportConfig('compact', this.killswitch.signal)
      case 'script':
        return (await client.getSystemScript(uri.fragment)).source
      case 'scripts.tikbook':
        return (await client.systemScripts).map((script) => {
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
        return (await client.systemScripts).map((script) => {
          return `\n# ${script.name.toUpperCase()} - ${script.comment}\n`
            + `#\towner=${script.owner} ${script['dont-require-permissions'] == 'yes' ? `dont-require-permissions=yes` : `policy=${script.policy}`}\n`
            + `:global "run-${script.name}" do={\n`
            + `${script.source?.split(`\n`).join(`\n    `)}\n`
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
    }
  }

  static scheme: 'rscena'

  dispose() {
    this.disposables.forEach(e => e.dispose())
    this.killswitch.abort('killing export, disposed <RouterConfigProvider>')
  }

  async getMarkdownFromScript(uri: Uri) {
    if (!uri) throw new Error('URI must be to a valid notebook document')
    const text = (await workspace.openTextDocument(uri)).getText()
    const scriptSerializer = new ScriptSerializer()
    const markdownSerializer = new MarkdownSerializer()
    return new TextDecoder().decode(await markdownSerializer.serializeNotebook(
      await scriptSerializer.deserializeNotebook(new TextEncoder().encode(text), null),
      null))
  }

  async getMarkdownFromNotebook(uri: Uri) {
    const nb = await workspace.openNotebookDocument(uri)
    if (!nb) throw new Error('URI must be to a valid notebook document')
    const text = (await workspace.openTextDocument(nb.uri)).getText()
    const scriptSerializer = new ScriptSerializer()
    const markdownSerializer = new MarkdownSerializer()
    switch (nb.notebookType) {
      case 'tikbook':
      case 'routeros':
        return new TextDecoder().decode(await markdownSerializer.serializeNotebook(
          await scriptSerializer.deserializeNotebook(new TextEncoder().encode(text), null),
          null))
      case 'markdown-routeros':
        return text
      default:
        log.error('<RouterConfigProvider> {getMarkdownFromNotebook} got invalid notebookType, throwing')
        throw new Error('Notebook must be a known type.  Currently TikBook or Markdown RouterOS')
    }
  }

  async getScriptFromNotebook(uri: Uri) {
    // const nb = window.activeNotebookEditor?.notebook
    // if (!nb) return
    const nb = await workspace.openNotebookDocument(uri)
    if (!nb) throw new Error('URI must be to a valid notebook document')
    const text = (await workspace.openTextDocument(nb.uri)).getText()
    const scriptSerializer = new ScriptSerializer()
    const markdownSerializer = new MarkdownSerializer()
    switch (nb.notebookType) {
      case 'tikbook':
      case 'routeros':
        return text
      case 'markdown-routeros':
        return new TextDecoder().decode(await scriptSerializer.serializeNotebook(
          await markdownSerializer.deserializeNotebook(new TextEncoder().encode(text), null),
          null))
      default:
        log.error(`<getScriptFromNotebook> got invalid notebookType, throwing`, uri)
        throw new Error('Notebook must be a known type.  Currently TikBook or Markdown RouterOS')
    }
  }
}
