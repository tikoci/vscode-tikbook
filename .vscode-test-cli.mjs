import { defineConfig } from '@vscode/test-cli'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Used by: npm test, npm run test:web
// DO NOT use with Extension Test Runner GUI - use .vscode-test.mjs instead
// By default, only run unit tests. To run integration tests, change files to 'out/test/**/*.test.js' or 'out/test/integration/**/*.test.js'.
export default defineConfig({
  files: 'out/test/unit/**/*.test.js',
  launchArgs: [
    '--user-data-dir', path.resolve(__dirname, '.vscode-test/user-data'),
    '--disable-extensions',
  ],
  mocha: {
    timeout: 60000,
    color: true,
    ui: 'tdd',
    reporter: path.resolve(__dirname, 'tools/mocha-ai-reporter/index.cjs'), // Custom reporter with file output
  },
})
