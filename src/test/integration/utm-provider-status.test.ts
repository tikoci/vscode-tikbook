// MOVED FROM unit/ to integration/ (2026-02-27)
// Integration test: UTM/AppleScript status mapping

import { strict as assert } from 'node:assert'
import { mapUTMStatusToVMStatus } from '../../../src/vm-providers/utm-provider'

suite.skip('UTM Provider Status Mapping', () => {
	test('maps started to running', () => {
		assert.strictEqual(mapUTMStatusToVMStatus('started'), 'running')
	})

	test('maps stopped to stopped', () => {
		assert.strictEqual(mapUTMStatusToVMStatus('stopped'), 'stopped')
	})

	test('maps paused and suspended to paused', () => {
		assert.strictEqual(mapUTMStatusToVMStatus('paused'), 'paused')
		assert.strictEqual(mapUTMStatusToVMStatus('suspended'), 'paused')
	})

	test('maps transitional states to unknown', () => {
		assert.strictEqual(mapUTMStatusToVMStatus('starting'), 'unknown')
		assert.strictEqual(mapUTMStatusToVMStatus('stopping'), 'unknown')
		assert.strictEqual(mapUTMStatusToVMStatus('resuming'), 'unknown')
	})

	test('maps unexpected values to unknown', () => {
		assert.strictEqual(mapUTMStatusToVMStatus(''), 'unknown')
		assert.strictEqual(mapUTMStatusToVMStatus('garbage'), 'unknown')
	})
})
