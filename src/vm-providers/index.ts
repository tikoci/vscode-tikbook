/**
 * VM Providers module.
 * Cross-platform virtual machine management for RouterOS CHR.
 *
 * Exports core interfaces and provider implementations.
 */

export { createCHRVMFilter, parseCHRMetadata } from './chr-metadata'
export { UTMProvider } from './utm-provider'
export type { CHRMetadata, VM, VMPlatform, VMProvider, VMProviderRegistry, VMStatus, VMWithNetwork } from './vm-provider'
export { vmProviderRegistry } from './vm-provider-registry'

