import { commands, ConfigurationTarget, ExtensionContext, window, workspace } from 'vscode'
import { EventEmitter, Event, log } from './shared'

interface TikbookSettings {
  username: string
  password: string
  baseUrl: string
  apiTimeout: number
  sshCommand: string
}

export function getSettings(): TikbookSettings {
  const vsconf = workspace.getConfiguration('tikbook', null)
  return {
    username: vsconf.get('username'),
    password: vsconf.get('password'),
    baseUrl: vsconf.get('baseUrl'),
    apiTimeout: vsconf.get('apiTimeout'),
    sshCommand: vsconf.get('sshCommand'),
  }
}

export class SecretManager {
  static readonly SECRET_KEY = 'tikbook.password.default'
  private context: ExtensionContext
  private keyname: string
  private disposables = []

  private _onSecretChange = new EventEmitter<string>()
  public readonly onSecretChange: Event<string> = this._onSecretChange.event

  static default: SecretManager
  static start(context: ExtensionContext) {
    return SecretManager.default = new SecretManager(context, SecretManager.SECRET_KEY)
  }

  constructor(context: ExtensionContext, keyname: string) {
    this.context = context
    this.keyname = keyname
    this.disposables.push(this.context.secrets.onDidChange(async (e) => {
      if (e.key === this.keyname) await this.updatePasswordStatus()
    }))
    this.updatePasswordStatus()
  }

  dispose() {
    this.disposables.forEach(e => e.dispose())
  }

  async setPassword(back?): Promise<void> {
    const password = await window.showInputBox({
      prompt: 'Enter password for RouterOS',
      password: true,
      placeHolder: `Password for ${getSettings().baseUrl}`,
      ignoreFocusOut: true,
    })

    if (password) {
      await this.context.secrets.store(SecretManager.SECRET_KEY, password)
      await this.updatePasswordStatus()
      const msg = 'TikBook saved a secret with RouterOS password'
      window.showInformationMessage(msg)
      log.info(`<SecretManager> {setPassword} called and notified ${msg}`)
    }
    if (back) {
      log.trace('<SecretManager> returning back to menu', back)
      commands.executeCommand(back)
    }
  }

  async clearPassword(back?): Promise<void> {
    await this.context.secrets.delete(SecretManager.SECRET_KEY)
    await this.updatePasswordStatus()
    const msg = 'Secret password deleted. TikBook now using plain text RouterOS password from Settings'
    window.showWarningMessage(msg)
    log.warn(`<SecretManager> {clearPassword} called and warned user '${msg}'`)
    if (back) {
      commands.executeCommand(back)
    }
  }

  async getPassword(): Promise<string | undefined> {
    return await this.context.secrets.get(SecretManager.SECRET_KEY)
  }

  private async updatePasswordStatus(): Promise<void> {
    const config = workspace.getConfiguration('tikbook')
    const hasPassword = !!(await this.getPassword())
    await commands.executeCommand('setContext', 'tikbook.usingSecrets', hasPassword)
    // Update the readonly setting to show current status
    await config.update('passwordInfo',
      hasPassword ? '✓ Password using secret in SecretStore' : '⚠ Password using plain text from Settings',
      ConfigurationTarget.Global,
    )
  }

  async initialize(): Promise<void> {
    // Set initial status
    await this.updatePasswordStatus()
  }
}
