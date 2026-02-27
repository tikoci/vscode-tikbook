/**
 * CHR VM Commands - Commands for managing RouterOS CHR test VMs
 *
 * Implements commands for:
 * - Creating new CHR VMs with version selection
 * - Starting/stopping VMs
 * - Deleting VMs
 * - Refreshing the tree view
 */

import type { Disposable, ExtensionContext, QuickPickItem } from 'vscode'
import { commands, ProgressLocation, window } from 'vscode'
import { fetchCHRReleases } from './remote'
import { log } from './shared'
import type { CHRVMExplorerProvider } from './vm-explorer'
import type { VM, VMProvider } from './vm-providers/vm-provider'
import { vmProviderRegistry } from './vm-providers/vm-provider-registry'

/**
 * Quick pick item for CHR version selection
 */
interface CHRVersionQuickPickItem extends QuickPickItem {
	version: string
	downloadUrl: string
	isLatest: boolean
	isPrerelease: boolean
}

/**
 * Quick pick item for CHR image selection
 */
interface CHRImageQuickPickItem extends QuickPickItem {
	downloadUrl: string
	architecture: 'aarch64' | 'x86_64'
	backend: 'apple' | 'qemu'
}

interface VMTreeCommandItem {
	vm: VM
	provider: VMProvider
}

interface VMDetailsCommandItem {
	vm: VM
}

function isVMTreeCommandItem(item: unknown): item is VMTreeCommandItem {
	if (!item || typeof item !== 'object') {
		return false
	}

	const candidate = item as { vm?: unknown; provider?: unknown }
	return !!candidate.vm && !!candidate.provider
}

function isVMDetailsCommandItem(item: unknown): item is VMDetailsCommandItem {
	if (!item || typeof item !== 'object') {
		return false
	}

	const candidate = item as { vm?: unknown }
	return !!candidate.vm
}

/**
 * Initialize CHR VM commands
 */
export function initializeCHRVMCommands(context: ExtensionContext, explorer: CHRVMExplorerProvider): Disposable[] {
	return [
		// Refresh tree view
		commands.registerCommand('tikbook.chrvm.refresh', () => {
			log.debug('[chrvm.refresh] Refreshing CHR VM Explorer')
			explorer.refresh()
		}),

		// Create new CHR VM
		commands.registerCommand('tikbook.chrvm.create', async () => {
			await createCHRVM(explorer)
		}),

		// Start VM
		commands.registerCommand('tikbook.chrvm.start', async (item: unknown) => {
			await startVM(item, explorer)
		}),

		// Stop VM
		commands.registerCommand('tikbook.chrvm.stop', async (item: unknown) => {
			await stopVM(item, explorer)
		}),

		// Delete VM
		commands.registerCommand('tikbook.chrvm.delete', async (item: unknown) => {
			await deleteVM(item, explorer)
		}),

		// Show VM details
		commands.registerCommand('tikbook.chrvm.details', async (item: unknown) => {
			await showVMDetails(item)
		}),
	]
}

/**
 * Create a new CHR VM
 */
async function createCHRVM(explorer: CHRVMExplorerProvider): Promise<void> {
	try {
		log.info('[chrvm.create] Starting CHR VM creation workflow')
		// Get available providers
		const providers = await vmProviderRegistry.getAvailableProviders()
		log.info(`[chrvm.create] Found ${providers.length} VM provider(s)`, providers.map(p => p.constructor.name))

		if (providers.length === 0) {
			log.warn('[chrvm.create] No VM providers available')
			void window.showErrorMessage('No VM providers available. Please install UTM or other supported VM software.')
			return
		}

		// Select provider (for now, just use the first one)
		const provider = providers[0]
		log.info(`[chrvm.create] Using provider: ${provider.constructor.name}`)

		if (!provider.getCHRVersions) {
			log.error('[chrvm.create] Provider does not support getCHRVersions')
			void window.showErrorMessage('This VM provider does not support CHR version selection.')
			return
		}

		log.info('[chrvm.create] Fetching CHR releases from GitHub')
		// Fetch full releases data (includes images with URLs)
		const releases = await fetchCHRReleases('tikoci', 'mikropkl')
		log.info(`[chrvm.create] Fetched ${releases.length} CHR releases`)

		if (releases.length === 0) {
			log.warn('[chrvm.create] No CHR releases returned')
			void window.showErrorMessage('No CHR versions available.')
			return
		}

		// Create quick pick items for versions
		log.debug('[chrvm.create] Creating QuickPick items from versions')
		const items: CHRVersionQuickPickItem[] = releases.map((release, idx) => {
			log.debug(`[chrvm.create] Item[${idx}]: version="${release.routerOSVersion}" images=${release.images.length}`)

			return {
				label: release.routerOSVersion,
				description: `${release.images.length} image(s) available`,
				version: release.routerOSVersion,
				downloadUrl: '', // Will be set when user selects image
				isLatest: idx === 0,
				isPrerelease: release.routerOSVersion.includes('beta') || release.routerOSVersion.includes('rc'),
			}
		})
		log.info(`[chrvm.create] Created ${items.length} QuickPick items`)

		// Show version picker
		log.info(`[chrvm.create] Showing QuickPick with ${items.length} items`)
		const selectedVersion = await window.showQuickPick(items, {
			title: 'Select RouterOS CHR Version',
			placeHolder: 'Choose a version to install',
			matchOnDescription: true,
			matchOnDetail: true,
		})

		if (!selectedVersion) {
			log.info('[chrvm.create] User cancelled version selection')
			return // User cancelled
		}

		log.info(`[chrvm.create] User selected version: ${selectedVersion.version}`)

		// Find the selected release to get available images
		const selectedRelease = releases.find(r => r.routerOSVersion === selectedVersion.version)
		if (!selectedRelease || selectedRelease.images.length === 0) {
			log.warn(`[chrvm.create] No images found for version ${selectedVersion.version}`)
			void window.showErrorMessage(`No images available for version ${selectedVersion.version}`)
			return
		}

		log.info(`[chrvm.create] Found ${selectedRelease.images.length} images for version ${selectedVersion.version}`)

		// Create quick pick items for available images
		log.debug('[chrvm.create] Creating QuickPick items for images')
		const imageItems: CHRImageQuickPickItem[] = selectedRelease.images.map((image, idx) => {
			// Extract image name from asset, stripping .zip, .tar.gz, .tar, .gz extensions
			let imageName = image.assetName
			imageName = imageName.replace(/\.(tar\.gz|tar\.bz2|tar|zip|gz|bz2)$/, '')
			
			const sizeLabel = `${(image.sizeBytes / (1024 * 1024)).toFixed(1)} MB`
			log.debug(`[chrvm.create] Image[${idx}]: ${imageName} (${sizeLabel})`)

			return {
				label: imageName,
				description: sizeLabel,
				downloadUrl: image.downloadUrl,
				architecture: image.architecture,
				backend: image.backend,
			}
		})

		log.info(`[chrvm.create] Showing ${imageItems.length} available images for ${selectedVersion.version}`)
		const selectedImage = await window.showQuickPick(imageItems, {
			title: `Select Image for ${selectedVersion.version}`,
			placeHolder: 'Choose architecture and backend',
		})

		if (!selectedImage) {
			log.info('[chrvm.create] User cancelled image selection')
			return // User cancelled
		}

		log.info(`[chrvm.create] User selected image: ${selectedImage.label} from ${selectedImage.downloadUrl}`)

		// Check if provider supports createVM
		if (!provider.createVM) {
			log.error('[chrvm.create] Provider does not support createVM')
			void window.showErrorMessage('This VM provider does not support CHR VM creation.')
			return
		}

		// Create VM using utm:// URL scheme
		// Note: UTM determines the VM name from the downloaded bundle, so we don't prompt for it
		log.info(`[chrvm.create] Opening utm:// URL scheme: version="${selectedVersion.version}" url="${selectedImage.downloadUrl}"`)

		try {
			// This returns immediately after opening the utm:// URL
			// UTM will handle the download and import in its own UI
			await provider.createVM({
				name: '', // Not used with utm:// scheme - UTM determines name from bundle
				chrVersion: selectedVersion.version,
				downloadUrl: selectedImage.downloadUrl,
			})
			log.info(`[chrvm.create] UTM URL opened successfully. UTM is downloading and importing the VM.`)

			// Show informational message
			const action = await window.showInformationMessage(
				`UTM is downloading and importing RouterOS CHR ${selectedVersion.version}. The VM will appear in the list once the download completes. You can monitor progress in the UTM app.`,
				'Open UTM',
				'Refresh List',
				'Close',
			)

			if (action === 'Open UTM') {
				// Open UTM app
				const vscode = await import('vscode')
				await vscode.env.openExternal(vscode.Uri.parse('utm://'))
			}
			else if (action === 'Refresh List') {
				// Refresh the explorer to show the new VM (if download completed)
				explorer.refresh()
			}
		}
		catch (error) {
			log.error('[chrvm.create] Failed to create VM', error)
			void window.showErrorMessage(
				`Failed to create VM: ${error instanceof Error ? error.message : String(error)}`,
			)
		}
	}
	catch (error) {
		log.error('[chrvm.create] Error in createCHRVM', error)
		void window.showErrorMessage(`Error creating VM: ${error instanceof Error ? error.message : String(error)}`)
	}
}

/**
 * Start a VM
 */
async function startVM(item: unknown, explorer: CHRVMExplorerProvider): Promise<void> {
	try {
		// Extract VM and provider from tree item
		if (!isVMTreeCommandItem(item)) {
			log.warn('[chrvm.start] Invalid tree item', item)
			return
		}

		const vm: VM = item.vm
		const provider: VMProvider = item.provider

		if (vm.status === 'running') {
			void window.showInformationMessage(`VM "${vm.name}" is already running.`)
			return
		}

		await window.withProgress(
			{
				location: ProgressLocation.Notification,
				title: `Starting VM: ${vm.name}`,
				cancellable: false,
			},
			async () => {
				try {
					await provider.startVM(vm.id)
					explorer.refresh()
					void window.showInformationMessage(`VM "${vm.name}" started successfully.`)
				}
				catch (error) {
					log.error('[chrvm.start] Failed to start VM', error)
					void window.showErrorMessage(
						`Failed to start VM: ${error instanceof Error ? error.message : String(error)}`,
					)
				}
			},
		)
	}
	catch (error) {
		log.error('[chrvm.start] Error in startVM', error)
	}
}

/**
 * Stop a VM
 */
async function stopVM(item: unknown, explorer: CHRVMExplorerProvider): Promise<void> {
	try {
		if (!isVMTreeCommandItem(item)) {
			log.warn('[chrvm.stop] Invalid tree item', item)
			return
		}

		const vm: VM = item.vm
		const provider: VMProvider = item.provider

		if (vm.status === 'stopped') {
			void window.showInformationMessage(`VM "${vm.name}" is already stopped.`)
			return
		}

		await window.withProgress(
			{
				location: ProgressLocation.Notification,
				title: `Stopping VM: ${vm.name}`,
				cancellable: false,
			},
			async () => {
				try {
					await provider.stopVM(vm.id)
					explorer.refresh()
					void window.showInformationMessage(`VM "${vm.name}" stopped successfully.`)
				}
				catch (error) {
					log.error('[chrvm.stop] Failed to stop VM', error)
					void window.showErrorMessage(
						`Failed to stop VM: ${error instanceof Error ? error.message : String(error)}`,
					)
				}
			},
		)
	}
	catch (error) {
		log.error('[chrvm.stop] Error in stopVM', error)
	}
}

/**
 * Delete a VM
 */
async function deleteVM(item: unknown, explorer: CHRVMExplorerProvider): Promise<void> {
	try {
		log.info('[chrvm.delete] Starting VM deletion workflow')
		
		if (!isVMTreeCommandItem(item)) {
			log.warn('[chrvm.delete] Invalid tree item', item)
			return
		}

		const vm: VM = item.vm
		const provider: VMProvider = item.provider
		log.info(`[chrvm.delete] Deleting VM: id="${vm.id}" name="${vm.name}"`)

		// Confirm deletion
		const confirm = await window.showWarningMessage(
			`Are you sure you want to delete VM "${vm.name}"?`,
			{ modal: true },
			'Delete',
		)

		if (confirm !== 'Delete') {
			log.info('[chrvm.delete] User cancelled deletion')
			return
		}

		log.info(`[chrvm.delete] User confirmed deletion of "${vm.name}"`)

		await window.withProgress(
			{
				location: ProgressLocation.Notification,
				title: `Deleting VM: ${vm.name}`,
				cancellable: false,
			},
			async () => {
				try {
					log.info(`[chrvm.delete] Calling provider.deleteVM(id="${vm.id}")`)
					await provider.deleteVM(vm.id)
					log.info(`[chrvm.delete] VM deleted successfully: "${vm.name}"`)
					explorer.refresh()
					void window.showInformationMessage(`VM "${vm.name}" deleted successfully.`)
				}
				catch (error) {
					const errorMsg = error instanceof Error ? error.message : String(error)
					log.error(`[chrvm.delete] Failed to delete VM: ${errorMsg}`, error)
					void window.showErrorMessage(
						`Failed to delete VM: ${errorMsg}`,
					)
				}
			},
		)
	}
	catch (error) {
		const errorMsg = error instanceof Error ? error.message : String(error)
		log.error(`[chrvm.delete] Error in deleteVM: ${errorMsg}`, error)
	}
}

/**
 * Show VM details
 */
async function showVMDetails(item: unknown): Promise<void> {
	try {
		if (!isVMDetailsCommandItem(item)) {
			log.warn('[chrvm.details] Invalid tree item', item)
			return
		}

		const vm: VM = item.vm

		const details = [
			`Name: ${vm.name}`,
			`Status: ${vm.status}`,
			`ID: ${vm.id}`,
		]

		if (vm.chrMetadata) {
			if (vm.chrMetadata.version) {
				details.push(`RouterOS Version: ${vm.chrMetadata.version}`)
			}
			if (vm.chrMetadata.architecture) {
				details.push(`Architecture: ${vm.chrMetadata.architecture}`)
			}
			if (vm.chrMetadata.backend) {
				details.push(`Backend: ${vm.chrMetadata.backend}`)
			}
		}

		// Show in a quick pick (read-only)
		// Note: QuickPick doesn't render markdown, use plain text
		await window.showQuickPick(
			details.map(d => ({ label: d, description: '' })),
			{
				title: `VM Details: ${vm.name}`,
				placeHolder: 'VM information',
			},
		)
	}
	catch (error) {
		log.error('[chrvm.details] Error showing details', error)
	}
}
