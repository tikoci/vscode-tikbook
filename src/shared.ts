import type { Disposable, LogOutputChannel } from 'vscode';
import { LogLevel, window } from 'vscode';

export const Extension = {
  shortName: 'TikBook',
  name: 'TikBook for RouterOS',
}

/**
 * Create output channel with logging support, falling back to regular output if unavailable
 */
function createLogChannel(name: string): LogOutputChannel {
  try {
    // Try to create with logging support (1.74.0+)
    return window.createOutputChannel(name, { log: true })
  } catch {
    // Fallback for older versions - cast to LogOutputChannel for compatibility
    return window.createOutputChannel(name) as LogOutputChannel
  }
}

export const log = createLogChannel(Extension.name)
log.info(`<shared> Logging started on ${log.name} at level ${log.logLevel}`)

export function initializeLogging(): Disposable[] {
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
