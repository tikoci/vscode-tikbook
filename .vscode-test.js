/* eslint-disable no-undef */
/* eslint-env node */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { defineConfig } = require('@vscode/test-cli')
module.exports = defineConfig({ files: 'out/test/*.test.js' })
