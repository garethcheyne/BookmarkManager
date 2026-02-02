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

  try {
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
  } catch (error) {
    // If it's already a GitHubApiError, rethrow it
    if (error instanceof GitHubApiError) {
      throw error
    }
    
    // Handle network errors
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new GitHubApiError(
        'Network error: Unable to reach GitHub API. Check your internet connection.',
        0,
        error
      )
    }
    
    // Handle other fetch errors
    throw new GitHubApiError(
      `Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      0,
      error
    )
  }
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

/**
 * Generate README content for synced bookmark repository
 */
export function generateSyncReadme(folderName: string, fileName: string = 'bookmarks.json', bookmarkData?: string): string {
  // Parse bookmark data to generate folder tree
  let folderTree = ''
  let totalBookmarks = 0
  let totalFolders = 0
  let allTags: string[] = []
  
  if (bookmarkData) {
    try {
      const data = JSON.parse(bookmarkData)
      totalBookmarks = (data.bookmarks?.length || 0)
      totalFolders = (data.folders?.length || 0)
      allTags = data.metadata?.tags || []
      
      // Generate folder tree
      if (data.folders && data.folders.length > 0) {
        folderTree = '\n## 📂 Folder Structure\n\n```\n'
        folderTree += `${folderName}/\n`
        
        // Build tree structure
        const pathMap = new Map<string, number>()
        data.folders.forEach((folder: any) => {
          pathMap.set(folder.path, folder.bookmarks?.length || 0)
        })
        
        // Sort paths for hierarchical display
        const sortedPaths = Array.from(pathMap.keys()).sort()
        const processedPaths = new Set<string>()
        
        sortedPaths.forEach((path, index) => {
          const parts = path.split('/')
          const bookmarkCount = pathMap.get(path) || 0
          const isLast = index === sortedPaths.length - 1
          
          parts.forEach((part, partIndex) => {
            const currentPath = parts.slice(0, partIndex + 1).join('/')
            if (!processedPaths.has(currentPath)) {
              processedPaths.add(currentPath)
              const indent = '  '.repeat(partIndex)
              const prefix = partIndex === parts.length - 1 ? (isLast ? '└── ' : '├── ') : '├── '
              const suffix = partIndex === parts.length - 1 ? ` (${bookmarkCount} bookmarks)` : ''
              folderTree += `${indent}${prefix}${part}/${suffix}\n`
            }
          })
        })
        
        folderTree += '```\n'
      }
      
      if (data.bookmarks && data.bookmarks.length > 0) {
        totalBookmarks += data.bookmarks.length
      }
    } catch (error) {
      console.error('Failed to parse bookmark data for README:', error)
    }
  }
  
  const stats = totalBookmarks > 0 ? `\n## 📊 Collection Stats\n\n- **Total Bookmarks:** ${totalBookmarks}\n- **Folders:** ${totalFolders}\n- **Tags:** ${allTags.length > 0 ? allTags.join(', ') : 'None'}\n- **Last Updated:** ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}\n` : ''

  // Generate actual file structure
  const fileStructure = fileName.includes('/') 
    ? `\`\`\`
${fileName.substring(0, fileName.lastIndexOf('/'))}
├── README.md          # This file (auto-generated)
└── ${fileName.substring(fileName.lastIndexOf('/') + 1)}      # Your bookmarks in JSON format
\`\`\``
    : `\`\`\`
.
├── README.md          # This file (auto-generated)
└── ${fileName}      # Your bookmarks in JSON format
\`\`\``

  return `# ${folderName}

> 🔖 Personal bookmark collection synced with BookStash

This repository contains your **${folderName}** bookmark collection, automatically synchronized from your browser. All bookmarks are stored in a structured JSON format with tags, notes, and metadata preserved.
${folderTree}${stats}
## 🔄 How Sync Works

### Automatic Synchronization
- **Push:** When you add, edit, or delete bookmarks in your browser, changes are automatically pushed to this repository
- **Structure Preservation:** Nested folders maintain their hierarchical structure using path notation
- **Metadata Included:** Tags, notes, creation dates, and custom metadata are all preserved
- **README Updates:** This file is automatically regenerated on each sync with current statistics

### Sync Triggers
1. Right-click folder → "Push to Repo" (manual sync)
2. Drag bookmarks while holding Ctrl/Cmd (auto-sync on drop)
3. Force Sync All button in settings (bulk sync)
4. Automatic cleanup when folders are renamed or deleted

### What Gets Synced
- ✅ Bookmark titles and URLs
- ✅ Folder organization and hierarchy
- ✅ Custom tags you've added
- ✅ Personal notes on bookmarks
- ✅ Date added timestamps
- ✅ Folder structure (nested paths)

## 📄 File Structure

${fileStructure}

## 🔍 Data Format

Your bookmarks are stored in \`${fileName}\` using this structure:

\`\`\`json
{
  "version": "1.0",
  "metadata": {
    "name": "${folderName}",
    "description": "...",
    "author": "Your GitHub username",
    "created": "2026-02-02T12:00:00.000Z",
    "updated": "2026-02-02T15:30:00.000Z",
    "tags": ["tag1", "tag2"],
    "isPublic": false
  },
  "bookmarks": [
    {
      "title": "Example Site",
      "url": "https://example.com",
      "dateAdded": "2026-01-15T10:00:00.000Z",
      "tags": ["work", "reference"],
      "notes": "Optional notes"
    }
  ],
  "folders": [
    {
      "name": "Subfolder",
      "path": "Parent/Subfolder",
      "bookmarks": [...]
    }
  ]
}
\`\`\`

### Format Details
- **Folders:** Use \`path\` property with \`/\` separators for nested structures (e.g., \`"Work/Projects/2024"\`)
- **Bookmarks:** Each has title, URL, optional tags array, optional notes, and creation timestamp
- **Metadata:** Collection-level info including aggregate tags and sync timestamps

## 💡 Usage

### Import to Browser
1. Install [BookStash extension](https://github.com/garethcheyne/BookmarkManager)
2. Right-click any folder in your bookmarks
3. Select "Import from GitHub" → "Repository"
4. Enter this repository URL
5. Bookmarks are imported with full metadata

### Share with Others
- **Public Repos:** Anyone can import your bookmarks using the repo URL
- **Private Repos:** Only you and collaborators can access
- **Team Collections:** Perfect for sharing curated bookmark lists

### Manual Editing
You can edit \`${fileName}\` directly:
- Add new bookmarks to the \`bookmarks\` or \`folders\` arrays
- Modify titles, URLs, tags, or notes
- Next sync will merge your changes (may prompt for conflict resolution)

## 🔧 Maintenance

### Automatic Cleanup
BookStash automatically maintains repository cleanliness:
- **Folder Deletion:** Removes corresponding JSON file
- **Folder Rename:** Deletes old file, creates new one with updated name
- **Orphan Detection:** Scans for and removes any leftover bookmark files not linked to active folders

### Version Control
All changes are tracked through Git commits:
- Each sync creates a commit with descriptive message
- Full history preserved for rollback if needed
- Use GitHub's history view to see bookmark evolution

## ⚙️ Powered By

**BookStash** - Modern bookmark management for Chrome & Edge
- GitHub: [garethcheyne/BookmarkManager](https://github.com/garethcheyne/BookmarkManager)
- Features: GitHub sync, tags, search, duplicate detection, multi-select
- Privacy: All tokens stored locally, direct GitHub API access

---

*📅 Last synced: ${new Date().toISOString().split('T')[0]} • 🔖 Synced with BookStash*
`
}
