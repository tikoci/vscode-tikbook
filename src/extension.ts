import { ExtensionContext } from 'vscode'
import { StatusWatchdog } from './watchdog'
import { initializeNotebookEngines } from './notebook'
import { SecretManager } from './config'
import { MarkdownHandlers } from './codelens'
import { VideoViewer } from './video'
import { initializeVirtualDocs } from './virtualdocs'
import { initializeSystemScriptFileSystem } from './scriptfs'
import { initializeMenus } from './menus'
import { initializeCommands } from './commands'
import { log, initializeLogging } from './shared'
import { initializeSSH } from './remote'
import { initializeConverters } from './converters'

export function activate(context: ExtensionContext) {
  log.info('TikBook <activate> started')
  context.subscriptions.push(
    SecretManager.start(context),
    ...initializeLogging(),
    ...initializeMenus(),
    ...initializeCommands(),
    ...initializeNotebookEngines(),
    ...initializeVirtualDocs(),
    ...initializeSSH(),
    ...initializeConverters(),
    ...initializeSystemScriptFileSystem(),
    new MarkdownHandlers(context),
    new StatusWatchdog(context),
    new VideoViewer(context),
  )

  /*
  // Auto-mount router scripts filesystem if not already mounted
  setImmediate(() => {
    try {
      const hasMounted = workspace.workspaceFolders?.some(f => f.uri.scheme === 'rscfile')
      if (!hasMounted) {
        const base = getSettings().baseUrl || ''
        if (base) {
          const host = base.replace(/^https?:\/\//, '').replace(/\/$/, '')
          log.info(`<extension> auto-mounting router scripts from ${host}`)
          mountScriptsToExplorer(host).catch((err) => {
            log.debug(`<extension> auto-mount skipped: ${err}`)
          })
        }
      }
    }
    catch (err) {
      log.debug(`<extension> auto-mount init failed: ${err}`)
    }
  })
  */
  log.info('TikBook <activate> ended')
}

export function deactivate() {
  log.info('TikBook <deactivate> invoked')
}
