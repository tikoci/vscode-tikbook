import { defineConfig } from '@vscode/test-cli'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  files: 'out/test/suite/**/*.test.js',
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
