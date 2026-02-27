import { strict as assert } from 'assert'
import { escapeRouterString, routerosArrayFromJson } from '../../../src/converters'

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

  test('should escape non-printable characters', () => {
    const input = `A${String.fromCharCode(1)}B`
    const expected = 'A\\01B'
    assert.equal(escapeRouterString(input), expected)
  })
})

suite('JSON to RouterOS array', () => {
  test('should map null and undefined to :nothing', () => {
    assert.equal(routerosArrayFromJson(null as unknown as object), '[:nothing]')
    assert.equal(routerosArrayFromJson(undefined as unknown as object), '[:nothing]')
  })

  test('should handle strings and booleans', () => {
    assert.equal(routerosArrayFromJson('hello'), '"hello"')
    assert.equal(routerosArrayFromJson(true), 'true')
    assert.equal(routerosArrayFromJson(false), 'false')
  })

  test('should handle numbers with RouterOS rules', () => {
    assert.equal(routerosArrayFromJson(5), '5')
    assert.equal(routerosArrayFromJson(0), '"0"')
    assert.equal(routerosArrayFromJson(-2), '"-2"')
    assert.equal(routerosArrayFromJson(1.5), '"1.5"')
  })

  test('should handle arrays', () => {
    const input = [1, 'a', true]
    assert.equal(routerosArrayFromJson(input), '{1;"a";true}')
  })

  test('should handle empty and nested objects', () => {
    assert.equal(routerosArrayFromJson({}), '[:toarray ""]')
    const input = { name: 'eth0', config: { enabled: true } }
    assert.equal(routerosArrayFromJson(input), '{"name"="eth0";"config"={"enabled"=true}}')
  })
})
