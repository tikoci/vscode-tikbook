/**
 * Registry for VM provider implementations.
 * Manages cross-platform provider support and discovery.
 */

import { env } from 'vscode'
import { log } from '../shared'
import type { VMPlatform, VMProvider } from './vm-provider'

/**
 * Global VM provider registry.
 * Provides discovery and lookup for available providers.
 */
class GlobalVMProviderRegistry {
  private providers = new Map<VMPlatform, VMProvider>()

  /**
   * Register a provider implementation.
   */
  register(provider: VMProvider): void {
    const platform = provider.getPlatform()
    this.providers.set(platform, provider)
    log.debug(`<VMProviderRegistry.register> registered ${platform} provider`)
  }

  /**
   * Get provider for specific platform.
   */
  getProvider(platform: VMPlatform): VMProvider | null {
    return this.providers.get(platform) ?? null
  }

  /**
   * Get first available provider on current system.
   * Checks providers in order: platform-specific first.
   */
  async getAvailableProvider(): Promise<VMProvider | null> {
    const providers = Array.from(this.providers.values())

    // Prioritize platform-specific providers
    // UTM should be checked on macOS (env.appHost check)
    // For Linux/Windows, let providers' own isAvailable() check
    const platformProviders = providers.filter(p => {
      const platform = p.getPlatform()
      if (platform === 'utm') return env.appHost === 'desktop' // macOS only
      // Other providers: let them check their own availability
      return false
    })

    for (const provider of platformProviders) {
      if (await provider.isAvailable()) {
        log.info(`<VMProviderRegistry.getAvailableProvider> using ${provider.getPlatform()}`)
        return provider
      }
    }

    // Fallback: check any remaining providers
    for (const provider of providers) {
      if (await provider.isAvailable()) {
        log.info(`<VMProviderRegistry.getAvailableProvider> using ${provider.getPlatform()} (fallback)`)
        return provider
      }
    }

    log.warn(`<VMProviderRegistry.getAvailableProvider> no available providers`)
    return null
  }

  /**
   * List all available providers on current system.
   * Returns providers that report isAvailable() === true.
   */
  async getAvailableProviders(): Promise<VMProvider[]> {
    const available: VMProvider[] = []

    for (const provider of this.providers.values()) {
      try {
        if (await provider.isAvailable()) {
          available.push(provider)
        }
      }
      catch (error) {
        log.warn(`<VMProviderRegistry.getAvailableProviders> error checking ${provider.getPlatform()}: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    return available
  }

  /**
   * Get all registered providers.
   */
  getAllProviders(): VMProvider[] {
    return Array.from(this.providers.values())
  }

  /**
   * Clear all registered providers.
   * Useful for testing.
   */
  clear(): void {
    this.providers.clear()
  }
}

// Single global instance
export const vmProviderRegistry = new GlobalVMProviderRegistry()
