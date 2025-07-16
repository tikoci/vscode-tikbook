import { commands, ExtensionContext, MarkdownString, StatusBarAlignment, StatusBarItem, ThemeColor, window, workspace } from 'vscode'
import { RouterRestClient } from './routeros'
import { DateTime, Duration } from 'luxon'
import { log } from './shared'
import { getSettings, SecretManager } from './config'

export class StatusWatchdog {
  statusConnectedRouter: StatusBarItem
  lastUpdate = DateTime.now()
  client: RouterRestClient
  lastRouterName = ' ... '
  state: 'none' | 'error' | 'warning' | 'inflight' | 'normal' = 'none'
  static command = 'tikbook.cmd.connected-router.configure'
  pollInterval
  lastRouterResources: object
  lastStatusMessage: string

  constructor(context: ExtensionContext) {
    this.client = RouterRestClient.default
    // this.client.settings = getSettings();
    context.subscriptions.push(
      commands.registerCommand(StatusWatchdog.command, () => this.onReconfigureCommand()),
    )
    this.statusConnectedRouter = window.createStatusBarItem(StatusBarAlignment.Left, 100)
    this.statusConnectedRouter.command = StatusWatchdog.command
    context.subscriptions.push(
      this.onConfigurationChange(),
      this.statusConnectedRouter,
      RouterRestClient.default.onHttpResponseError((e) => {
        this.triggerUpdate('error', e)
      }),
      RouterRestClient.default.onHttpRequestError((e) => {
        this.triggerUpdate('warning', e)
      }),
      RouterRestClient.default.onHttpRequestSuccess(e => this.triggerUpdate('inflight', e)),
      RouterRestClient.default.onHttpResponseSuccess(e => this.triggerUpdate('normal', e.statusText)),
    )
    this.triggerUpdate('none', 'Initializing...')
    setTimeout(() => this.checkRouter(), 1000)
    setTimeout(() => this.syncLspConnectionUrl(), 2000)
    this.pollInterval = setInterval(() => {
      if (this.state != 'normal') this.checkRouter()

      if (this.lastUpdate.diffNow() > Duration.fromMillis(30000)) this.checkRouter()
    }, 10000)
  }

  dispose() {
    // this.client.dispose();
    this.statusConnectedRouter.dispose()
    this.pollInterval.close()
  }

  onConfigurationChange() {
    return workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('tikbook')) {
        log.info('<StatusWatchdog> relevant config change received')
        this.checkRouter()
      }
    })
  }
  /*
  triggerError(error) {
    this.state = 'error'
    this.lastStatusMessage = error
    this.setStatusBar(this.toolTipStyles.error)
    // this.checkRouter();
  }

  triggerWarning(error) {
    this.state = 'warning'
    this.lastStatusMessage = error
    this.setStatusBar(this.toolTipStyles.warning)
  }

   triggerInFlight(msg) {
    this.state = 'inflight'
    this.lastStatusMessage = msg
    this.setStatusBar(this.toolTipStyles.inflight)
  }
  */

  triggerUpdate(state, msg) {
    this.state = state
    this.lastStatusMessage = msg
    this.setStatusBar(this.toolTipStyles[state])
  }

  toolTipStyles = {
    error: {
      backgroundColor: new ThemeColor('statusBarItem.errorBackground'),
      color: new ThemeColor('statusBarItem.errorForeground'),
    },
    warning: {
      backgroundColor: new ThemeColor('statusBarItem.errorBackground'),
      color: new ThemeColor('statusBarItem.errorForeground'),
    },
    inflight: {
      backgroundColor: new ThemeColor('statusBarItem.warningBackground'),
      color: new ThemeColor('statusBarItem.warningForeground'),
    },
    normal: {},
    none: {},
  }

  setStatusBar(style) {
    this.lastUpdate = DateTime.now()
    this.statusConnectedRouter.text = `$(mikrotik-icon-line) ${this.lastRouterName} `
    this.statusConnectedRouter.tooltip = this.getStatusMarkdown() // new MarkdownString(`__status__ **${statusText}**\n\n__check__ ${this.lastUpdate.toLocaleString(DateTime.DATETIME_SHORT)}\n\n__url__ \`${this.client.settings.baseUrl}\` `, true);
    this.statusConnectedRouter.backgroundColor = style.backgroundColor
    this.statusConnectedRouter.color = style.color
    this.statusConnectedRouter.show()
  };

  getStatusMarkdown() {
    let mdStatus = ''
    mdStatus += `# ${this.lastRouterName}\n`
    const url = URL.parse(this.client.settings.baseUrl)
    url.username = this.client.settings.username
    mdStatus += `#### ${url}\n`
    if (this.lastRouterResources) {
      mdStatus += `| | |\n| ---: | :--- |\n`
      Object.keys(this.lastRouterResources).map(e => `| **${e}**: | ${this.lastRouterResources[e]}|`).forEach(t => mdStatus += `${t}\n`)
    }
    if (this.state !== 'normal') {
      mdStatus += `### **${this.state.toUpperCase()}**\n`
      mdStatus += `\`\`\`${this.lastStatusMessage}\`\`\`\n`
    }
    mdStatus += `\n_last updated ${this.lastUpdate.toLocaleString(DateTime.DATETIME_SHORT)}_\n`
    return new MarkdownString(mdStatus)
  }

  async onReconfigureCommand() {
    await this.checkRouter()
    commands.executeCommand('tikbook.show.menu.main')
  }

  async syncLspConnectionUrl() {
    const { baseUrl, username, password } = getSettings()
    commands.executeCommand('routeroslsp.server.useConnectionUrl', baseUrl, username, (await SecretManager.default.getPassword()) || password)
    log.info(`<StatusWatchdog> updating RouterOS LSP to use TikBook connection info: ${baseUrl}`)
  }

  async checkRouter() {
    log.debug('<StatusWatchdog> checking router...')
    this.lastUpdate = DateTime.now()
    try {
      this.lastRouterName = await this.client.getIdentity()
      this.lastRouterResources = await this.client.getSystemResources()
      this.triggerUpdate('normal', 'Router connection check successful')
      this.syncLspConnectionUrl()
      log.info('<StatusWatchdog> check was successful for ', this.lastRouterName)
    }
    catch (e) {
      this.triggerUpdate('error', e)
      log.error('<StatusWatchdog> check failed to ', this.lastRouterName)
    }
  };
}
