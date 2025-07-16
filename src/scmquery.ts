/* GitHub Repo Fetch */

import * as axios from 'axios'
import { log } from './shared'

export interface GitHubRepo {
  name: string
  description: string | null
  html_url: string
  language: string | null
  stargazers_count: number
  updated_at: string
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
        throw new Error(`GitHub API error: ${error.response.status} ${error.response.statusText}`)
      }

      else if (error.request) {
        // The request was made but no response was received
        throw new Error('Network error: Unable to reach GitHub API')
      }

      else if (error.code === 'ECONNABORTED') {
        // Request timeout
        throw new Error('Request timeout: GitHub API is taking too long to respond')
      }

      else {
        // Something happened in setting up the request that triggered an Error
        throw new Error(`Request error: ${error.message || 'Unknown error occurred'}`)
      }
    }
    throw Error()
  }
}
