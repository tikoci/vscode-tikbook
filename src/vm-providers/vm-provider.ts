/**
 * Cross-platform VM provider interface for RouterOS CHR management.
 *
 * Implementations for different platforms:
 * - macOS: UTM (AppleScript-based)
 * - Linux: libvirt/QEMU via virsh (Phase 2)
 * - Windows: Hyper-V or VirtualBox (Phase 3)
 */

export type VMStatus = 'running' | 'stopped' | 'paused' | 'unknown'

export type VMPlatform = 'utm' | 'libvirt' | 'hyperv' | 'virtualbox' | 'vmware'

/**
 * Metadata for a RouterOS CHR VM.
 * Used to identify CHR-specific attributes and FilterableChR VMs from other VMs.
 */
export interface CHRMetadata {
  isCHR: boolean
  version?: string // e.g., "7.21.3"
  architecture?: string // e.g., "aarch64" or "x86_64"
  backend?: string // e.g., "apple" or "qemu"
  createdDate?: Date
}

/**
 * Represents a single virtual machine.
 */
export interface VM {
  id: string // Unique identifier (UUID or name)
  name: string // Display name
  status: VMStatus
  platform: VMPlatform
  memoryMB?: number // Allocated memory
  cpus?: number // vCPU count
  chrMetadata?: CHRMetadata // CHR-specific metadata if applicable
}

/**
 * Extended VM info with network details.
 */
export interface VMWithNetwork extends VM {
  ipAddress?: string // Detected IP address (if available)
  port?: number // Default RouterOS port for platform
}

export interface VMCreateOptions {
  name: string
  chrVersion: string
  downloadUrl: string
  importMethod?: 'url' | 'applescript'
  localBundlePath?: string
}

/**
 * VM provider interface for platform-specific VM operations.
 * All methods are async and should handle errors appropriately.
 */
export interface VMProvider {
  /**
   * Get the platform this provider handles.
   */
  getPlatform(): VMPlatform

  /**
   * Check if this provider is available on the current system.
   * E.g., UTM installed on macOS, libvirt on Linux, etc.
   */
  isAvailable(): Promise<boolean>

  /**
   * Get reason why provider is not available (if isAvailable returns false).
   * Used for helpful error messages.
   */
  getUnavailableReason?(): Promise<string>

  /**
   * List all VMs managed by this provider.
   * Includes all VMs, not just CHR.
   */
  listVMs(): Promise<VM[]>

  /**
   * List only RouterOS CHR VMs (filtered by metadata).
   * Convenience method for CHR-specific operations.
   */
  listCHRVMs(): Promise<VM[]>

  /**
   * Get details for a specific VM by name.
   */
  getVM(name: string): Promise<VM | null>

  /**
   * Get current status of a VM.
   */
  getStatus(name: string): Promise<VMStatus>

  /**
   * Start a VM.
   * @throws Error if VM not found, UTM not running, permission denied, etc.
   */
  startVM(name: string): Promise<void>

  /**
   * Stop a VM gracefully.
   * @param force If true, force shutdown (kill) instead of graceful stop.
   * @throws Error if VM not found or stop fails.
   */
  stopVM(name: string, force?: boolean): Promise<void>

  /**
   * Delete a VM.
   * @throws Error if VM not found or deletion fails.
   */
  deleteVM(name: string): Promise<void>

  /**
   * Try to detect the IP address of a running VM.
   * Uses guest tools, network discovery, or config parsing based on platform.
   * Returns null if IP cannot be detected.
   */
  getVMIPAddress?(name: string): Promise<string | null>

  /**
   * Get available RouterOS CHR versions from remote source (e.g., GitHub mikropkl).
   * Used to populate version selection menus.
   */
  getCHRVersions?(): Promise<string[]>

  /**
   * Create a new CHR VM from a specified version.
   * @param options VM creation options (name, CHR version, download URL)
   * @returns The created VM
   * @throws Error if creation fails
   */
  createVM?(options: VMCreateOptions): Promise<VM>
}

/**
 * Registry for available VM providers.
 * Allows swapping implementations and managing cross-platform support.
 */
export interface VMProviderRegistry {
  /**
   * Register a provider implementation.
   */
  register(provider: VMProvider): void

  /**
   * Get provider for a specific platform.
   */
  getProvider(platform: VMPlatform): VMProvider | null

  /**
   * Get first available provider on current system.
   */
  getAvailableProvider(): Promise<VMProvider | null>

  /**
   * List all available providers on current system.
   */
  getAvailableProviders(): Promise<VMProvider[]>
}
