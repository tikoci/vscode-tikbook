import { commands, ThemeIcon, window } from 'vscode'
import { getSettings } from './config'
import { log } from './shared'

export function initializeSSH() {
  log.debug(`<SSH> {initalizeSSH}`)
  return [
    commands.registerCommand('tikbook.open.terminal.router', _ => openTerminalRouter(_)),
  ]
}

export function openTerminalRouter(_) {
  const settings = getSettings()
  const url = URL.parse(settings.baseUrl)
  const connuri = `${settings.username}@${url.hostname}`
  const terminal = window.createTerminal({
    name: `ssh ${connuri}`,
    iconPath: new ThemeIcon('mikrotik-icon-line'),
  })
  log.info(`<SSH> {openTerminalRouter} ${settings.sshCommand} ${connuri}`)
  terminal.sendText(`${settings.sshCommand} ${connuri}`)
  terminal.show(false)
}
