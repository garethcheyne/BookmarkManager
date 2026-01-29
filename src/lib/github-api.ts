import type { GistInfo, RepoInfo, SharedCollection } from '@/types'

const GITHUB_API_BASE = 'https://api.github.com'

/**
 * UTF-8 safe base64 encoding (handles Unicode characters like emojis)
 */
function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str)
  const binString = Array.from(bytes, (byte) => String.fromCodePoint(byte)).join('')
  return btoa(binString)
}

/**
 * UTF-8 safe base64 decoding (handles Unicode characters like emojis)
 */
function base64ToUtf8(base64: string): string {
  const binString = atob(base64)
  const bytes = Uint8Array.from(binString, (char) => char.codePointAt(0)!)
  return new TextDecoder().decode(bytes)
}

/**
 * GitHub API Error
 */
export class GitHubApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: unknown
  ) {
    super(message)
    this.name = 'GitHubApiError'
  }
}

/**
 * Make authenticated request to GitHub API
 */
async function githubFetch<T>(
  endpoint: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${GITHUB_API_BASE}${endpoint}`

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new GitHubApiError(
      error.message || `GitHub API error: ${response.status}`,
      response.status,
      error
    )
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T
  }

  return response.json()
}

/**
 * GitHub User API
 */
export const userApi = {
  /**
   * Get authenticated user info
   */
  async getUser(token: string): Promise<{ login: string; avatar_url: string; name: string }> {
    return githubFetch('/user', token)
  },
}

/**
 * GitHub Gists API
 */
export const gistsApi = {
  /**
   * List user's gists
   */
  async list(token: string, page = 1, perPage = 30): Promise<GistInfo[]> {
    const gists = await githubFetch<any[]>(`/gists?page=${page}&per_page=${perPage}`, token)
    return gists.map(mapGist)
  },

  /**
   * Get a single gist by ID
   */
  async get(token: string, gistId: string): Promise<GistInfo> {
    const gist = await githubFetch<any>(`/gists/${gistId}`, token)
    return mapGist(gist)
  },

  /**
   * Get a public gist (no auth required)
   */
  async getPublic(gistId: string): Promise<GistInfo> {
    const response = await fetch(`${GITHUB_API_BASE}/gists/${gistId}`, {
      headers: { Accept: 'application/vnd.github.v3+json' },
    })

    if (!response.ok) {
      throw new GitHubApiError('Gist not found', response.status)
    }

    const gist = await response.json()
    return mapGist(gist)
  },

  /**
   * Create a new gist
   */
  async create(
    token: string,
    options: {
      description: string
      isPublic: boolean
      files: Record<string, { content: string }>
    }
  ): Promise<GistInfo> {
    const gist = await githubFetch<any>('/gists', token, {
      method: 'POST',
      body: JSON.stringify({
        description: options.description,
        public: options.isPublic,
        files: options.files,
      }),
    })
    return mapGist(gist)
  },

  /**
   * Update an existing gist
   */
  async update(
    token: string,
    gistId: string,
    options: {
      description?: string
      files: Record<string, { content: string } | null>
    }
  ): Promise<GistInfo> {
    const gist = await githubFetch<any>(`/gists/${gistId}`, token, {
      method: 'PATCH',
      body: JSON.stringify(options),
    })
    return mapGist(gist)
  },

  /**
   * Delete a gist
   */
  async delete(token: string, gistId: string): Promise<void> {
    await githubFetch(`/gists/${gistId}`, token, { method: 'DELETE' })
  },

  /**
   * Get raw content of a gist file
   */
  async getFileContent(rawUrl: string): Promise<string> {
    const response = await fetch(rawUrl)
    if (!response.ok) {
      throw new GitHubApiError('Failed to fetch gist content', response.status)
    }
    return response.text()
  },
}

/**
 * GitHub Repos API
 */
export const reposApi = {
  /**
   * List user's repos
   */
  async list(token: string, page = 1, perPage = 30): Promise<RepoInfo[]> {
    const repos = await githubFetch<any[]>(
      `/user/repos?page=${page}&per_page=${perPage}&sort=updated`,
      token
    )
    return repos.map(mapRepo)
  },

  /**
   * Get a single repo
   */
  async get(token: string, owner: string, repo: string): Promise<RepoInfo> {
    const repoData = await githubFetch<any>(`/repos/${owner}/${repo}`, token)
    return mapRepo(repoData)
  },

  /**
   * Create a new repo
   */
  async create(
    token: string,
    options: {
      name: string
      description: string
      isPrivate: boolean
    }
  ): Promise<RepoInfo> {
    const repo = await githubFetch<any>('/user/repos', token, {
      method: 'POST',
      body: JSON.stringify({
        name: options.name,
        description: options.description,
        private: options.isPrivate,
        auto_init: true,
      }),
    })
    return mapRepo(repo)
  },

  /**
   * Get file content from repo
   */
  async getFileContent(
    token: string,
    owner: string,
    repo: string,
    path: string
  ): Promise<string> {
    const file = await githubFetch<{ content: string; encoding: string }>(
      `/repos/${owner}/${repo}/contents/${path}`,
      token
    )

    if (file.encoding === 'base64') {
      return base64ToUtf8(file.content.replace(/\n/g, ''))
    }
    return file.content
  },

  /**
   * Create or update file in repo
   */
  async putFile(
    token: string,
    owner: string,
    repo: string,
    path: string,
    content: string,
    message: string,
    sha?: string
  ): Promise<void> {
    await githubFetch(`/repos/${owner}/${repo}/contents/${path}`, token, {
      method: 'PUT',
      body: JSON.stringify({
        message,
        content: utf8ToBase64(content),
        sha,
      }),
    })
  },

  /**
   * Get file SHA (needed for updates)
   */
  async getFileSha(
    token: string,
    owner: string,
    repo: string,
    path: string
  ): Promise<string | null> {
    try {
      const file = await githubFetch<{ sha: string }>(
        `/repos/${owner}/${repo}/contents/${path}`,
        token
      )
      return file.sha
    } catch (error) {
      if (error instanceof GitHubApiError && error.status === 404) {
        return null
      }
      throw error
    }
  },
}

/**
 * Map GitHub API gist response to our GistInfo type
 */
function mapGist(gist: any): GistInfo {
  return {
    id: gist.id,
    url: gist.url,
    htmlUrl: gist.html_url,
    description: gist.description || '',
    isPublic: gist.public,
    createdAt: gist.created_at,
    updatedAt: gist.updated_at,
    files: Object.fromEntries(
      Object.entries(gist.files).map(([name, file]: [string, any]) => [
        name,
        {
          filename: file.filename,
          type: file.type,
          language: file.language,
          rawUrl: file.raw_url,
          size: file.size,
          content: file.content,
        },
      ])
    ),
  }
}

/**
 * Map GitHub API repo response to our RepoInfo type
 */
function mapRepo(repo: any): RepoInfo {
  return {
    id: repo.id,
    name: repo.name,
    fullName: repo.full_name,
    description: repo.description || '',
    isPrivate: repo.private,
    htmlUrl: repo.html_url,
    cloneUrl: repo.clone_url,
    defaultBranch: repo.default_branch,
    createdAt: repo.created_at,
    updatedAt: repo.updated_at,
    owner: {
      login: repo.owner?.login || '',
      avatarUrl: repo.owner?.avatar_url || '',
    },
  }
}

/**
 * Parse a GitHub Gist URL to extract the gist ID
 */
export function parseGistUrl(url: string): string | null {
  // Formats:
  // https://gist.github.com/username/gist_id
  // https://gist.github.com/gist_id
  // gist_id (just the ID)

  if (!url.includes('/') && !url.includes('.')) {
    // Assume it's just the ID
    return url.trim()
  }

  try {
    const parsed = new URL(url)
    if (parsed.hostname === 'gist.github.com') {
      const parts = parsed.pathname.split('/').filter(Boolean)
      return parts[parts.length - 1] || null
    }
  } catch {
    // Not a valid URL
  }

  return null
}

/**
 * Parse a GitHub Repo URL to extract owner and repo name
 */
export function parseRepoUrl(url: string): { owner: string; repo: string } | null {
  // Formats:
  // https://github.com/owner/repo
  // owner/repo

  if (url.includes('/') && !url.includes('://')) {
    const parts = url.split('/')
    if (parts.length === 2) {
      return { owner: parts[0], repo: parts[1] }
    }
  }

  try {
    const parsed = new URL(url)
    if (parsed.hostname === 'github.com') {
      const parts = parsed.pathname.split('/').filter(Boolean)
      if (parts.length >= 2) {
        return { owner: parts[0], repo: parts[1] }
      }
    }
  } catch {
    // Not a valid URL
  }

  return null
}

/**
 * Create bookmark collection JSON for sharing
 */
export function createCollectionJson(collection: SharedCollection): string {
  return JSON.stringify(collection, null, 2)
}

/**
 * Parse bookmark collection from JSON
 */
export function parseCollectionJson(json: string): SharedCollection {
  const data = JSON.parse(json)

  if (!data.version || !data.metadata || !data.bookmarks) {
    throw new Error('Invalid bookmark collection format')
  }

  return data as SharedCollection
}
