/* GitHub Repo Fetch */

import * as axios from 'axios'
import type { Disposable} from 'vscode';
import { commands, ThemeIcon, window } from 'vscode'
import { getSettings } from './config'
import { log } from './shared'

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
