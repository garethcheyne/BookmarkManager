/**
 * Shared collection format for Gists and Repos
 */
export interface SharedCollection {
  version: '1.0'
  metadata: CollectionMetadata
  bookmarks: SharedBookmark[]
  folders: SharedFolder[]
}

export interface CollectionMetadata {
  name: string
  description: string
  author: string
  authorGithub?: string
  created: string // ISO 8601
  updated: string // ISO 8601
  tags: string[]
  isPublic: boolean
  source: 'gist' | 'repo'
  sourceId?: string // Gist ID or Repo full name
  sourceUrl?: string
}

/**
 * Bookmark format for sharing (excludes local-only data)
 */
export interface SharedBookmark {
  title: string
  url: string
  tags?: string[]
  notes?: string
  dateAdded?: string // ISO 8601
}

/**
 * Folder structure for sharing
 */
export interface SharedFolder {
  name: string
  path: string // e.g., "Development/React"
  bookmarks: SharedBookmark[]
}

/**
 * GitHub Gist structure
 */
export interface GistInfo {
  id: string
  url: string
  htmlUrl: string
  description: string
  isPublic: boolean
  createdAt: string
  updatedAt: string
  files: Record<string, GistFile>
}

export interface GistFile {
  filename: string
  type: string
  language: string
  rawUrl: string
  size: number
  content?: string
}

/**
 * GitHub Repository structure for bookmark collections
 */
export interface RepoInfo {
  id: number
  name: string
  fullName: string
  description: string
  isPrivate: boolean
  htmlUrl: string
  cloneUrl?: string
  defaultBranch: string
  createdAt?: string
  updatedAt?: string
  owner: {
    login: string
    avatarUrl: string
  }
}

/**
 * Subscription to a shared collection
 */
export interface Subscription {
  id: string
  type: 'gist' | 'repo'
  sourceId: string
  sourceUrl: string
  name: string
  author: string
  lastSynced?: string
  syncFrequency: 'manual' | 'daily' | 'weekly'
  autoMerge: boolean
  localFolderId?: string // Where to sync bookmarks
}

/**
 * Import/merge strategies
 */
export type MergeStrategy = 'append' | 'replace' | 'smart'

export interface ImportOptions {
  strategy: MergeStrategy
  targetFolderId?: string
  skipDuplicates: boolean
  preserveTags: boolean
}

/**
 * Export options
 */
export interface ExportOptions {
  format: 'json' | 'html' | 'chrome'
  includeMetadata: boolean
  includeNotes: boolean
  includeTags: boolean
  selectedIds?: string[]
}

/**
 * GitHub OAuth token
 */
export interface GitHubAuth {
  accessToken: string
  tokenType: string
  scope: string
  expiresAt?: number
  username?: string
  avatarUrl?: string
}
