/**
 * VS Code Version Compatibility Utilities
 * 
 * This module provides runtime compatibility checks for VS Code APIs
 * to ensure graceful degradation when running on older versions.
 * 
 * Minimum supported version: 1.78.2 (June 2023)
 */

import type { LogOutputChannel, NotebookDocument } from 'vscode'
import { env, version, window } from 'vscode'

/**
 * Parsed VS Code version information
 */
export interface VSCodeVersion {
  major: number
  minor: number
  patch: number
  raw: string
}

/**
 * Parse VS Code version string into components
 */
export function parseVersion(versionString: string): VSCodeVersion {
  const match = versionString.match(/^(\d+)\.(\d+)\.(\d+)/)
  if (!match) {
    // Can't use log here due to circular dependency, will be logged by caller
    return { major: 1, minor: 78, patch: 0, raw: versionString }
  }
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    raw: versionString,
  }
}

/**
 * Current VS Code version
 */
export const currentVersion = parseVersion(version)

/**
 * Check if current VS Code version meets minimum requirement
 */
export function meetsMinimumVersion(major: number, minor: number, patch = 0): boolean {
  if (currentVersion.major > major) return true
  if (currentVersion.major < major) return false
  if (currentVersion.minor > minor) return true
  if (currentVersion.minor < minor) return false
  return currentVersion.patch >= patch
}

/**
 * Feature availability flags with version requirements
 */
export const features = {
  /**
   * window.createOutputChannel with log option (1.74.0+)
   */
  logOutputChannel: meetsMinimumVersion(1, 74),
  
  /**
   * Notebook API stability (1.78.0+)
   */
  notebookStable: meetsMinimumVersion(1, 78),
  
  /**
   * Enhanced notebook CellOutput APIs (1.86.0+)
   */
  notebookEnhancedOutput: meetsMinimumVersion(1, 86),
  
  /**
   * window.tabGroups API (1.48.0+)
   */
  tabGroups: meetsMinimumVersion(1, 48),
  
  /**
   * Testing API v2 (1.59.0+)
   */
  testingApiV2: meetsMinimumVersion(1, 59),
  
  /**
   * Authentication API (1.63.0+)
   */
  authentication: meetsMinimumVersion(1, 63),
  
  /**
   * File system provider with readonly support (1.78.0+)
   */
  fsProviderReadonly: meetsMinimumVersion(1, 78),
}

/**
 * Get the active notebook from the current context
 * Handles deprecated window.activeNotebookEditor gracefully
 */
export function getActiveNotebook(): NotebookDocument | undefined {
  // window.activeNotebookEditor is deprecated but still available
  // biome-ignore lint/suspicious/noExplicitAny: intentional cast to access deprecated VS Code API
  if (typeof (window as any).activeNotebookEditor !== 'undefined') {
    // biome-ignore lint/suspicious/noExplicitAny: intentional cast to access deprecated VS Code API
    return (window as any).activeNotebookEditor?.notebook as NotebookDocument | undefined
  }
  
  // Fallback: use tabGroups API if available (1.48+)
  if (features.tabGroups && window.tabGroups) {
    const activeTab = window.tabGroups.activeTabGroup?.activeTab
    // biome-ignore lint/suspicious/noExplicitAny: TabInputNotebook is not typed in older VS Code APIs
    if (activeTab && 'notebook' in (activeTab.input as any)) {
      // biome-ignore lint/suspicious/noExplicitAny: TabInputNotebook is not typed in older VS Code APIs
      return (activeTab.input as any).notebook as NotebookDocument
    }
  }
  
  // Final fallback: scan visible notebook editors
  return window.visibleNotebookEditors?.[0]?.notebook
}

/**
 * Create an output channel with optional logging support
 * Gracefully degrades on older versions
 */
export function createOutputChannel(name: string, enableLogging = true): LogOutputChannel {
  if (features.logOutputChannel && enableLogging) {
    return window.createOutputChannel(name, { log: true })
  }
  // Fallback for older versions - cast to LogOutputChannel for API compatibility
  // The OutputChannel will lack info/warn/error/debug/trace methods but that's handled elsewhere
  return window.createOutputChannel(name) as unknown as LogOutputChannel
}

/**
 * Environment information structure
 */
export interface EnvironmentInfo {
  version: string
  uiKind: string
  isWeb: boolean
  variant: string
  appName: string
  uriScheme: string
  language: string
  remoteName: string
  shell: string
  isRemote: boolean
}

/**
 * Get detailed environment information for logging
 */
export function getEnvironmentInfo(): EnvironmentInfo {
  const isWeb = env.uiKind === 2 // UIKind.Web = 2, Desktop = 1
  const uiKindName = isWeb ? 'web' : 'desktop'
  
  // Detect VS Code variant by URI scheme
  let variant = 'VS Code'
  if (env.uriScheme.includes('insiders')) {
    variant = 'VS Code Insiders'
  } else if (env.uriScheme.includes('code-oss')) {
    variant = 'VS Code OSS'
  } else if (env.appName.includes('Cursor')) {
    variant = 'Cursor'
  } else if (env.appName.includes('VSCodium')) {
    variant = 'VSCodium'
  }
  
  return {
    version: currentVersion.raw,
    uiKind: uiKindName,
    isWeb,
    variant,
    appName: env.appName,
    uriScheme: env.uriScheme,
    language: env.language,
    remoteName: env.remoteName ?? 'none',
    shell: env.shell,
    // Platform info (only available in some contexts)
    isRemote: !!env.remoteName,
  }
}

/**
 * Log startup warnings for missing features
 * Pass in a log channel to avoid circular dependency
 */
export function logVersionInfo(logChannel: LogOutputChannel): void {
  const envInfo = getEnvironmentInfo()
  
  // Log comprehensive environment information
  logChannel.info(`<vscode-compat> ========================================`)
  logChannel.info(`<vscode-compat> Environment: ${envInfo.variant} ${envInfo.version}`)
  logChannel.info(`<vscode-compat> UI Kind: ${envInfo.uiKind}`)
  logChannel.info(`<vscode-compat> App Name: ${envInfo.appName}`)
  logChannel.info(`<vscode-compat> URI Scheme: ${envInfo.uriScheme}`)
  logChannel.info(`<vscode-compat> Language: ${envInfo.language}`)
  if (envInfo.isRemote) {
    logChannel.info(`<vscode-compat> Remote: ${envInfo.remoteName}`)
  }
  if (envInfo.shell) {
    logChannel.info(`<vscode-compat> Shell: ${envInfo.shell}`)
  }
  
  // Web-specific limitations
  if (envInfo.isWeb) {
    logChannel.info(`<vscode-compat> Running in browser - some features may be limited:`)
    logChannel.info(`<vscode-compat>   - No direct file system access`)
    logChannel.info(`<vscode-compat>   - No terminal execution (SSH commands unavailable)`)
    logChannel.info(`<vscode-compat>   - Certificate validation always required for HTTPS`)
  }
  
  logChannel.info(`<vscode-compat> ========================================`)
  logChannel.info(`<vscode-compat> Minimum required version: 1.78.2`)
  
  if (!meetsMinimumVersion(1, 78, 2)) {
    logChannel.error(`<vscode-compat> ⚠️ VS Code version ${currentVersion.raw} is below minimum required 1.78.2`)
    logChannel.error(`<vscode-compat> Extension may not function correctly. Please update VS Code.`)
    void window.showWarningMessage(
      `TikBook requires VS Code 1.78.2 or newer. You are running ${currentVersion.raw}. Some features may not work correctly.`,
      'Update VS Code'
    ).then(choice => {
      if (choice === 'Update VS Code') {
        void env.openExternal({ scheme: 'https', authority: 'code.visualstudio.com', path: '/download' } as unknown as Parameters<typeof env.openExternal>[0])
      }
    })
    return
  }
  
  // Log warnings for optional features that aren't available
  const missingFeatures: string[] = []
  
  if (!features.logOutputChannel) {
    missingFeatures.push('Enhanced logging output channel (1.74.0+)')
  }
  
  if (!features.notebookEnhancedOutput) {
    missingFeatures.push('Enhanced notebook output APIs (1.86.0+)')
  }
  
  if (missingFeatures.length > 0) {
    logChannel.warn(`<vscode-compat> Some optional features are unavailable in VS Code ${currentVersion.raw}:`)
    missingFeatures.forEach(feature => logChannel.warn(`<vscode-compat>   - ${feature}`))
    logChannel.warn(`<vscode-compat> Extension will function with reduced capabilities.`)
  }
  
  // Info about available features
  const availableFeatures: string[] = []
  if (features.notebookStable) availableFeatures.push('Notebook API')
  if (features.tabGroups) availableFeatures.push('Tab Groups')
  if (features.authentication) availableFeatures.push('Authentication')
  if (features.fsProviderReadonly) availableFeatures.push('File System Provider')
  
  if (availableFeatures.length > 0) {
    logChannel.info(`<vscode-compat> Available features: ${availableFeatures.join(', ')}`)
  }
  
  logChannel.info(`<vscode-compat> Initialization complete`)
}

/**
 * Check if a specific API exists on an object
 */
export function hasAPI<T extends object>(obj: T, prop: keyof T): boolean {
  return typeof obj[prop] !== 'undefined'
}

/**
 * Safely call an API that might not exist
 */
export function safeCall<T>(fn: () => T, fallback: T, errorContext: string, logChannel?: LogOutputChannel): T {
  try {
    if (typeof fn === 'function') {
      const result = fn()
      return result
    }
    if (logChannel) {
      logChannel.warn(`<vscode-compat> API not available: ${errorContext}`)
    }
    return fallback
  } catch (error) {
    if (logChannel) {
      logChannel.warn(`<vscode-compat> API call failed: ${errorContext}`, error)
    }
    return fallback
  }
}
