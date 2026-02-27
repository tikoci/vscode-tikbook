/* GitHub Repo Fetch */

import * as axios from 'axios';
import type { Disposable } from 'vscode';
import { commands, ThemeIcon, window } from 'vscode';
import { getSettings } from './config';
import { log } from './shared';

// MARK: ssh

export function initializeSSH(): Disposable[] {
  log.debug(`<SSH> {initalizeSSH}`)
  return [
    commands.registerCommand('tikbook.open.terminal.router', () => openTerminalRouter()),
  ]
}

export function openTerminalRouter(): void {
  const settings = getSettings()
  const url = URL.parse(settings.baseUrl)
  if (!url) {
    log.error(`<openTerminalRouter> got no URL`)
    void window.showWarningMessage(`Could not open SSH terminal.  TikBook 'Base URL' setting is invalid.`)
    return
  }
  const connuri = `${settings.username}@${url.hostname}`
  const terminal = window.createTerminal({
    name: `ssh ${connuri}`,
    iconPath: new ThemeIcon('mikrotik-icon-line'),
  })
  log.info(`<SSH> {openTerminalRouter} ${settings.sshCommand} ${connuri}`)
  terminal.sendText(`${settings.sshCommand} ${connuri}`)
  terminal.show(false)
}

// MARK: github wraper

export interface GitHubRepo {
  name: string
  description: string | null
  html_url: string
  language: string | null
  stargazers_count: number
  updated_at: string
  git_url: string
}

export async function fetchGitHubRepos(organization = 'tikoci'): Promise<GitHubRepo[]> {
  try {
    log.debug(`<fetchGitHubRepos> invoked ${organization}`)
    const response = await axios.default.get<GitHubRepo[]>(
      `https://api.github.com/orgs/${organization}/repos`,
      {
        params: {
          type: 'public',
          sort: 'updated',
          per_page: 100,
        },
        headers: {
          'User-Agent': 'VSCode-Extension',
          'Accept': 'application/vnd.github.v3+json',
        },
        timeout: 10000,
      },
    )

    return response.data
  }
  catch (_error: unknown) {
    if (axios.isAxiosError(_error)) {
      const error = _error as axios.AxiosError
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        throw new Error(`GitHub API error: ${error.response.status} ${error.response.statusText}`, { cause: _error })
      }

      else if (error.request) {
        // The request was made but no response was received
        throw new Error('Network error: Unable to reach GitHub API', { cause: _error })
      }

      else if (error.code === 'ECONNABORTED') {
        // Request timeout
        throw new Error('Request timeout: GitHub API is taking too long to respond', { cause: _error })
      }

      else {
        // Something happened in setting up the request that triggered an Error
        throw new Error(`Request error: ${error.message || 'Unknown error occurred'}`, { cause: _error })
      }
    }
    throw new Error('Unknown error', { cause: _error })
  }
}

// MARK: CHR releases (RouterOS mikropkl)

export interface GitHubRelease {
  tag_name: string
  name: string | null
  draft: boolean
  prerelease: boolean
  published_at: string
  assets: GitHubReleaseAsset[]
}

export interface GitHubReleaseAsset {
  name: string
  size: number
  download_count: number
  created_at: string
  updated_at: string
  browser_download_url: string
}

/** CHR VM image metadata extracted from mikropkl asset filename */
export interface CHRReleaseImage {
  isRoseQuickstart: boolean
  architecture: 'aarch64' | 'x86_64'
  backend: 'apple' | 'qemu'
  routerOSVersion: string
  downloadUrl: string
  assetName: string
  sizeBytes: number
  downloadCount: number
}

/** Parsed CHR release with available images */
export interface CHRRelease {
  routerOSVersion: string
  releaseDate: string
  images: CHRReleaseImage[]
}

/**
 * Fetch RouterOS CHR releases from tikoci/mikropkl GitHub repository.
 * Filters to only releases matching pattern: chr-{version}
 * Returns parsed CHR image metadata (architecture, backend, download URLs).
 *
 * @param org - GitHub organization (default: tikoci)
 * @param repo - GitHub repository (default: mikropkl)
 * @returns Array of CHR releases with available images, sorted newest first
 * @throws Error if GitHub API fails or no CHR releases found
 */
export async function fetchCHRReleases(org = 'tikoci', repo = 'mikropkl'): Promise<CHRRelease[]> {
  try {
    log.debug(`<fetchCHRReleases> invoked ${org}/${repo}`)
    const response = await axios.default.get<GitHubRelease[]>(
      `https://api.github.com/repos/${org}/${repo}/releases`,
      {
        headers: {
          'User-Agent': 'VSCode-Extension',
          'Accept': 'application/vnd.github.v3+json',
        },
        timeout: 10000,
      },
    )

    const chrReleases: CHRRelease[] = []
    const assetPattern = /^(rose\.)?chr\.([^.]+)\.([^.]+)\.(.+)\.utm\.zip$/
    log.debug(`<fetchCHRReleases> Fetched ${response.data.length} releases from GitHub`)

    let processedCount = 0
    let assetCount = 0

    for (const release of response.data) {
      // Filter to CHR releases only (tag format: chr-X.Y.Z or chr-X.YrcN)
      const versionMatch = release.tag_name.match(/^chr-(.+)$/)
      if (!versionMatch) continue

      processedCount++
      const routerOSVersion = versionMatch[1]
      log.debug(`<fetchCHRReleases> Processing release: ${release.tag_name}`)
      
      const images: CHRReleaseImage[] = []

      // Parse assets to extract CHR image metadata
      for (const asset of release.assets) {
        const match = asset.name.match(assetPattern)
        if (!match) {
          log.debug(`<fetchCHRReleases>   Skipping asset: ${asset.name} (doesn't match CHR pattern)`)
          continue
        }

        assetCount++
        log.debug(`<fetchCHRReleases>   Found CHR image: ${asset.name} (${asset.size} bytes, ${asset.download_count} downloads)`)

        images.push({
          isRoseQuickstart: match[1] === 'rose.',
          architecture: match[2] as 'aarch64' | 'x86_64',
          backend: match[3] as 'apple' | 'qemu',
          routerOSVersion,
          downloadUrl: asset.browser_download_url,
          assetName: asset.name,
          sizeBytes: asset.size,
          downloadCount: asset.download_count,
        })
      }

      // Only include releases that have at least one CHR image
      if (images.length > 0) {
        chrReleases.push({
          routerOSVersion,
          releaseDate: release.published_at,
          images,
        })
        log.info(`<fetchCHRReleases> Release ${release.tag_name}: ${images.length} CHR image(s)`)
      }
    }

    log.info(`<fetchCHRReleases> Processed ${processedCount} CHR releases, found ${assetCount} total images`)

    if (chrReleases.length === 0) {
      log.warn(`<fetchCHRReleases> No CHR releases found after processing ${response.data.length} GitHub releases`)
      throw new Error('No CHR releases found in tikoci/mikropkl repository')
    }

    log.info(`<fetchCHRReleases> Returning ${chrReleases.length} CHR versions with ${chrReleases.reduce((sum, r) => sum + r.images.length, 0)} total images`)
    return chrReleases
  }
  catch (_error: unknown) {
    log.error(`<fetchCHRReleases> Error fetching releases`, _error)
    
    if (axios.isAxiosError(_error)) {
      const error = _error as axios.AxiosError
      if (error.response) {
        const msg = `GitHub API error: ${error.response.status} ${error.response.statusText}`
        log.error(`<fetchCHRReleases> ${msg}`)
        throw new Error(msg, { cause: _error })
      }

      else if (error.request) {
        const msg = 'Network error: Unable to reach GitHub API'
        log.error(`<fetchCHRReleases> ${msg}`)
        throw new Error(msg, { cause: _error })
      }

      else if (error.code === 'ECONNABORTED') {
        const msg = 'Request timeout: GitHub API is taking too long to respond'
        log.error(`<fetchCHRReleases> ${msg}`)
        throw new Error(msg, { cause: _error })
      }

      else {
        const msg = `Request error: ${error.message || 'Unknown error occurred'}`
        log.error(`<fetchCHRReleases> ${msg}`)
        throw new Error(msg, { cause: _error })
      }
    }

    if (_error instanceof Error && _error.message.includes('No CHR releases')) {
      throw _error
    }

    throw new Error('Unknown error', { cause: _error })
  }
}
