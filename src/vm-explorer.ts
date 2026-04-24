/**
 * CHR VM Explorer - Tree view for managing RouterOS CHR test VMs
 *
 * Provides an Explorer view to:
 * - List existing CHR VMs
 * - Create new CHR VMs with version selection
 * - Start/stop/delete VMs
 * - View VM details
 */

import type { Event, ExtensionContext, ProviderResult, TreeDataProvider, TreeView } from 'vscode'
import { EventEmitter, ThemeColor, ThemeIcon, TreeItem, TreeItemCollapsibleState, window } from 'vscode'
import { log } from './shared'
import { sortCHRVMsByVersion } from './vm-providers/chr-metadata'
import type { VM, VMProvider } from './vm-providers/vm-provider'
import { vmProviderRegistry } from './vm-providers/vm-provider-registry'

/**
 * Tree item representing a VM provider (e.g., UTM, VirtualBox)
 */
class VMProviderTreeItem extends TreeItem {
	constructor(
		public readonly provider: VMProvider,
		public readonly label: string,
		public readonly collapsibleState: TreeItemCollapsibleState,
		isAvailable: boolean,
		unavailableReason?: string,
	) {
		super(label, collapsibleState)
		this.contextValue = 'vmProvider'
		this.iconPath = new ThemeIcon('server-environment')
		this.description = isAvailable ? '' : 'Not Available'
		this.tooltip = isAvailable
			? `${label} VM Provider`
			: `${label}: ${unavailableReason ?? 'Not available'}`
	}
}

/**
 * Tree item representing a VM
 */
class VMTreeItem extends TreeItem {
	constructor(
		public readonly vm: VM,
		public readonly provider: VMProvider,
	) {
		super(vm.name, TreeItemCollapsibleState.None)
		this.contextValue = this.getContextValue()
		this.iconPath = this.getIcon()
		this.description = this.getDescription()
		this.tooltip = this.getTooltip()
	}

	private getContextValue(): string {
		const isCHR = this.vm.chrMetadata?.isCHR ?? false
		const isRunning = this.vm.status === 'running'
		const isStopped = this.vm.status === 'stopped'

		// Context values for when clauses in package.json
		let context = 'vm'
		if (isCHR) context += '.chr'
		if (isRunning) context += '.running'
		if (isStopped) context += '.stopped'

		log.debug(`[VMTreeItem.getContextValue] "${this.vm.name}" => "${context}" (chr=${isCHR}, status=${this.vm.status})`)

		return context
	}

	private getIcon(): ThemeIcon {
		// Simple status indicator icon
		switch (this.vm.status) {
			case 'running':
				return new ThemeIcon('circle-filled', new ThemeColor('testing.iconPassed'))
			case 'stopped':
				return new ThemeIcon('circle-outline')
			case 'paused':
				return new ThemeIcon('debug-pause', new ThemeColor('testing.iconQueued'))
			case 'unknown':
				return new ThemeIcon('question', new ThemeColor('problemsWarningIcon.foreground'))
		}
	}

	private getDescription(): string {
		const parts: string[] = []

		// Status badge
		if (this.vm.status === 'running') {
			parts.push('●')
		}

		// CHR version if available
		if (this.vm.chrMetadata?.version) {
			parts.push(`v${this.vm.chrMetadata.version}`)
		}

		return parts.join(' ')
	}

	private getTooltip(): string {
		const lines: string[] = [
			`Name: ${this.vm.name}`,
			`Status: ${this.vm.status}`,
		]

		if (this.vm.id) {
			lines.push(`ID: ${this.vm.id}`)
		}

		if (this.vm.chrMetadata?.version) {
			lines.push(`RouterOS CHR ${this.vm.chrMetadata.version}`)
		}

		if (this.vm.chrMetadata?.architecture) {
			lines.push(`Architecture: ${this.vm.chrMetadata.architecture}`)
		}

		return lines.join('\n')
	}
}

/**
 * Tree data provider for CHR VM Explorer
 */
export class CHRVMExplorerProvider implements TreeDataProvider<TreeItem> {
	private _onDidChangeTreeData = new EventEmitter<TreeItem | undefined | null | undefined>()
	readonly onDidChangeTreeData: Event<TreeItem | undefined | null | undefined> = this._onDidChangeTreeData.event

	private treeView?: TreeView<TreeItem>

	/**
	 * Refresh the tree view
	 */
	refresh(): void {
		log.debug('[CHRVMExplorer] Refreshing tree view')
		this._onDidChangeTreeData.fire(undefined)
	}

	/**
	 * Dispose resources
	 */
	dispose(): void {
		this._onDidChangeTreeData.dispose()
	}

	/**
	 * Get tree item for display
	 */
	getTreeItem(element: TreeItem): TreeItem {
		return element
	}

	/**
	 * Get children of a tree item
	 */
	getChildren(element?: TreeItem): ProviderResult<TreeItem[]> {
		if (!element) {
			// Root level: show providers
			return this.getProviders()
		}

		if (element instanceof VMProviderTreeItem) {
			// Provider level: show VMs
			return this.getVMs(element.provider)
		}

		// VMs have no children
		return []
	}

	/**
	 * Get available VM providers
	 */
	private async getProviders(): Promise<TreeItem[]> {
		try {
			const providers = await vmProviderRegistry.getAvailableProviders()

			if (providers.length === 0) {
				// Show a welcome message
				return [this.createWelcomeItem()]
			}

				return await Promise.all(providers.map(async provider => {
				const label = this.getProviderLabel(provider.getPlatform())
				const isAvailable = await provider.isAvailable()
				const unavailableReason = !isAvailable
					? await provider.getUnavailableReason?.()
					: undefined
				const state = isAvailable
					? TreeItemCollapsibleState.Expanded
					: TreeItemCollapsibleState.None

				return new VMProviderTreeItem(provider, label, state, isAvailable, unavailableReason)
			}))
		}
		catch (error) {
			log.error('[CHRVMExplorer] Failed to get providers', error)
			return [this.createErrorItem('Failed to load VM providers')]
		}
	}

	/**
	 * Get VMs from a provider
	 */
	private async getVMs(provider: VMProvider): Promise<TreeItem[]> {
		try {
			if (!(await provider.isAvailable())) {
				const unavailableReason = await provider.getUnavailableReason?.()
				return [this.createInfoItem(unavailableReason ?? 'Provider not available')]
			}

			// Get CHR VMs specifically
			const chrVMs = await provider.listCHRVMs()

			if (chrVMs.length === 0) {
				return [this.createInfoItem('No CHR VMs found')]
			}

			// Sort by version (newest first)
			const sorted = sortCHRVMsByVersion(chrVMs)

			return sorted.map(vm => new VMTreeItem(vm, provider))
		}
		catch (error) {
			log.error('[CHRVMExplorer] Failed to list VMs', error)
			return [this.createErrorItem('Failed to list VMs')]
		}
	}

	/**
	 * Create a welcome tree item
	 */
	private createWelcomeItem(): TreeItem {
		const item = new TreeItem('No VM providers available', TreeItemCollapsibleState.None)
		item.contextValue = 'welcome'
		item.iconPath = new ThemeIcon('info')
		item.tooltip = 'Install UTM or other supported VM software'
		return item
	}

	/**
	 * Create an info tree item
	 */
	private createInfoItem(message: string): TreeItem {
		const item = new TreeItem(message, TreeItemCollapsibleState.None)
		item.contextValue = 'info'
		item.iconPath = new ThemeIcon('info')
		return item
	}

	/**
	 * Create an error tree item
	 */
	private createErrorItem(message: string): TreeItem {
		const item = new TreeItem(message, TreeItemCollapsibleState.None)
		item.contextValue = 'error'
		item.iconPath = new ThemeIcon('error')
		return item
	}

	/**
	 * Get display label for a provider platform
	 */
	private getProviderLabel(platform: string): string {
		switch (platform) {
			case 'utm':
				return 'UTM (macOS)'
			case 'virtualbox':
				return 'VirtualBox'
			case 'libvirt':
				return 'Libvirt (Linux)'
			case 'hyperv':
				return 'Hyper-V (Windows)'
			default:
				return platform
		}
	}

	/**
	 * Register the tree view
	 */
	static register(context: ExtensionContext): CHRVMExplorerProvider {
		const provider = new CHRVMExplorerProvider()

		const treeView = window.createTreeView('chrVMExplorer', {
			treeDataProvider: provider,
			showCollapseAll: true,
		})

		provider.treeView = treeView

		context.subscriptions.push(treeView)

		log.info('[CHRVMExplorer] Tree view registered')

		return provider
	}

	/**
	 * Get the tree view instance
	 */
	getTreeView(): TreeView<TreeItem> | undefined {
		return this.treeView
	}
}
