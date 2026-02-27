import { strict as assert } from 'assert'
import { hasAPI, parseVersion, safeCall } from '../../../src/vscode-compat'

suite('vscode-compat utilities', () => {
  test('parseVersion handles valid version strings', () => {
    const parsed = parseVersion('1.92.3')
    assert.equal(parsed.major, 1)
    assert.equal(parsed.minor, 92)
    assert.equal(parsed.patch, 3)
    assert.equal(parsed.raw, '1.92.3')
  })

  test('parseVersion handles invalid version strings', () => {
    const parsed = parseVersion('vscode-next')
    assert.equal(parsed.major, 1)
    assert.equal(parsed.minor, 78)
    assert.equal(parsed.patch, 0)
    assert.equal(parsed.raw, 'vscode-next')
  })

  test('hasAPI checks property existence', () => {
    const obj = { ready: true }
    assert.equal(hasAPI(obj, 'ready'), true)
    assert.equal(hasAPI(obj, 'missing' as keyof typeof obj), false)
  })

  test('safeCall returns result or fallback', () => {
    const ok = safeCall(() => 42, 0, 'ok')
    const failed = safeCall(() => { throw new Error('boom') }, 7, 'failed')

    assert.equal(ok, 42)
    assert.equal(failed, 7)
  })
})
