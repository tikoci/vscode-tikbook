/**
 * RouterOS CHR metadata extraction and filtering utilities.
 *
 * CHR VMs can be identified by:
 * 1. VM name pattern (e.g., "CHR-7.21.3")
 * 2. UTC configuration metadata (if available)
 * 3. Description field in VM properties
 * 4. Known mikropkl image signatures
 *
 * This module provides utilities to detect and extract CHR-specific metadata
 * from VMs across different hypervisors.
 */

import * as semver from 'semver'
import { log } from '../shared'
import type { CHRMetadata, VM } from './vm-provider'

/**
 * Heuristic-based CHR VM detection from name and properties.
 *
 * Pattern matching for common CHR VM naming conventions:
 * - "CHR-X.Y.Z" (common in mikropkl)
 * - "RouterOS-X.Y.Z-CHR" (RouterOS official)
 * - "chr_X_Y_Z" (variations)
 * - VMs with "CHR" in name
 * - Test: Check if name contains RouterOS version pattern
 *
 * This is a heuristic—accurate metadata comes from VM properties if available.
 */
export function createCHRVMFilter(_includeUnknown = false): (vm: VM) => boolean {
  return (vm: VM) => {
    // Already has CHR metadata
    if (vm.chrMetadata?.isCHR) {
      return true
    }

    // Heuristic: Check name for CHR indicators
    const nameUpper = vm.name.toUpperCase()

    // "CHR" explicitly mentioned
    if (nameUpper.includes('CHR')) {
      return true
    }

    // RouterOS versioning pattern (X.Y or X.Y.Z)
    if (/\d+\.\d+(\.\d+)?/.test(vm.name)) {
      // Some version pattern detected
      // This is a candidate for CHR if nothing else indicates it's not
      // But we're conservative here—only if explicitly marked or has CHR in name

      return false // Don't include bare version patterns
    }

    return false
  }
}

/**
 * Extract CHR metadata from VM name and properties.
 *
 * Returns CHRMetadata if VM appears to be a CHR VM, null otherwise.
 * Metadata completeness depends on what information is available.
 */
export function parseCHRMetadata(vm: VM): CHRMetadata | null {
  try {
    // If VM already has CHR metadata, return/enhance it
    if (vm.chrMetadata?.isCHR) {
      return refineMetadata(vm.chrMetadata, vm.name)
    }

    // Try to detect from name
    const detected = detectFromName(vm.name)
    if (detected) {
      return detected
    }

    return null
  }
  catch (error) {
    log.warn(`<parseCHRMetadata> error parsing ${vm.name}: ${error instanceof Error ? error.message : String(error)}`)
    return null
  }
}

/**
 * Detect CHR metadata from VM name using pattern matching.
 *
 * Patterns:
 * - "CHR-7.21.3" → version=7.21.3
 * - "RouterOS-7.21.3-CHR" → version=7.21.3
 * - "chr_7_21_3_arm64_apple" → version=7.21.3, arch=arm64, backend=apple
 */
function detectFromName(name: string): CHRMetadata | null {
  const patterns = [
    // Pattern: CHR-X.Y.Z or CHR-X.Y.Z-something
    { regex: /^CHR-(\d+\.\d+\.\d+)/i, extract: (match: RegExpMatchArray) => ({ isCHR: true, version: match[1] }) },

    // Pattern: RouterOS-X.Y(.Z)?(rcN)?-CHR
    {
      regex: /^RouterOS-(\d+\.\d+(?:\.\d+)?)(?:rc\d+)?-CHR$/i,
      extract: (match: RegExpMatchArray) => ({ isCHR: true, version: match[1] }),
    },

    // Pattern: chr_X_Y_Z_arch_backend (underscores)
    {
      regex: /^chr_(\d+)_(\d+)_(\d+)_([a-z0-9]+)_([a-z]+)$/i,
      extract: (match: RegExpMatchArray) => ({
        isCHR: true,
        version: `${match[1]}.${match[2]}.${match[3]}`,
        architecture: normalizeArchitecture(match[4]),
        backend: normalizeBackend(match[5]),
      }),
    },

    // Pattern: chr.aarch64.apple.7.21.3 (from mikropkl—less likely in name, but check)
    {
      regex: /^chr\.([a-z0-9]+)\.([a-z]+)\.(\d+\.\d+\.\d+)/i,
      extract: (match: RegExpMatchArray) => ({
        isCHR: true,
        architecture: normalizeArchitecture(match[1]),
        backend: normalizeBackend(match[2]),
        version: match[3],
      }),
    },

    // Fallback: Any name with "CHR" and version pattern
    {
      regex: /CHR.*?(\d+\.\d+\.\d+)/i,
      extract: (match: RegExpMatchArray) => ({ isCHR: true, version: match[1] }),
    },
  ]

  for (const pattern of patterns) {
    const match = name.match(pattern.regex)
    if (match) {
      return pattern.extract(match)
    }
  }

  return null
}

/**
 * Refine metadata by extracting additional info from name if not already present.
 */
function refineMetadata(meta: CHRMetadata, vmName: string): CHRMetadata {
  const refined = { ...meta }

  // If version not detected, try to extract from name
  if (!refined.version) {
    const versionMatch = vmName.match(/(\d+\.\d+\.\d+)/)
    if (versionMatch) {
      refined.version = versionMatch[1]
    }
  }

  // If architecture not detected, try to extract from name
  if (!refined.architecture) {
    const archMatch = vmName.match(/(aarch64|arm64|x86_64|amd64)/i)
    if (archMatch) {
      refined.architecture = normalizeArchitecture(archMatch[1])
    }
  }

  // If backend not detected, try to extract from name
  if (!refined.backend) {
    const backendMatch = vmName.match(/(apple|qemu|hyperv|libvirt)/i)
    if (backendMatch) {
      refined.backend = normalizeBackend(backendMatch[1])
    }
  }

  return refined
}

/**
 * Normalize architecture name to canonical form.
 * Converts: aarch64, arm64, arm, armv8 → aarch64
 * Converts: x86_64, amd64, x64, x86 → x86_64
 */
function normalizeArchitecture(arch: string): string {
  const lower = arch.toLowerCase()

  if (['aarch64', 'arm64', 'arm', 'armv8'].includes(lower)) {
    return 'aarch64'
  }

  if (['x86_64', 'amd64', 'x64', 'x86'].includes(lower)) {
    return 'x86_64'
  }

  return lower
}

/**
 * Normalize backend name to canonical form.
 * Converts: apple, uvm, virtualization → apple
 * Converts: qemu, kvm, libvirt → qemu
 */
function normalizeBackend(backend: string): string {
  const lower = backend.toLowerCase()

  if (['apple', 'uvm', 'virtualization', 'utm'].includes(lower)) {
    return 'apple'
  }

  if (['qemu', 'kvm', 'libvirt', 'hyperv'].includes(lower)) {
    return 'qemu' // Simplified: hyperv goes to qemu for now
  }

  return lower
}

/**
 * Sort CHR VMs by version (newest first).
 */
export function sortCHRVMsByVersion(vms: VM[]): VM[] {
  return vms.sort((a, b) => {
    const versionA = a.chrMetadata?.version
    const versionB = b.chrMetadata?.version

    if (!versionA || !versionB) {
      return 0
    }

    const semverA = semver.coerce(versionA)
    const semverB = semver.coerce(versionB)

    if (!semverA || !semverB) {
      return 0
    }

    return semver.compare(semverB, semverA) // Descending (newest first)
  })
}

/**
 * Filter VMs to only return RouterOS CHR VMs.
 */
export function filterCHRVMs(vms: VM[]): VM[] {
  return vms.filter(vm => vm.chrMetadata?.isCHR)
}
