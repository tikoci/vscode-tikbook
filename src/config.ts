import type { Disposable, Event, ExtensionContext } from 'vscode';
import { commands, ConfigurationTarget, EventEmitter, window, workspace } from 'vscode';
import { log } from './shared';

interface TikbookSettings {
  username: string
  password: string
  baseUrl: string
  apiTimeout: number
  sshCommand: string
  provideLspServerCredentials?: boolean
  checkCertificates: boolean
}

export function getSettings(): TikbookSettings {
  const vsconf = workspace.getConfiguration('tikbook', null)
  return {
    username: vsconf.get('username') ?? 'admin',
    password: vsconf.get('password') ?? '',
    baseUrl: vsconf.get('baseUrl') ?? 'http://192.168.88.1',
    apiTimeout: vsconf.get('apiTimeout') ?? 15,
    sshCommand: vsconf.get('sshCommand') ?? 'ssh',
    provideLspServerCredentials: vsconf.get('provideLspServerCredentials'),
    checkCertificates: vsconf.get('checkCertificates') ?? false,
  }
}

export function getConnectionUrlString(): string {
  const settings = getSettings()
  const url = URL.parse(settings.baseUrl)
  if (url) {
    url.username = settings.username
    return `${url.protocol}//${url.username}@${url.host}`
  }
  else {
    return ''
  }
}

export class SecretManager {
  static readonly SECRET_KEY = 'tikbook.password.default'
  private context: ExtensionContext
  private keyname: string
  private disposables: Disposable[] = []

  private _onSecretChange = new EventEmitter<string>()
  public readonly onSecretChange: Event<string> = this._onSecretChange.event

  static default: SecretManager
  static start(context: ExtensionContext): SecretManager {
    SecretManager.default = new SecretManager(context, SecretManager.SECRET_KEY)
    return SecretManager.default
  }

  constructor(context: ExtensionContext, keyname: string) {
    this.context = context
    this.keyname = keyname
    log.trace('<SecretManager> {constructor} registering listeners')
    this.disposables.push(this.context.secrets.onDidChange(async (e) => {
      if (e.key === this.keyname) await this.updatePasswordStatus()
    }))
    void this.updatePasswordStatus()
    this.disposables.push(workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('tikbook.passwordInfo')) {
        log.debug('<SecretManager> {onDidChangeConfiguration} use edited status, should replaced')
        void this.updatePasswordStatus()
      }
    }))
  }

  async initialize(): Promise<void> {
    await this.updatePasswordStatus()
  }

  dispose(): void {
    log.trace('<SecretManager> {dispose} invoked')
    this.disposables.forEach(e => e.dispose())
    this._onSecretChange.dispose()
  }

  async setPassword(back?: string): Promise<void> {
    const password = await window.showInputBox({
      prompt: 'Enter password for RouterOS',
      password: true,
      placeHolder: `Password for ${getSettings().baseUrl}`,
      ignoreFocusOut: true,
    })

    if (password) {
      await this.context.secrets.store(SecretManager.SECRET_KEY, password)
      await this.updatePasswordStatus()
      const msg = 'Saved. Password using secret in SecretStore'
      void window.showInformationMessage(msg)
      log.info(`<SecretManager> {setPassword} called and notified ${msg}`)
    }
    if (back) {
      log.trace('<SecretManager> returning back to menu', back)
      void commands.executeCommand(back)
    }
  }

  async clearPassword(back?: string): Promise<void> {
    await this.context.secrets.delete(SecretManager.SECRET_KEY)
    await this.updatePasswordStatus()
    const msg = 'Cleared. Password using plain text from Settings'
    void window.showWarningMessage(msg)
    log.warn(`<SecretManager> {clearPassword} called and warned user '${msg}'`)
    if (back) {
      void commands.executeCommand(back)
    }
  }

  async getPassword(): Promise<string | undefined> {
    return this.context.secrets.get(SecretManager.SECRET_KEY)
  }

  private async updatePasswordStatus(): Promise<void> {
    const config = workspace.getConfiguration('tikbook')
    const hasPassword = !!(await this.getPassword())
    await commands.executeCommand('setContext', 'tikbook.usingSecrets', hasPassword)
    // Update the readonly setting to show current status
    await config.update(
      'passwordInfo',
      hasPassword
        ? '✓ Password using secret in SecretStore'
        : '⚠ Password using plain text from Settings',
      ConfigurationTarget.Global)
  }
}
