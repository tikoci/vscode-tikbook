import type { Disposable } from 'vscode';
import { CancellationTokenSource, commands, env, Uri, ViewColumn, window, workspace } from 'vscode';
import { getSettings, SecretManager } from './config';
import { MarkdownSerializer, ScriptSerializer } from './notebook';
import { mountScriptsToExplorer } from './scriptfs';
import { log } from './shared';

export function initializeCommands(): Disposable[] {
  const killswitch = new CancellationTokenSource()
  return [

    commands.registerCommand('tikoci.secrets.default.set', async (_) => {
      log.trace('[tikoci.secrets.default.set] invoked')
      await SecretManager.default.setPassword(_)
    }),
    commands.registerCommand('tikoci.secrets.default.clear', async (_) => {
      log.trace('[tikoci.secrets.default.clear] invoked')
      await SecretManager.default.clearPassword(_)
    }),
    commands.registerCommand('tikbook.show.output.tikbook', () => {
      log.trace('[tikbook.show.output.tikbook] invoked')
      log.show()
    }),
    commands.registerCommand('tikbook.show.output.routeroslsp', () => {
      log.info('[tikbook.show.output.routeroslsp] is not implemented, skipping')
      void window.showWarningMessage('Show RouterOS LSP Logs is not supported.\nUse Output panel and select "RouterOS LSP" as output type.')
      // await commands.executeCommand('routeroslsp.runCommand', 'show.output.log')
    }),
    commands.registerCommand('tikbook.routeros.reopen.notebook.routeros', async (_uri?: Uri) => {
      const uri = _uri ?? window.activeTextEditor?.document.uri
      const openNotebooksMatching = window.visibleNotebookEditors.filter(e => e.notebook.uri.path === uri?.path)
      if (openNotebooksMatching.length > 0) {
        await window.showNotebookDocument(openNotebooksMatching[0].notebook, { preserveFocus: false })
      }
      else {
        await commands.executeCommand('vscode.openWith', uri, 'tikbook', ViewColumn.Beside)
      }
    }),
    commands.registerCommand('tikbook.vdoc.clone.tikbook', async () => {
      const vdoc = window.activeTextEditor?.document
      if (!vdoc) return
      const content = vdoc.getText()
      const buffer = new TextEncoder().encode(content)
      const notebookData = await Promise.resolve((new ScriptSerializer()).deserializeNotebook(buffer, killswitch.token))
      const notebookDoc = await workspace.openNotebookDocument('tikbook', notebookData)
      await window.showNotebookDocument(notebookDoc)
    }),
    commands.registerCommand('tikbook.vdoc.clone.markdown', async () => {
      const vdoc = window.activeTextEditor?.document
      if (!vdoc) return
      const content = vdoc.getText()
      const buffer = new TextEncoder().encode(content)
      const notebookData = await Promise.resolve((new MarkdownSerializer()).deserializeNotebook(buffer, killswitch.token))
      const notebookDoc = await workspace.openNotebookDocument('markdown-routeros', notebookData)
      await window.showNotebookDocument(notebookDoc)
    }),
    commands.registerCommand('tikbook.markdown.reopen.notebook', async (uri?: Uri) => {
      const activeEditor = window.activeTextEditor
      const targetUri = uri ?? activeEditor?.document.uri

      if (!targetUri) {
        const msg = 'No file uri was found.  Cannot reopen as Markdown RouterOS notebook.'
        void window.showWarningMessage(msg)
        log.info(`[tikbook.markdown.reopen.notebook] not possible editorLangId '${activeEditor?.document.languageId}', warned user '${msg}'`)
        return
      }

      try {
        await commands.executeCommand('vscode.openWith', targetUri, 'markdown-routeros')
        void window.showInformationMessage(`Opened '${targetUri.fsPath}' with RouterOS Notebook.`)
        log.debug(`[tikbook.markdown.reopen.notebook] opened ${targetUri.toString()}`)
      }
      catch (error) {
        const msg = `Failed to open notebook, got exception '${error instanceof Error ? error.cause : String(error)}'`
        void window.showWarningMessage(msg)
        log.warn(`[tikbook.markdown.reopen.notebook] got exception and warned user '${msg}'`, error)
      }
    }),
    commands.registerCommand('tikbook.browse.mikrotikstatus', () => {
      void env.openExternal(Uri.parse('https://mikrotikstat.us'))
    }),
    commands.registerCommand('tikbook.browse.tikoci.home', () => {
      void env.openExternal(Uri.parse('https://tikoci.github.io'))
    }),
    commands.registerCommand('tikbook.browse.mikrotik.forum', () => {
      void env.openExternal(Uri.parse('https://forum.mikrotik.com'))
    }),
    commands.registerCommand('tikbook.browse.mikrotik.issues', () => {
      void env.openExternal(Uri.parse('https://help.mikrotik.com/servicedesk/servicedesk'))
    }),
    commands.registerCommand('tikbook.browse.mikrotik.docs.scripting', () => {
      void env.openExternal(Uri.parse('https://help.mikrotik.com/docs/x/XQDWAg'))
    }),
    commands.registerCommand('tikbook.browse.mikrotik.docs', () => {
      void env.openExternal(Uri.parse('https://help.mikrotik.com/docs'))
    }),
    commands.registerCommand('tikbook.browse.router.webfig', () => {
      void env.openExternal(Uri.parse(`${getSettings().baseUrl}`))
    }),
    commands.registerCommand('tikbook.welcome.open.scriptfs', () => {
      log.trace('[tikbook.welcome.open.scriptfs] invoked')
      try {
        const base = getSettings().baseUrl ?? ''
        if (!base) {
          void window.showErrorMessage('tikbook.baseUrl is not configured. Please set it in settings to mount router scripts.')
          log.warn('[tikbook.welcome.open.scriptfs] baseUrl not configured')
          return
        }
        const host = base.replace(/^https?:\/\//, '').replace(/\/$/, '')
        log.info(`[tikbook.welcome.open.scriptfs] mounting router scripts from ${host}`)
        mountScriptsToExplorer(host)
      }
      catch (err) {
        void window.showErrorMessage(`Failed to mount router scripts: ${err}`)
        log.error(`[tikbook.welcome.open.scriptfs] failed: ${err}`)
      }
    }),
    // Experiment with File System Provider for Scripting
    // commands.registerCommand('tikbook.test.vfs.update', async () => {
    //  workspace.updateWorkspaceFolders(0, 0, { uri: Uri.parse('systemscriptfs:/'), name: 'RouterOS Scripts' })
    // }),
  ]
}
