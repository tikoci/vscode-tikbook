import { defineConfig } from '@vscode/test-cli'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Used by: npm test, npm run test:web
// DO NOT use with Extension Test Runner GUI - use .vscode-test.mjs instead
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
    reporter: path.resolve(__dirname, 'mocha-ai-reporter.cjs'), // Custom reporter with file output
  },
})
