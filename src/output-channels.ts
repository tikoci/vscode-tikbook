import type { LogOutputChannel } from 'vscode';
import { window } from 'vscode';

/**
 * Centralized output channel management for TikBook extension.
 *
 * This module provides single instances of output channels for each feature area,
 * preventing duplicate channels in the Output panel and ensuring consistent error handling.
 *
 * Pattern: Similar to vscode-compat.ts for version features
 */

/**
 * Create output channel with logging support, falling back to regular output if unavailable
 * @param name - Channel name displayed in Output panel
 * @returns LogOutputChannel instance with error handling for older VS Code versions
 */
function createLogChannel(name: string): LogOutputChannel {
  try {
    // Try to create with logging support (1.74.0+)
    return window.createOutputChannel(name, { log: true })
  } catch {
    // Fallback for older versions - cast to LogOutputChannel for compatibility
    return window.createOutputChannel(name) as LogOutputChannel
  }
}

// Singleton instances
let tikbookChannel: LogOutputChannel | null = null;
let routerOSLSPChannel: LogOutputChannel | null = null;

/**
 * Get the main TikBook output channel for extension-wide logging
 * @returns Shared LogOutputChannel for general extension logs
 */
export function getTikBookChannel(): LogOutputChannel {
  tikbookChannel ??= createLogChannel('TikBook');
  return tikbookChannel;
}


/**
 * Get the RouterOS LSP coordination output channel
 * @returns Shared LogOutputChannel for LSP integration logs
 * @note Future: Used for debugging LSP server communication
 */
export function getRouterOSLSPChannel(): LogOutputChannel {
  routerOSLSPChannel ??= createLogChannel('RouterOS LSP');
  return routerOSLSPChannel;
}
