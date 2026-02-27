/**
 * Unit tests for Phase 1: Core VM Provider Framework.
 *
 * Tests cover:
 * - GitHub CHR releases API integration
 * - CHR metadata parsing and filtering
 * - VM Provider interface contract
 */

import { strict as assert } from 'assert'
import * as semver from 'semver'
import { createCHRVMFilter, filterCHRVMs, parseCHRMetadata, sortCHRVMsByVersion } from '../../../src/vm-providers/chr-metadata'
import type { VM } from '../../../src/vm-providers/vm-provider'

suite('Phase 1: VM Provider Framework', () => {
  suite('CHR Metadata Extraction', () => {
    test('parse version from CHR-X.Y.Z format', () => {
      const vm: VM = {
        id: 'chrvm1',
        name: 'CHR-7.21.3',
        status: 'stopped',
        platform: 'utm',
      }

      const meta = parseCHRMetadata(vm)
      assert(meta?.isCHR === true)
      assert.strictEqual(meta?.version, '7.21.3')
    })

    test('parse version from RouterOS-X.Y.Z-CHR format', () => {
      const vm: VM = {
        id: 'ros1',
        name: 'RouterOS-7.14rc2-CHR',
        status: 'stopped',
        platform: 'utm',
      }

      const meta = parseCHRMetadata(vm)
      assert(meta?.isCHR === true)
      assert.strictEqual(meta?.version, '7.14')
    })

    test('handle multipart versions (7.21.3)', () => {
      const vm: VM = { id: 'c2', name: 'CHR-7.21.3', status: 'running', platform: 'utm' }
      const meta = parseCHRMetadata(vm)
      assert.strictEqual(meta?.version, '7.21.3')
    })

    test('return null for non-CHR VMs', () => {
      const vm: VM = { id: 'u1', name: 'Ubuntu-22.04-Desktop', status: 'stopped', platform: 'utm' }
      const meta = parseCHRMetadata(vm)
      assert.strictEqual(meta, null)
    })
  })

  suite('CHR VM Filtering', () => {
    test('filter to CHR VMs only', () => {
      const vms: VM[] = [
        { id: 'c1', name: 'CHR-7.21.3', status: 'running', platform: 'utm', chrMetadata: { isCHR: true, version: '7.21.3' } },
        { id: 'c2', name: 'CHR-7.15.2', status: 'stopped', platform: 'utm', chrMetadata: { isCHR: true, version: '7.15.2' } },
        { id: 'u1', name: 'Ubuntu-22.04', status: 'stopped', platform: 'utm' },
      ]

      const chrVMs = filterCHRVMs(vms)
      assert.strictEqual(chrVMs.length, 2)
    })

    test('create CHR filter function', () => {
      const vms: VM[] = [
        { id: 'c1', name: 'CHR-7.21.3', status: 'stopped', platform: 'utm', chrMetadata: { isCHR: true } },
        { id: 'u1', name: 'Ubuntu-22.04', status: 'stopped', platform: 'utm' },
      ]

      const isCHR = createCHRVMFilter()
      const chrVMs = vms.filter(isCHR)
      assert.strictEqual(chrVMs.length, 1)
    })

    test('sort CHR VMs by version newest first', () => {
      const vms: VM[] = [
        { id: 'a', name: 'CHR-7.20.5', status: 'stopped', platform: 'utm', chrMetadata: { isCHR: true, version: '7.20.5' } },
        { id: 'b', name: 'CHR-7.21.3', status: 'stopped', platform: 'utm', chrMetadata: { isCHR: true, version: '7.21.3' } },
      ]

      const sorted = sortCHRVMsByVersion(vms)
      assert.strictEqual(sorted[0].chrMetadata?.version, '7.21.3')
      assert.strictEqual(sorted[1].chrMetadata?.version, '7.20.5')
    })

    test('semantic version sorting', () => {
      const vms: VM[] = [
        { id: 'a', name: 'CHR-7.15.2', status: 'stopped', platform: 'utm', chrMetadata: { isCHR: true, version: '7.15.2' } },
        { id: 'b', name: 'CHR-7.21.3', status: 'stopped', platform: 'utm', chrMetadata: { isCHR: true, version: '7.21.3' } },
        { id: 'c', name: 'CHR-7.20.5', status: 'stopped', platform: 'utm', chrMetadata: { isCHR: true, version: '7.20.5' } },
      ]

      const sorted = sortCHRVMsByVersion(vms)
      assert.strictEqual(sorted[0].chrMetadata?.version, '7.21.3')
      assert.strictEqual(sorted[1].chrMetadata?.version, '7.20.5')
      assert.strictEqual(sorted[2].chrMetadata?.version, '7.15.2')
    })
  })

  suite('GitHub CHR Releases API', () => {
    test('parse CHR release asset names', () => {
      const pattern = /^(rose\.)?chr\.([^.]+)\.([^.]+)\.(.+)\.utm\.zip$/

      const assets = [
        'chr.aarch64.apple.7.21.3.utm.zip',
        'chr.x86_64.qemu.7.21.3.utm.zip',
        'rose.chr.aarch64.qemu.7.21.3.utm.zip',
      ]

      for (const asset of assets) {
        const match = asset.match(pattern)
        assert(match, `should match: ${asset}`)
      }
    })

    test('extract version from multi-dot strings', () => {
      const versions = ['7.21.3', '7.22rc2', '7.20.8']

      for (const version of versions) {
        const parsed = semver.coerce(version)
        assert(parsed, `should parse: ${version}`)
      }
    })

    test('sort RouterOS versions newest first', () => {
      const versions = ['7.15.2', '7.21.3', '7.20.5']

      const sorted = [...versions].sort((a, b) => {
        const semverA = semver.coerce(a)
        const semverB = semver.coerce(b)
        if (!semverA || !semverB) return 0
        return semver.compare(semverB, semverA)
      })

      assert.strictEqual(sorted[0], '7.21.3')
      assert.strictEqual(sorted[sorted.length - 1], '7.15.2')
    })
  })

  suite('Phase 1 Integration', () => {
    test('chain metadata extraction filtering sorting', () => {
      const vms: VM[] = [
        { id: '1', name: 'CHR-7.20.5', status: 'stopped', platform: 'utm' },
        { id: '2', name: 'Ubuntu-22.04', status: 'stopped', platform: 'utm' },
        { id: '3', name: 'CHR-7.21.3', status: 'running', platform: 'utm' },
      ]

      const withMetadata = vms.map(vm => ({
        ...vm,
        chrMetadata: parseCHRMetadata(vm) ?? undefined,
      }))

      const chrVMs = filterCHRVMs(withMetadata)
      assert.strictEqual(chrVMs.length, 2)

      const sorted = sortCHRVMsByVersion(chrVMs)
      assert.strictEqual(sorted[0].name, 'CHR-7.21.3')
      assert.strictEqual(sorted[1].name, 'CHR-7.20.5')
    })
  })
})
