import * as assert from 'assert'

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode'
import { RouterScriptPreprocessor } from '../routeros'

suite('Extension Test Suite', () => {
  suiteTeardown(() => {
    vscode.window.showInformationMessage('All tests done!')
  })

  test('Sample test', () => {
    assert.strictEqual(-1, [1, 2, 3].indexOf(5))
    assert.strictEqual(-1, [1, 2, 3].indexOf(0))
  })

  test('Restable', () => {
    let pp = (new RouterScriptPreprocessor('/ip/address/print proplist=address')).findRestableCommand()
    pp = (new RouterScriptPreprocessor('/ip address print as-value proplist=address')).findRestableCommand()
    console.log(pp)
    // assert.equal(pp, false)
  })
})
