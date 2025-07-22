import { commands, ExtensionContext, extensions, MarkdownString, StatusBarAlignment, StatusBarItem, ThemeColor, window, workspace } from 'vscode'
import { RouterRestClient } from './routeros'
import { DateTime, Duration } from 'luxon'
import { log } from './shared'
import { getConnectionUrlString, getSettings, SecretManager } from './config'
import { AxiosError } from 'axios'

type StatusStates = 'none' | 'error' | 'http error' | 'inflight' | 'normal'
export class StatusWatchdog {
  statusConnectedRouter: StatusBarItem
  lastUpdate = DateTime.now()
  client: RouterRestClient
  lastRouterName = ' ... '
  state: StatusStates = 'none'
  static command = 'tikbook.cmd.connected-router.configure'
  pollInterval
  lastRouterResources: Record<string, unknown> | undefined
  lastStatusMessage: string | AxiosError | undefined
  lastLspConnectionUrl: string | undefined
  toolTipStyles = {
    'error': {
      backgroundColor: new ThemeColor('statusBarItem.errorBackground'),
      color: new ThemeColor('statusBarItem.errorForeground'),
    },
    'http error': {
      backgroundColor: new ThemeColor('statusBarItem.errorBackground'),
      color: new ThemeColor('statusBarItem.errorForeground'),
    },
    'inflight': {
      backgroundColor: new ThemeColor('statusBarItem.warningBackground'),
      color: new ThemeColor('statusBarItem.warningForeground'),
    },
    'normal': {},
    'none': {},
  }

  // MARK: ctor

  constructor(context: ExtensionContext) {
    this.client = RouterRestClient.default
    context.subscriptions.push(
      commands.registerCommand(StatusWatchdog.command, () => this.onClick()),
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
        this.triggerUpdate('http error', e)
      }),
      RouterRestClient.default.onHttpRequestSuccess(e => this.triggerUpdate('inflight', `${e.method?.toUpperCase()} ${e.url}`)),
      RouterRestClient.default.onHttpResponseSuccess(e => this.triggerUpdate('normal', e.statusText)),
    )
    this.triggerUpdate('none', 'Initializing...')
    setTimeout(() => this.checkRouter(), 1000)

    // MARK: polling loop
    this.pollInterval = setInterval(() => {
      if (this.state != 'normal') this.checkRouter()
      // if okay check at twice the timeout, if error polling happens same as timeout ms
      if (this.lastUpdate.diffNow() > Duration.fromMillis(0 - (getSettings().apiTimeout * 1000 * 2 + 1000))) this.checkRouter()
    }, (getSettings().apiTimeout * 1000) + 1000)
  }

  dispose() {
    // this.client.dispose();
    this.statusConnectedRouter.dispose()
    this.pollInterval.close()
  }

  // MARK: config chg

  onConfigurationChange() {
    return workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('tikbook')) {
        log.info('<StatusWatchdog> relevant config change received')
        if (e.affectsConfiguration('tikbook.provideLspServerCredentials')) {
          if (workspace.getConfiguration('tikbook').get('provideLspServerCredentials') === false) {
            commands.executeCommand<boolean>('routeroslsp.server.clearConnectionUrl').then(
              dirty => log.info(`<StatusWatchdog> sent LSP [routeroslsp.server.clearConnectionUrl] successfully (dirty=${dirty})`),
              error => log.warn(`<StatusWatchdog> {onConfigurationChange} calling [routeroslsp.server.clearConnectionUrl] got exception`, error),
            )
          }
        }
        this.checkRouter()
      }
    })
  }

  // MARK: status bar

  triggerUpdate(state: StatusStates, msg: string | AxiosError) {
    this.state = state
    if (typeof msg === 'object') msg = getTextFromError(msg)
    if (msg) this.lastStatusMessage = msg
    this.setStatusBar(this.toolTipStyles[state])
  }

  setStatusBar(style: { color?: ThemeColor, backgroundColor?: ThemeColor }) {
    this.lastUpdate = DateTime.now()
    this.statusConnectedRouter.text = `$(mikrotik-icon-line) ${this.lastRouterName} `
    this.statusConnectedRouter.tooltip = this.getStatusMarkdown() // new MarkdownString(`__status__ **${statusText}**\n\n__check__ ${this.lastUpdate.toLocaleString(DateTime.DATETIME_SHORT)}\n\n__url__ \`${this.client.settings.baseUrl}\` `, true);
    this.statusConnectedRouter.backgroundColor = style.backgroundColor
    this.statusConnectedRouter.color = style.color
    this.statusConnectedRouter.show()
  };

  getStatusMarkdown() {
    let mdStatus = ''
    mdStatus += `## RouterOS \`${this.lastRouterName}\`\n`
    const url = getConnectionUrlString()
    if (url) {
      mdStatus += `TikBook using **${url.toString()}**\n\n`
      if (this.lastLspConnectionUrl) {
        mdStatus += `RouterOS LSP using **${this.lastLspConnectionUrl}**\n\n`
      }
      mdStatus += `\n`
      if (this.lastRouterResources) {
        mdStatus += `### System Resources\n`
        mdStatus += `| | |\n| ---: | :--- |\n`
        Object.keys(this.lastRouterResources!)
          .map(e => `| **${e}**: | ${this.lastRouterResources![e]}|`)
          .forEach(t => mdStatus += `${t}\n`)
      }
    }
    else {
      mdStatus += `### **INVALID SETTINGS**\n`
      mdStatus += `Setting \`baseUri\` is not valid.  RouterOS device must be configured and online for many features.\n\n`
    }
    if (this.state !== 'normal') {
      mdStatus += `### **${this.state.toUpperCase()}**\n`
      if (this.lastStatusMessage) {
        mdStatus += `\`\`\`\n${this.lastStatusMessage.toString().replace('`', '\\`')}\n\`\`\`\n\n`
      }
    }
    mdStatus += `\n_last updated ${this.lastUpdate.toLocaleString(DateTime.DATETIME_SHORT)}_\n`
    return new MarkdownString(mdStatus)
  }

  async onClick() {
    this.checkRouter()
    if (this.state == 'normal') commands.executeCommand('tikbook.show.menu.main')
    else commands.executeCommand('tikbook.show.menu.setup')
  }

  // MARK: sync

  async updateLspConnectionUrl() {
    const routeroslspExtension = extensions.getExtension('TIKOCI.lsp-routeros-ts')
    if (routeroslspExtension) {
      commands.executeCommand('routeroslsp.server.getConnectionUrl').then(
        urlString => this.lastLspConnectionUrl = urlString as string,
        error => log.warn(`<StatusWatchdog> {getLspConnectionurl} failed: ${error}`),
      )
    }
  }

  async syncLspConnectionUrl(): Promise<boolean> {
    const { baseUrl, username, password, apiTimeout, provideLspServerCredentials, checkCertificates } = getSettings()
    const routeroslspExtension = extensions.getExtension('TIKOCI.lsp-routeros-ts')
    if (routeroslspExtension) {
      if (provideLspServerCredentials) {
        log.debug(`<StatusWatchdog> {syncLspConnectionUrl} invoked`)
        try {
          return await commands.executeCommand<boolean>('routeroslsp.server.useConnectionUrl',
            'TikBook',
            baseUrl,
            username,
            (await SecretManager.default.getPassword()) || password,
            apiTimeout,
            checkCertificates)
        }
        catch (error) {
          log.warn(`<StatusWatchdog> {syncLspConnectionUrl} exception from [routeroslsp.server.useConnectionUrl] ${JSON.stringify(error)}`)
        }
      }
    }
    else {
      log.warn(`<StatusWatchdog> {syncLspConnectionUrl} RouterOS LSP Extension not found`)
    }
    return false
  }

  // MARK: check

  async checkRouter() {
    log.debug('<StatusWatchdog> checking router...')
    this.lastUpdate = DateTime.now()
    try {
      this.updateLspConnectionUrl() // background
      const axiosResponse = await this.client.getRawIdentity()
      this.lastRouterName = axiosResponse.data?.name
      if (this.lastRouterName !== null) {
        this.lastRouterResources = await this.client.getSystemResources() as Record<string, unknown>
        this.triggerUpdate('normal', 'Router connection check successful')
        if (await this.syncLspConnectionUrl()) {
          commands.executeCommand('routeroslsp.cmd.testConnection')
        }
        log.info('<StatusWatchdog> check was successful for ', this.lastRouterName)
      }
      else {
        this.lastRouterResources = undefined
        this.triggerUpdate('error', 'Failed to get RouterOS name (/system/identity)\n\n${')
      }
    }
    catch {
      this.lastRouterResources = undefined
      log.error('<StatusWatchdog> check failed to ', getConnectionUrlString())
    }
  }
}

export function getTextFromError(error: { code?: string, message?: string, status?: number, name?: string, toString?: () => string }) {
  let errText = ''
  if (error.code && error.message) {
    switch (error.code) {
      case 'ECONNABORTED': {
        errText += `${error.code} No response (${error.message})`
        break
      }
      case 'HOSTDOWN': {
        errText += `${error.code} No response (${error.message})`
        break
      }
      case 'ECONNREFUSED': {
        errText += `${error.code} Perhaps wrong port number/protocol in Base Url? Or, firewall blocking? (${error.message})`
        break
      }
      case 'ERR_TLS_CERT_ALTNAME_INVALID': {
        errText += `${error.code} Perhaps disable 'Check Certificates' in Settings? (${error.message})`
        break
      }
      case 'ERR_BAD_REQUEST': {
        if (error.status) {
          switch (error.status) {
            case 401: {
              errText += `HTTP error ${error.status} - username or password are wrong`
              break
            }
            case 404: {
              errText += `HTTP error ${error.status} - either hostname is wrong or an additional path is bad.`
              break
            }
            default:
              errText += `HTTP unknown error ${error.status} ${error.code} ${error.message} )`
              break
          }
          break
        }
        break
      }
      default:
        errText += `${error.message} (${error.code})`
    }
  }
  else if (error.message) {
    errText += `${error.message} ${error.name ? `(${error.name})` : ''}`
  }
  else {
    errText += error.toString ? error.toString() : 'Unknown error without data'
  }
  return errText
}
