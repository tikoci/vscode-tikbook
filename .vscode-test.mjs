import { defineConfig } from '@vscode/test-cli'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// GUI-specific config (NO reporter) for Extension Test Runner compatibility
// Used by: VS Code Extension Test Runner GUI
// For CLI tests with output: Use .vscode-test-cli.mjs (has spec reporter)
export default defineConfig({
  files: 'out/test/**/*.test.js',
  launchArgs: [
    '--user-data-dir', path.resolve(__dirname, '.vscode-test/user-data'),
    '--disable-extensions',
  ],
  mocha: {
    timeout: 60000,
    color: true,
    ui: 'tdd',
  },
})
