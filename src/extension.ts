import type { ExtensionContext } from 'vscode'
import { MarkdownHandlers } from './codelens'
import { initializeCommands } from './commands'
import { SecretManager } from './config'
import { initializeConverters } from './converters'
import { initializeMenus } from './menus'
import { initializeNotebookEngines } from './notebook'
import { initializeSSH } from './remote'
import { RouterRestClient } from './routeros'
import { initializeSystemScriptFileSystem } from './scriptfs'
import { initializeLogging, log } from './shared'
import { VideoViewer } from './video'
import { initializeVirtualDocs } from './virtualdocs'
import { logVersionInfo } from './vscode-compat'
import { StatusWatchdog } from './watchdog'

let activationSubscriptionCount = 0

export function activate(context: ExtensionContext): void {
  log.info('TikBook <activate> started')
  logVersionInfo(log)
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
    RouterRestClient.default,
    new MarkdownHandlers(context),
    new StatusWatchdog(context),
    new VideoViewer(context),
  )
  activationSubscriptionCount = context.subscriptions.length

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
  log.info(`TikBook <activate> ended subscriptions=${activationSubscriptionCount}`)
}

export function deactivate(): void {
  log.info(`TikBook <deactivate> invoked subscriptions=${activationSubscriptionCount}`)
}
