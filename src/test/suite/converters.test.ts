import { strict as assert } from 'assert'
import { escapeRouterString } from '../../converters'

suite('Basic escaping', () => {
  test('should escape double quotes', () => {
    const input = 'Hello "World"'
    const expected = 'Hello \\"World\\"'
    assert.equal(escapeRouterString(input), expected)
  })

  test('should escape dollar signs', () => {
    const input = 'Price is $100'
    const expected = 'Price is \\$100'
    assert.equal(escapeRouterString(input), expected)
  })

  test('should escape backslashes in paths', () => {
    const input = 'Path: C:\\Users\\Admin'
    const expected = 'Path: C:\\\\Users\\\\Admin'
    assert.equal(escapeRouterString(input), expected)
  })
})

suite('Control characters', () => {
  test('should escape newline and tab characters', () => {
    const input = 'Line 1\nLine 2\tTabbed'
    const expected = 'Line 1\nLine 2\tTabbed'
    assert.equal(escapeRouterString(input), expected)
  })
})

suite('Complex example', () => {
  test('should escape mixed special characters in a complex string', () => {
    const input = 'Config: "interface=eth0" price=$50 path=C:\\config\\file.txt\nNew line here'
    const expected = 'Config: \\"interface=eth0\\" price=\\$50 path=C:\\\\config\\\\file.txt\nNew line here'
    assert.equal(escapeRouterString(input), expected)
  })
})

suite('Edge cases', () => {
  test('should handle empty string', () => {
    assert.equal(escapeRouterString(''), '')
  })

  test('should escape only quotes', () => {
    assert.equal(escapeRouterString('""""'), '\\"\\"\\"\\"')
  })

  test('should escape only dollars', () => {
    assert.equal(escapeRouterString('$$$$'), '\\$\\$\\$\\$')
  })

  test('should escape only backslashes', () => {
    assert.equal(escapeRouterString('\\\\\\\\'), '\\\\\\\\\\\\\\\\')
  })
})
