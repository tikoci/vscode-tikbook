import { ExtensionContext } from 'vscode'
import { StatusWatchdog } from './watchdog'
import { initializeNotebookEngines } from './notebook'
import { SecretManager } from './config'
import { MarkdownHandlers } from './codelens'
import { VideoViewer } from './video'
import { initializeVirtualDocs } from './virtualdocs'
import { initializeMenus } from './menus'
import { initializeCommands } from './commands'
import { log, initializeLogging } from './shared'
import { initializeSSH } from './ssh'
import { initializeConverters } from './converters'
// import { initializeSystemScriptFileSystem } from './scriptfs'

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
    new MarkdownHandlers(context),
    new StatusWatchdog(context),
    new VideoViewer(context),
    // ...initializeSystemScriptFileSystem(),
  )
  log.info('TikBook <activate> ended')
}

export function deactivate() {
  log.info('TikBook <deactivate> invoked')
}
