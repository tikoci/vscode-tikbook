import { window, LogLevel } from 'vscode'

export const Extension = {
  shortName: 'TikBook',
  name: 'TikBook for RouterOS',
}

export const log = window.createOutputChannel(Extension.name, { log: true })
log.info(`<shared> Logging started on ${log.name} at level ${log.logLevel}`)

export function initializeLogging() {
  return [
    log.onDidChangeLogLevel(e => log.info(`<shared> Log level changed to ${LogLevel[e]}`)),
  ]
}

// export const EventEmitter = VSCodeEventEmitter
// export type Event<T> = VSCodeEvent<T>

/*
export function showNotificationAndLog(level: 'warn' | 'info' | 'error', message: string, ...items: any[]) {
  switch (level) {
    case 'info':
      window.showInformationMessage(message, ...items)
      log.debug(`Notified user ${message} with ${items.length} items`)
      break
    case 'warn':
      window.showWarningMessage(message, ...items)
      log.info(`Warned user ${message} with ${items.length} items`)
      break
    case 'error':
      window.showErrorMessage(message, ...items)
      log.info(`Error notification displayed '${message}' with ${items.length} items`)
      break
  }
}
*/
