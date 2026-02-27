import type { Disposable } from 'vscode';
import * as vscode from 'vscode';
import { commands, env, window } from 'vscode';
import { log } from './shared';

export function initializeConverters(): Disposable[] {
  return [
    commands.registerCommand('tikbook.fn.copyJsonAsRouterArray', async () => {
      const editor = window.activeTextEditor
      if (!editor) {
        const msg = 'JSON to RouterOS array needs a JSON document as source'
        void window.showWarningMessage(msg)
        log.info(`[tikbook.fn.copyJsonAsRouterArray] called but found no editor, warned '${msg}'`)
        return
      }
      try {
        await env.clipboard.writeText(
          routerosArrayFromJson(
            JSON.parse(
              editor.document.getText(
                editor.selection.isEmpty ? undefined : editor.selection,
              ),
            ),
          ),
        )
        const msg = 'RouterOS array copied to clipboard from JSON'
        void window.showInformationMessage(msg)
        log.debug(`[tikbook.fn.copyJsonAsRouterArray] notified user '${msg}'`)
      }
      catch {
        const msg = 'Invalid JSON cannot be copied as RouterOS array'
        void window.showWarningMessage(msg)
        log.warn(`[tikbook.fn.copyJsonAsRouterArray] warned user '${msg}'`)
      }
    }),

    commands.registerCommand('tikbook.convert.escapedRouterString.clipboard', async () => {
      const editor = window.activeTextEditor
      if (!editor) {
        const warningMsg = 'Nothing copied. To copy an escaped RouterOS string, some document or selection is needed.'
        void window.showWarningMessage(warningMsg)
        log.info(`[tikbook.convert.escapedRouterString.clipboard] warned user '${warningMsg}'`)
        return
      }
      // try {
      await env.clipboard.writeText(
        escapeRouterString(
          editor.document.getText(
            editor.selection.isEmpty ? undefined : editor.selection,
          ),
        ),
      )
      const msg = 'RouterOS array copied to clipboard'
      void window.showInformationMessage(msg)
      log.debug(`[tikbook.convert.escapedRouterString.clipboard] notified user '${msg}'`)
      /* }
      catch (error) {
        const msg = `Invalid JSON cannot be copied as RouterOS array.\nGot exception ${error?.cause}`
        window.showWarningMessage(msg)
        log.warn(`[tikbook.convert.escapedRouterString.clipboard] got exception and warned user '${msg}'`, error)
      } */
    }),

    commands.registerCommand('tikbook.convert.escapedRouterString', async () => {
      const editor = window.activeTextEditor
      if (!editor) {
        const warningMsg = 'Nothing to convert. To escape a RouterOS string, open a document or make a selection.'
        void window.showWarningMessage(warningMsg)
        log.info(`[tikbook.convert.escapedRouterString] warned user '${warningMsg}'`)
        return
      }
      const text = editor.document.getText(
        editor.selection.isEmpty ? undefined : editor.selection,
      )
      const escaped = escapeRouterString(text)
      await editor.edit(editBuilder => {
        if (editor.selection.isEmpty) {
          editBuilder.replace(new vscode.Range(0, 0, editor.document.lineCount, 0), escaped)
        } else {
          editBuilder.replace(editor.selection, escaped)
        }
      })
      log.debug(`[tikbook.convert.escapedRouterString] escaped ${text.length} chars in-place`)
    }),

    commands.registerCommand('tikbook.convert.routerString.clipboard', async () => {
      const editor = window.activeTextEditor
      if (!editor) {
        const warningMsg = 'Nothing to convert. To unescape a RouterOS string, open a document or make a selection.'
        void window.showWarningMessage(warningMsg)
        log.info(`[tikbook.convert.routerString.clipboard] warned user '${warningMsg}'`)
        return
      }
      await env.clipboard.writeText(
        unescapeRouterString(
          editor.document.getText(
            editor.selection.isEmpty ? undefined : editor.selection,
          ),
        ),
      )
      const msg = 'Unescaped RouterOS string copied to clipboard'
      void window.showInformationMessage(msg)
      log.debug(`[tikbook.convert.routerString.clipboard] notified user '${msg}'`)
    }),

    commands.registerCommand('tikbook.convert.routerString', async () => {
      const editor = window.activeTextEditor
      if (!editor) {
        const warningMsg = 'Nothing to convert. To unescape a RouterOS string, open a document or make a selection.'
        void window.showWarningMessage(warningMsg)
        log.info(`[tikbook.convert.routerString] warned user '${warningMsg}'`)
        return
      }
      const text = editor.document.getText(
        editor.selection.isEmpty ? undefined : editor.selection,
      )
      const unescaped = unescapeRouterString(text)
      await editor.edit(editBuilder => {
        if (editor.selection.isEmpty) {
          editBuilder.replace(new vscode.Range(0, 0, editor.document.lineCount, 0), unescaped)
        } else {
          editBuilder.replace(editor.selection, unescaped)
        }
      })
      log.debug(`[tikbook.convert.routerString] unescaped ${text.length} chars in-place`)
    }),
  ]
}

// MARK: escape rsc

export function escapeRouterString(text: string): string {
  if (typeof text !== 'string') {
    throw new TypeError('Input must be a string')
  }

  let result = ''

  for (const char of text) {
    const charCode = char.charCodeAt(0)

    // Handle specific characters that need escaping
    switch (char) {
      case '"':
        result += '\\"'
        break
      case '$':
        result += '\\$'
        break
      case '\\':
        result += '\\\\'
        break
      default:
        // Handle control characters and non-printable characters
        if (charCode < 0x20 || charCode === 0x7F || charCode > 0x7F) {
          // Convert to hex escape sequence
          switch (char) {
            case '\n':
            case '\t':
            case '\r':
              result += char
              break
            default:
              result += `\\${charCode.toString(16).toUpperCase().padStart(2, '0')}`
          }
        }
        else {
          // Regular printable ASCII character, no escaping needed
          result += char
        }
        break
    }
  }

  return result
}

// MARK: unescape rsc

export function unescapeRouterString(text: string): string {
  if (typeof text !== 'string') {
    throw new TypeError('Input must be a string')
  }

  let result = ''
  let i = 0

  while (i < text.length) {
    if (text[i] === '\\' && i + 1 < text.length) {
      const nextChar = text[i + 1]
      
      // Handle standard escape sequences
      switch (nextChar) {
        case '"':
          result += '"'
          i += 2
          break
        case '$':
          result += '$'
          i += 2
          break
        case '\\':
          result += '\\'
          i += 2
          break
        case 'n':
          result += '\n'
          i += 2
          break
        case 't':
          result += '\t'
          i += 2
          break
        case 'r':
          result += '\r'
          i += 2
          break
        default:
          // Handle hex escape sequences (\XX)
          if (i + 2 < text.length) {
            const hexCode = text.substring(i + 1, i + 3)
            const charCode = parseInt(hexCode, 16)
            if (!isNaN(charCode)) {
              result += String.fromCharCode(charCode)
              i += 3
            } else {
              // Not a valid hex escape, keep the backslash
              result += text[i]
              i += 1
            }
          } else {
            // Backslash at end of string or not enough chars for hex
            result += text[i]
            i += 1
          }
          break
      }
    } else {
      result += text[i]
      i += 1
    }
  }

  return result
}

// MARK: json2rsc

export function routerosArrayFromJson(data: string | boolean | number | object): string {
  // Handle null or undefined values
  if (data === null || typeof data === 'undefined') {
    return '[:nothing]'
  }

  // Handle primitive types
  if (typeof data === 'string') {
    // Escape double quotes and backslashes in strings
    const escapedString = escapeRouterString(data)// data.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    return `"${escapedString}"`
  }
  if (typeof data === 'number') {
    if (Number.isInteger(data) && data > 0) {
      return data.toString()
    }
    else {
      return `"${data.toString()}"`
    }
  }
  if (typeof data === 'boolean') {
    return data ? 'true' : 'false'
  }

  // Handle arrays
  if (Array.isArray(data)) {
    const elements = data.map(item => routerosArrayFromJson(item)).join(';')
    return `{${elements}}`
  }

  // Handle objects (the main recursive part)
  if (typeof data === 'object') {
    const keys = Object.keys(data)
    if (keys.length === 0) {
      return '[:toarray ""]'
    }

    const keyValuePairs = keys.map((key: string) => {
      // MikroTik keys can't have spaces or special characters without quoting
      // const formattedKey = key.includes(' ') || key.includes('=') || key.includes(';') ? `"${key}"` : key;
      const value = routerosArrayFromJson((data as Record<string, string | number | boolean | object>)[key])
      return `"${key}"=${value}`
    })

    return `{${keyValuePairs.join(';')}}`
  }

  // Fallback for any other unhandled type
  return '""'
}
