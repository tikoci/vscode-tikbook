import { commands, window, env } from 'vscode'
import { log } from './shared'

export function initializeConverters() {
  return [
    commands.registerCommand('tikbook.fn.copyJsonAsRouterArray', async () => {
      const editor = window.activeTextEditor
      if (!editor) {
        const msg = 'JSON to RouterOS array needs a JSON document as source'
        window.showWarningMessage(msg)
        log.info(`[tikbook.fn.copyJsonAsRouterArray] called but found no editor, warned '${msg}'`)
        return
      }
      try {
        env.clipboard.writeText(
          routerosArrayFromJson(
            JSON.parse(
              editor.document.getText(
                editor.selection.isEmpty ? undefined : editor.selection,
              ),
            ),
          ),
        )
        const msg = 'RouterOS array copied to clipboard from JSON'
        window.showInformationMessage(msg)
        log.debug(`[tikbook.fn.copyJsonAsRouterArray] notified user '${msg}'`)
      }
      catch {
        const msg = 'Invalid JSON cannot be copied as RouterOS array'
        window.showWarningMessage(msg)
        log.warn(`[tikbook.fn.copyJsonAsRouterArray] warned user '${msg}'`)
      }
    }),
    commands.registerCommand('tikbook.convert.escapedRouterString.clipboard', async () => {
      const editor = window.activeTextEditor
      if (!editor) {
        const msg = 'Nothing copied. To copy an escaped RouterOS string, some document or selection is needed.'
        window.showWarningMessage(msg)
        log.info(`[tikbook.convert.escapedRouterString.clipboard] warned user '${msg}'`)
        return
      }
      try {
        env.clipboard.writeText(
          escapeRouterString(
            editor.document.getText(
              editor.selection.isEmpty ? undefined : editor.selection,
            ),
          ),
        )
        const msg = 'RouterOS array copied to clipboard'
        window.showInformationMessage(msg)
        log.debug(`[tikbook.convert.escapedRouterString.clipboard] notified user '${msg}'`)
      }
      catch (error) {
        const msg = `Invalid JSON cannot be copied as RouterOS array.\nGot exception ${error?.cause}`
        window.showWarningMessage(msg)
        log.warn(`[tikbook.convert.escapedRouterString.clipboard] got exception and warned user '${msg}'`, error)
      }
    }),
  ]
}

/**
* Escapes a plain text string for use in MikroTik RouterOS strings
*
* This function handles the following escape sequences:
* - Double quotes (") are escaped as \"
* - Dollar signs ($) are escaped as \$
* - Backslashes (\) are escaped as \\
* - Control characters (0x00-0x1F, 0x7F-0xFF) are escaped as \XX (hex format)
*
* @param {string} text - The plain text string to escape
* @returns {string} The escaped string suitable for RouterOS
*/
export function escapeRouterString(text) {
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

export function routerosArrayFromJson(data) {
  // Handle null or undefined values
  if (data === null || typeof data === 'undefined') {
    return '[:nothing]'
  }

  // Handle primitive types
  const dataType = typeof data
  if (dataType === 'string') {
    // Escape double quotes and backslashes in strings
    const escapedString = escapeRouterString(data)// data.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    return `"${escapedString}"`
  }
  if (dataType === 'number') {
    if (Number.isInteger(data) && data > 0) {
      return data
    }
    else {
      return `"${data.toString()}"`
    }
  }
  if (dataType === 'boolean') {
    return data ? 'true' : 'false'
  }

  // Handle arrays
  if (Array.isArray(data)) {
    const elements = data.map(item => routerosArrayFromJson(item)).join(';')
    return `{${elements}}`
  }

  // Handle objects (the main recursive part)
  if (dataType === 'object') {
    const keys = Object.keys(data)
    if (keys.length === 0) {
      return '[:toarray ""]'
    }

    const keyValuePairs = keys.map((key) => {
      // MikroTik keys can't have spaces or special characters without quoting
      // const formattedKey = key.includes(' ') || key.includes('=') || key.includes(';') ? `"${key}"` : key;
      const value = routerosArrayFromJson(data[key])
      return `"${key}"=${value}`
    })

    return `{${keyValuePairs.join(';')}}`
  }

  // Fallback for any other unhandled type
  return '""'
}

export function testEscapeRouterString() {
  // Example usage and test cases
  console.log('Testing RouterOS String Escaper:')
  console.log('')

  // Test basic escaping
  console.log('Basic escaping:')
  console.log(`Input: 'Hello "World"'`)
  console.log(`Output: '${escapeRouterString('Hello "World"')}'`)
  console.log('')

  console.log(`Input: 'Price is $100'`)
  console.log(`Output: '${escapeRouterString('Price is $100')}'`)
  console.log('')

  console.log(`Input: 'Path: C:\\\\Users\\\\Admin'`)
  console.log(`Output: '${escapeRouterString('Path: C:\\Users\\Admin')}'`)
  console.log('')

  // Test control characters
  console.log('Control characters:')
  console.log(`Input: 'Line 1\\nLine 2\\tTabbed'`)
  console.log(`Output: '${escapeRouterString('Line 1\nLine 2\tTabbed')}'`)
  console.log('')

  // Test complex string with multiple escape sequences
  console.log('Complex example:')
  const complexString = 'Config: "interface=eth0" price=$50 path=C:\\config\\file.txt\nNew line here'
  console.log(`Input: '${complexString}'`)
  console.log(`Output: '${escapeRouterString(complexString)}'`)
  console.log('')

  // Test edge cases
  console.log('Edge cases:')
  console.log(`Empty string: '${escapeRouterString('')}'`)
  console.log(`Only quotes: '${escapeRouterString('""""')}'`)
  console.log(`Only dollars: '${escapeRouterString('$$$$')}'`)
  console.log(`Only backslashes: '${escapeRouterString('\\\\\\\\')}'`)
}
