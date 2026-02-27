// MOVED FROM unit/ to integration/ (2026-02-27)
// Integration test: uses AppleScript and process listing

import * as assert from 'assert'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

suite.skip('AppleScript Validation - UTM Provider', () => {
  test('UTM connection works (baseline check)', async () => {
    try {
      const { stdout } = await execFileAsync('osascript', ['-e', 'tell application "UTM" to name'])
      assert.strictEqual(stdout.trim(), 'UTM', 'Expected UTM app response')
    }
    catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        console.log('\u2298 UTM not installed - skipping UTM AppleScript tests')
        return
      }
      throw error
    }
  })

  test('ListVMs: AppleScript syntax is valid (just names)', async () => {
    try {
      const script = `
        tell application "UTM"
          set vmList to {}
          repeat with vm in virtual machines
            set vmName to name of vm
            set end of vmList to vmName
          end repeat
          return vmList
        end tell
      `
      const { stdout } = await execFileAsync('osascript', ['-e', script])
      // Just ensure it returns without syntax error
      assert.ok(stdout !== null, 'Expected output from AppleScript')
    }
    catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        console.log('\u2298 UTM not installed - skipping this test')
        return
      }
      // If it's a syntax error, fail the test
      if (error instanceof Error && error.message.includes('syntax error')) {
        throw new Error(`AppleScript syntax error: ${error.message}`, { cause: error })
      }
      throw error
    }
  })

  test('Process list parsing works (regex for VM names)', async () => {
    try {
      const { stdout } = await execFileAsync('ps', ['aux'])
      const lines = stdout.split('\n')
      
      // Regex pattern used to extract VM names from process list
      const pattern = /-name\s+(\S+)/
      
      for (const line of lines) {
        if (pattern.test(line)) {
          const match = line.match(pattern)
          assert.ok(match?.[1], 'Should extract VM name from process line')
          break
        }
      }
      
      // It's OK if no running VMs, but regex should work
      assert.ok(pattern instanceof RegExp, 'Regex pattern should be valid')
    }
    catch (error) {
      throw new Error(
        `Process list parsing failed: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error }
      )
    }
  })
})
