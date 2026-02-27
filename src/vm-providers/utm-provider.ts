/**
 * UTM provider implementation for macOS.
 * Uses AppleScript as primary method for all operations.
 *
 * AppleScript advantages:
 * - One-time permission prompt (better UX than repeated prompts)
 * - Rich object model: can query properties, get structured responses
 * - Full API surface: virtual machines, configurations, control methods
 * - Can implement retry logic in AppleScript itself
 *
 * Reference: https://docs.getutm.app/scripting/reference
 */

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import * as semver from 'semver'
import { fetchCHRReleases } from '../remote'
import { log } from '../shared'
import type { CHRMetadata, VM, VMCreateOptions, VMProvider, VMStatus } from './vm-provider'

const execFileAsync = promisify(execFile)

export function mapUTMStatusToVMStatus(statusStr: string): VMStatus {
  if (statusStr === 'started') return 'running'
  if (statusStr === 'stopped') return 'stopped'
  if (statusStr === 'paused' || statusStr === 'suspended') return 'paused'
  return 'unknown'
}

/**
 * macOS UTM VM provider.
 * Requires: UTM >= 3.0 installed
 */
export class UTMProvider implements VMProvider {
  private isAvailableCache: boolean | null = null

  getPlatform(): 'utm' {
    return 'utm' as const
  }

  /**
   * Check if UTM is installed and accessible.
   * Cached for performance.
   */
  async isAvailable(): Promise<boolean> {
    if (this.isAvailableCache !== null) {
      return this.isAvailableCache
    }

    try {
      // Simple check: try to get UTM's app name via AppleScript
      const result = await this.runAppleScript('tell application "UTM" to name')
      this.isAvailableCache = result.trim() === 'UTM'
      return this.isAvailableCache
    }
    catch {
      this.isAvailableCache = false
      return false
    }
  }

  async getUnavailableReason(): Promise<string> {
    try {
      await this.runAppleScript('tell application "UTM" to name')
      return 'Unknown error'
    }
    catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return 'UTM is not installed. Download from https://mac.getutm.app'
        }
        if (error.message.includes('Permission denied')) {
          return 'Permission denied: VS Code needs permission to control UTM. Grant in System Preferences > Security & Privacy.'
        }
      }
      return `UTM not available: ${error instanceof Error ? error.message : String(error)}`
    }
  }

  /**
   * List all VMs in UTM.
   * Uses UTM's AppleScript 'get status' to determine running state.
   */
  async listVMs(): Promise<VM[]> {
    if (!(await this.isAvailable())) {
      throw new Error('UTM is not available')
    }

    try {
      log.debug(`<UTMProvider.listVMs>`)

      // Get all VM names and status via AppleScript
      // Format: vmName|status (one per line)
      const vmData = await this.runAppleScript(`
        tell application "UTM"
          set vmData to {}
          repeat with vm in virtual machines
            set vmName to name of vm
            set vmStatus to (get status of vm) as string
            set vmInfo to vmName & "|" & vmStatus
            set end of vmData to vmInfo
          end repeat
          
          set output to ""
          repeat with info in vmData
            set output to output & info & linefeed
          end repeat
          return output
        end tell
      `)

      // Parse AppleScript output (format: name|status per line)
      const vms: VM[] = []
      const lines = vmData.trim().split('\n').filter(line => line.length > 0)

      for (const line of lines) {
        const [name, statusStr] = line.split('|')
        if (!name) continue

        // Map UTM status strings to our VMStatus type
        // UTM returns: "stopped", "started", "paused", "starting", "stopping", etc.
        const status = mapUTMStatusToVMStatus((statusStr ?? '').trim())

        const vm: VM = {
          id: name.trim(),
          name: name.trim(),
          status,
          platform: 'utm',
          chrMetadata: this.extractCHRMetadata(name),
        }
        vms.push(vm)
      }

      // Log total VMs (important context for understanding what UI filters show)
      log.info(`<UTMProvider.listVMs> found ${vms.length} total VMs from UTM`)
      
      // Show sample of what was found (helps debug if specific VM is missing)
      if (vms.length > 0) {
        const samples = vms.slice(0, 3).map(v => `"${v.name}" (${v.status})`)
        log.debug(`<UTMProvider.listVMs> Sample VMs: ${samples.join(', ')}`)
      }
      
      return vms
    }
    catch (error) {
      log.error(`<UTMProvider.listVMs> error: ${error instanceof Error ? error.message : String(error)}`)
      throw error
    }
  }

  /**
   * List only RouterOS CHR VMs.
   * Important: Log filtering results so UI context is visible to debugging.
   */
  async listCHRVMs(): Promise<VM[]> {
    const allVMs = await this.listVMs()
    const chrVMs = allVMs.filter(vm => vm.chrMetadata?.isCHR)
    
    // Log before/after filtering so logs show what UI displays
    log.info(`<UTMProvider.listCHRVMs> Found ${chrVMs.length}/${allVMs.length} CHR VMs (filtered by name pattern 'chr')`)
    if (chrVMs.length > 0) {
      chrVMs.forEach((vm, i) => {
        log.debug(`<UTMProvider.listCHRVMs> CHR[${i}] "${vm.name}" v${vm.chrMetadata?.version ?? '?'} - ${vm.status}`)
      })
    } else if (allVMs.length > 0) {
      log.debug(`<UTMProvider.listCHRVMs> No CHR VMs found. Available VMs: ${allVMs.map(v => `"${v.name}"`).join(', ')}`)
    }
    
    return chrVMs
  }

  /**
   * Get a specific VM by name.
   */
  async getVM(name: string): Promise<VM | null> {
    const vms = await this.listVMs()
    return vms.find(vm => vm.name === name) ?? null
  }

  /**
   * Get status of a specific VM.
   */
  async getStatus(name: string): Promise<VMStatus> {
    try {
      const script = `
        tell application "UTM"
          repeat with vm in virtual machines
            if name of vm is "${this.escapeAppleScript(name)}" then
              return (get status of vm) as string
            end if
          end repeat
          return "unknown"
        end tell
      `
      const result = await this.runAppleScript(script)
      return mapUTMStatusToVMStatus(result.trim())
    }
    catch {
      return 'unknown'
    }
  }

  /**
   * Start a VM.
   */
  async startVM(name: string): Promise<void> {
    if (!(await this.isAvailable())) {
      throw new Error('UTM is not available')
    }

    try {
      log.debug(`<UTMProvider.startVM> ${name}`)

      const script = `
        tell application "UTM"
          repeat with vm in virtual machines
            if name of vm is "${this.escapeAppleScript(name)}" then
              start vm
              delay 1
              return "Started: " & name of vm
            end if
          end repeat
          error "VM not found: ${this.escapeAppleScript(name)}"
        end tell
      `

      const result = await this.runAppleScript(script)
      log.info(`<UTMProvider.startVM> ${result.trim()}`)
    }
    catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      // UTM returns "Operation not available" if VM is already running
      if (errorMsg.includes('Operation not available')) {
        log.info(`<UTMProvider.startVM> ${name} is already running`)
        throw new Error(`VM "${name}" is already running`, { cause: error })
      }
      log.error(`<UTMProvider.startVM> ${name} error: ${errorMsg}`)
      throw error
    }
  }

  /**
   * Stop a VM.
   * Note: We don't check if VM is running first - UTM handles that gracefully.
   */
  async stopVM(name: string, force = false): Promise<void> {
    if (!(await this.isAvailable())) {
      throw new Error('UTM is not available')
    }

    try {
      log.debug(`<UTMProvider.stopVM> ${name} (force=${force})`)

      const script = `
        tell application "UTM"
          repeat with vm in virtual machines
            if name of vm is "${this.escapeAppleScript(name)}" then
              stop vm
              delay 1
              return "Stopped: " & name of vm
            end if
          end repeat
          error "VM not found: ${this.escapeAppleScript(name)}"
        end tell
      `

      const result = await this.runAppleScript(script)
      log.info(`<UTMProvider.stopVM> ${result.trim()}`)
    }
    catch (error) {
      log.error(`<UTMProvider.stopVM> ${name} error: ${error instanceof Error ? error.message : String(error)}`)
      throw error
    }
  }

  /**
   * Create a new CHR VM using UTM's URL scheme.
   * Opens utm://downloadVM?url=... to trigger UTM's native download and import flow.
   * 
   * Based on Experiment 13: UTM URL Scheme for Downloads
   * See: src/test/suite/utm-integration.experiment.test.ts
   * 
   * Advantages:
   * - No file system permissions needed
   * - UTM manages download progress and errors
   * - User sees familiar UTM UI
   * - No temporary file handling required
   * 
   * Note: This method returns immediately after opening the URL.
   * UTM will handle the download and import asynchronously.
   * The VM will appear in the list once UTM completes the process.
   */
  async createVM(options: VMCreateOptions): Promise<VM> {
    if (!(await this.isAvailable())) {
      throw new Error('UTM is not available')
    }

    const { name, chrVersion, downloadUrl, importMethod = 'url', localBundlePath } = options

    try {
      if (importMethod === 'applescript') {
        if (!localBundlePath) {
          throw new Error('localBundlePath is required when importMethod is "applescript"')
        }

        const importedName = await this.importBundleViaAppleScript(localBundlePath)
        const resolvedName = importedName.trim() || name || `CHR-${chrVersion}`

        log.info(`<UTMProvider.createVM> Imported VM via AppleScript: "${resolvedName}"`)

        return {
          id: resolvedName,
          name: resolvedName,
          status: 'stopped',
          platform: 'utm',
          chrMetadata: {
            isCHR: true,
            version: chrVersion,
          },
        }
      }

      log.info(`<UTMProvider.createVM> Creating VM using utm:// URL scheme: name="${name}" version="${chrVersion}" url="${downloadUrl}"`)

      // Construct UTM URL scheme
      // Format: utm://downloadVM?url=<encoded-url>
      const utmUrl = `utm://downloadVM?url=${encodeURIComponent(downloadUrl)}`
      log.debug(`<UTMProvider.createVM> Opening UTM URL: ${utmUrl}`)

      // Use macOS 'open' command instead of env.openExternal
      // env.openExternal() doesn't reliably handle custom URL schemes on macOS
      // The 'open' command is the standard way to open URLs on macOS
      try {
        await execFileAsync('open', [utmUrl], {
          timeout: 10000, // 10 second timeout
        })
        log.info(`<UTMProvider.createVM> UTM URL opened successfully via 'open' command. UTM will handle download and import.`)
      }
      catch (openError) {
        const errorMsg = openError instanceof Error ? openError.message : String(openError)
        log.error(`<UTMProvider.createVM> Failed to open UTM URL via 'open' command: ${errorMsg}`)
        throw new Error(`Failed to open UTM URL scheme: ${errorMsg}. Is UTM installed?`, { cause: openError })
      }

      // Return a placeholder VM object
      // The actual VM will appear in UTM after download completes
      // Note: We can't track completion here - UTM handles it asynchronously
      const vm: VM = {
        id: name,
        name,
        status: 'stopped', // Will be stopped after import
        platform: 'utm',
        chrMetadata: {
          isCHR: true,
          version: chrVersion,
        },
      }

      log.info(`<UTMProvider.createVM> Returning placeholder VM. Actual VM will appear in UTM after download.`)

      return vm
    }
    catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      log.error(`<UTMProvider.createVM> ${name} error: ${errorMsg}`, error)
      throw error
    }
  }

  /**
   * Import a local .utm bundle file using UTM AppleScript API.
   * Returns the imported VM name.
   */
  private async importBundleViaAppleScript(localBundlePath: string): Promise<string> {
    const escapedPath = this.escapeAppleScript(localBundlePath)
    log.info(`<UTMProvider.importBundleViaAppleScript> Importing local bundle: ${localBundlePath}`)

    const importScript = `
      tell application "UTM"
        try
          -- Preferred syntax per UTM scripting cheat sheet/reference
          set importedVM to import new virtual machine from (POSIX file "${escapedPath}")
        on error
          -- Backward-compatible fallback for older AppleScript parser behavior
          set importedVM to import virtual machine from POSIX file "${escapedPath}"
        end try
        delay 0.5
        return name of importedVM as string
      end tell
    `

    const result = await this.runAppleScript(importScript)
    return result.trim()
  }

  /**
   * Delete a VM.
   * CRITICAL: Use correct AppleScript syntax: delete virtual machine named "name"
   */
  async deleteVM(name: string): Promise<void> {
    if (!(await this.isAvailable())) {
      throw new Error('UTM is not available')
    }

    try {
      log.info(`<UTMProvider.deleteVM> Attempting deletion for "${name}"`)

      const deleteScript = `
        tell application "UTM"
          delete virtual machine named "${this.escapeAppleScript(name)}"
          delay 0.5
          return "Deleted: ${this.escapeAppleScript(name)}"
        end tell
      `

      const result = await this.runAppleScript(deleteScript)
      log.info(`<UTMProvider.deleteVM> Success: ${result.trim()}`)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)

      // Check if error is "must be stopped"
      if (errorMsg.includes('must be stopped')) {
        log.error(`<UTMProvider.deleteVM> VM must be stopped: "${name}" - ${errorMsg}`)
        throw new Error('VM must be stopped before deletion. Stop the VM and try again.', {
          cause: error,
        })
      }

      log.error(`<UTMProvider.deleteVM> Failed for "${name}": ${errorMsg}`, error)
      throw error
    }
  }

  /**
   * Try to get VM's IP address via UTM guest agent.
   * Uses AppleScript to query guest tools.
   *
   * Returns null if:
   * - VM is not running
   * - Guest tools not available/shared
   * - IP not yet assigned
   *
   * This is experimental and may require validation with real CHR VMs.
   */
  async getVMIPAddress(name: string): Promise<string | null> {
    if (!(await this.isAvailable())) {
      return null
    }

    try {
      const script = `
        tell application "UTM"
          set vm to virtual machine named "${this.escapeAppleScript(name)}"
          set ipList to query ip of vm
          return ipList as list
        end tell
      `

      const result = await this.runAppleScript(script)
      const ips = result
        .split(',')
        .map(ip => ip.trim())
        .filter(ip => ip.length > 0)

      if (ips.length === 0) {
        log.debug(`<UTMProvider.getVMIPAddress> ${name}: no IPs returned by guest agent`)
        return null
      }

      const preferredIPv4 = ips.find(ip => !ip.includes(':') && !ip.startsWith('127.'))
      if (preferredIPv4) {
        return preferredIPv4
      }

      const nonLinkLocal = ips.find(ip => !ip.startsWith('fe80:'))
      return nonLinkLocal ?? null
    }
    catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)

      if (
        errorMsg.includes('Operation not supported by the backend')
        || errorMsg.includes('QEMU guest agent is not running or not installed on the guest')
      ) {
        log.info(`<UTMProvider.getVMIPAddress> ${name}: guest-agent IP query unavailable (${errorMsg})`)
        return null
      }

      log.warn(`<UTMProvider.getVMIPAddress> ${name}: failed to query IP (${errorMsg})`)
      return null
    }
  }

  /**
   * Get available RouterOS CHR versions from GitHub mikropkl.
   */
  async getCHRVersions(): Promise<string[]> {
    try {
      log.debug(`<UTMProvider.getCHRVersions> fetching CHR releases from GitHub`)

      const releases = await fetchCHRReleases('tikoci', 'mikropkl')
      
      // Sort by semantic version (newest first)
      const versions = releases
        .map(r => r.routerOSVersion)
        .sort((a, b) => {
          // Parse and compare semantic versions
          const semverA = semver.coerce(a)
          const semverB = semver.coerce(b)
          if (!semverA || !semverB) return 0
          return semver.compare(semverB, semverA) // Descending
        })

      // Log what QuickPick will show - this is what user sees on screen
      log.info(`<UTMProvider.getCHRVersions> extracted ${versions.length} unique versions from ${releases.length} releases`)
      const top5 = versions.slice(0, 5)
      log.debug(`<UTMProvider.getCHRVersions> QuickPick will show (top ${Math.min(5, versions.length)}):`)
      top5.forEach((v, i) => log.debug(`  [${i}] ${v}`))
      
      if (versions.length === 0) {
        log.warn(`<UTMProvider.getCHRVersions> No versions found! Releases: ${releases.length}, versions: ${versions.length}`)
      }
      
      log.info(`<UTMProvider.getCHRVersions> found ${versions.length} versions`)
      versions.slice(0, 3).forEach((v, i) => log.debug(`  [${i}] ${v}`))
      return versions
    }
    catch (error) {
      log.error(`<UTMProvider.getCHRVersions> error: ${error instanceof Error ? error.message : String(error)}`)
      return []
    }
  }

  // MARK: Helpers

  /**
   * Extract CHR metadata from VM name or properties.
   *
   * CHR VMs from mikropkl typically follow naming convention:
   * - CHR-{version} or
   * - RouterOS-{version} or
   * - Similar patterns
   *
   * This is a heuristic, accurate detection happens via metadata.
   * For now, check if name contains "CHR" or looks like a RouterOS version.
   */
  private extractCHRMetadata(vmName: string): CHRMetadata | undefined {
    try {
      // Rough heuristic: CHR VMs have "CHR" in name or match version pattern
      if (!vmName.toUpperCase().includes('CHR') && !/\d+\.\d+/.test(vmName)) {
        return undefined // Not a CHR VM
      }

      // Extract version if present (e.g., "CHR-7.21.3" -> "7.21.3")
      const versionMatch = vmName.match(/(\d+\.\d+\.?\d*)/)
      const version = versionMatch?.[1]

      return {
        isCHR: true,
        version,
        // architecture and backend can't be determined from name alone
        // would need to query VM config or UTM metadata
      }
    }
    catch {
      return undefined
    }
  }

  /**
   * Run AppleScript and return output as string.
   * @throws Error if AppleScript execution fails
   */
  private async runAppleScript(script: string): Promise<string> {
    try {
      const { stdout, stderr } = await execFileAsync('osascript', ['-e', script], {
        timeout: 30000, // 30 second timeout for AppleScript
      })

      if (stderr) {
        log.warn(`<UTMProvider.runAppleScript> stderr: ${stderr}`)
      }

      return stdout
    }
    catch (error) {
      if (error instanceof Error) {
        throw new Error(`AppleScript error: ${error.message}`, { cause: error })
      }
      throw error
    }
  }

  /**
   * Escape special characters for AppleScript strings.
   * AppleScript uses quotes, so we need to escape them.
   */
  private escapeAppleScript(str: string): string {
    return str.replace(/"/g, '\\"')
  }
}
