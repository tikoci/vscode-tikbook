import { window, EventEmitter as VSCodeEventEmitter, Event as VSCodeEvent, LogLevel } from 'vscode'

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

export const EventEmitter = VSCodeEventEmitter
export type Event<T> = VSCodeEvent<T>

export function showNotificationAndLog(level: 'warn' | 'info' | 'error', message, ...items) {
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
/*

// ROUTEROS MODULE STUB FOR RUNNING WITHOUT 'vscode' IMPORT

// import  { window, EventEmitter as VSCodeEventEmitter, Event as VSCodeEvent } from 'vscode';
import * as nodeEvents from 'node:events';

// avoid using vscode in routeros.ts to keep "cross platform" (i.e. outside of VSCode)
//export const EventEmitter = VSCodeEventEmitter;
//export type Event<T> = VSCodeEvent<T>
export interface Disposable {
    [Symbol.dispose](): void;
}

export type Event<T> = (listener: (e: T) => any, thisArgs?: any, disposables?: Disposable[]) => Disposable;

export class EventEmitter<T> {
    event: Event<T>;
    fire(data: T): void { }
    dispose(): void {}
  }

export const log = console;
log.info("Logging started");
*/
