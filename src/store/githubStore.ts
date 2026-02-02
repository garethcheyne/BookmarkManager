import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { GitHubAuth, GistInfo, RepoInfo, Subscription } from '@/types'
import {
  getStoredAuth,
  clearAuth,
  authenticateWithToken,
  validateAuth,
} from '@/lib/github-auth'
import { gistsApi, reposApi, generateSyncReadme } from '@/lib/github-api'
import { storageLocal, storageSync } from '@/lib/chrome-api'
import { toast } from '@/components/ui/use-toast'

const SUBSCRIPTIONS_KEY = 'github_subscriptions'
const SHARED_GISTS_KEY = 'shared_gists'
const FOLDER_SHARES_KEY = 'folder_shares'
const REPO_COLORS_KEY = 'repo_colors'
const TAG_LIBRARY_KEY = 'tag_library'

// Predefined colors for repos
export const REPO_COLORS = [
  { name: 'Green', value: '#22c55e', bg: 'bg-green-500', bgLight: 'bg-green-100', bgDark: 'bg-green-900/50', text: 'text-green-700', textDark: 'text-green-400' },
  { name: 'Blue', value: '#3b82f6', bg: 'bg-blue-500', bgLight: 'bg-blue-100', bgDark: 'bg-blue-900/50', text: 'text-blue-700', textDark: 'text-blue-400' },
  { name: 'Purple', value: '#a855f7', bg: 'bg-purple-500', bgLight: 'bg-purple-100', bgDark: 'bg-purple-900/50', text: 'text-purple-700', textDark: 'text-purple-400' },
  { name: 'Orange', value: '#f97316', bg: 'bg-orange-500', bgLight: 'bg-orange-100', bgDark: 'bg-orange-900/50', text: 'text-orange-700', textDark: 'text-orange-400' },
  { name: 'Pink', value: '#ec4899', bg: 'bg-pink-500', bgLight: 'bg-pink-100', bgDark: 'bg-pink-900/50', text: 'text-pink-700', textDark: 'text-pink-400' },
  { name: 'Teal', value: '#14b8a6', bg: 'bg-teal-500', bgLight: 'bg-teal-100', bgDark: 'bg-teal-900/50', text: 'text-teal-700', textDark: 'text-teal-400' },
  { name: 'Red', value: '#ef4444', bg: 'bg-red-500', bgLight: 'bg-red-100', bgDark: 'bg-red-900/50', text: 'text-red-700', textDark: 'text-red-400' },
  { name: 'Yellow', value: '#eab308', bg: 'bg-yellow-500', bgLight: 'bg-yellow-100', bgDark: 'bg-yellow-900/50', text: 'text-yellow-700', textDark: 'text-yellow-400' },
] as const

export type RepoColor = typeof REPO_COLORS[number]

// Note: Auth is stored locally for security (token shouldn't sync across devices)
// Folder shares and subscriptions use sync storage to sync across devices

// Tracks which folders are linked to which GitHub resources
export interface FolderShare {
  folderId: string
  type: 'gist' | 'repo'
  resourceId: string // gist ID or "owner/repo"
  url: string
  name: string
  filePath?: string // For repos: the file path (e.g., "bookmarks/my-folder.json")
  lastSynced: string
}

interface GitHubState {
  // Auth
  auth: GitHubAuth | null
  isAuthenticated: boolean
  isAuthenticating: boolean
  authError: string | null

  // Gists
  userGists: GistInfo[]
  isLoadingGists: boolean

  // Repos
  userRepos: RepoInfo[]
  isLoadingRepos: boolean

  // Subscriptions
  subscriptions: Subscription[]

  // Shared gists (ones we've created)
  sharedGists: { gistId: string; name: string; createdAt: string }[]

  // Folder shares - maps folderId to share info
  folderShares: Record<string, FolderShare>

  // Repo colors - maps resourceId to color value
  repoColors: Record<string, string>

  // Tag library - list of tags that can be applied to bookmarks
  tagLibrary: string[]
}

interface GitHubActions {
  // Auth
  initialize: () => Promise<void>
  login: (token: string) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<boolean>

  // Gists
  fetchGists: () => Promise<void>
  createGist: (
    name: string,
    description: string,
    content: string,
    isPublic: boolean
  ) => Promise<GistInfo>
  updateGist: (gistId: string, content: string) => Promise<GistInfo>
  deleteGist: (gistId: string) => Promise<void>

  // Repos
  fetchRepos: () => Promise<void>
  createRepo: (name: string, description: string, isPrivate: boolean) => Promise<RepoInfo>
  saveToRepo: (
    owner: string,
    repo: string,
    content: string,
    message: string,
    filePath?: string, // Optional: custom file path (default: bookmarks.json)
    folderName?: string // Optional: folder name for README generation
  ) => Promise<void>
  deleteFileFromRepo: (
    owner: string,
    repo: string,
    filePath: string,
    message: string
  ) => Promise<void>
  cleanupOrphanedFiles: (owner: string, repo: string) => Promise<void>

  // Subscriptions
  loadSubscriptions: () => Promise<void>
  addSubscription: (subscription: Omit<Subscription, 'id'>) => Promise<void>
  removeSubscription: (id: string) => Promise<void>
  syncSubscription: (id: string) => Promise<void>

  // Track shared gists
  trackSharedGist: (gistId: string, name: string) => Promise<void>
  loadSharedGists: () => Promise<void>

  // Folder shares
  loadFolderShares: () => Promise<void>
  linkFolderToGist: (folderId: string, gistId: string, url: string, name: string) => Promise<void>
  linkFolderToRepo: (folderId: string, repoFullName: string, url: string, name: string, filePath: string) => Promise<void>
  unlinkFolder: (folderId: string) => Promise<void>
  getFolderShare: (folderId: string) => FolderShare | undefined
  updateFolderSyncTime: (folderId: string) => Promise<void>
  updateFolderShareName: (folderId: string, newName: string) => Promise<void>
  pullFromRepo: (folderId: string) => Promise<string | null>

  // Repo colors
  loadRepoColors: () => Promise<void>
  setRepoColor: (resourceId: string, color: string) => Promise<void>
  getRepoColor: (resourceId: string) => string | undefined

  // Tag library
  loadTagLibrary: () => Promise<void>
  addTagToLibrary: (tag: string) => Promise<void>
  removeTagFromLibrary: (tag: string) => Promise<void>
  setTagLibrary: (tags: string[]) => Promise<void>
}

type GitHubStore = GitHubState & GitHubActions

// Helper function to handle auth errors
async function handleAuthError(error: unknown, store: GitHubStore) {
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as any).status
    if (status === 401 || status === 403) {
      // Authentication error - notify user
      toast.error('Authentication Error', 'Your GitHub token is invalid or expired. Please reconnect your account.')
      // Clear invalid auth
      await store.logout()
      return true
    }
  }
  return false
}

export const useGitHubStore = create<GitHubStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    auth: null,
    isAuthenticated: false,
    isAuthenticating: false,
    authError: null,
    userGists: [],
    isLoadingGists: false,
    userRepos: [],
    isLoadingRepos: false,
    subscriptions: [],
    sharedGists: [],
    folderShares: {},
    repoColors: {},
    tagLibrary: [],

    // Initialize - check for existing auth
    initialize: async () => {
      // Always load folder shares, repo colors, and tag library (even if not authenticated)
      get().loadFolderShares()
      get().loadRepoColors()
      get().loadTagLibrary()

      const auth = await getStoredAuth()
      if (auth) {
        const isValid = await validateAuth(auth)
        if (isValid) {
          set({ auth, isAuthenticated: true })
          // Load user data
          get().fetchGists()
          get().fetchRepos()
          get().loadSubscriptions()
          get().loadSharedGists()
        } else {
          // Auth is no longer valid - clear it and notify user
          await clearAuth()
          toast.error('Session Expired', 'Your GitHub authentication has expired. Please reconnect your account.')
        }
      }
    },

    // Login with personal access token
    login: async (token: string) => {
      set({ isAuthenticating: true, authError: null })
      try {
        const auth = await authenticateWithToken(token)
        set({ auth, isAuthenticated: true, isAuthenticating: false })
        // Load user data
        get().fetchGists()
        get().fetchRepos()
        get().loadSubscriptions()
        get().loadSharedGists()
      } catch (error) {
        set({
          authError: (error as Error).message,
          isAuthenticating: false,
        })
        throw error
      }
    },

    // Logout
    logout: async () => {
      await clearAuth()
      set({
        auth: null,
        isAuthenticated: false,
        userGists: [],
        userRepos: [],
        subscriptions: [],
        sharedGists: [],
      })
    },

    // Check if auth is still valid
    checkAuth: async () => {
      const { auth } = get()
      if (!auth) return false
      const isValid = await validateAuth(auth)
      if (!isValid) {
        await get().logout()
      }
      return isValid
    },

    // Fetch user's gists
    fetchGists: async () => {
      const { auth } = get()
      if (!auth) return

      set({ isLoadingGists: true })
      try {
        const gists = await gistsApi.list(auth.accessToken)
        set({ userGists: gists, isLoadingGists: false })
      } catch (error) {
        console.error('Failed to fetch gists:', error)
        set({ isLoadingGists: false })
        
        // Check if it's an authentication error and handle it
        const wasAuthError = await handleAuthError(error, get())
        if (wasAuthError) return
        
        // For other errors, just log
        if (typeof chrome !== 'undefined' && chrome.runtime) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          console.warn('GitHub gists fetch failed, but continuing:', errorMessage)
        }
      }
    },

    // Create a new gist
    createGist: async (name, description, content, isPublic) => {
      const { auth } = get()
      if (!auth) throw new Error('Not authenticated')

      const filename = `${name.replace(/[^a-zA-Z0-9-_]/g, '-')}.json`
      const gist = await gistsApi.create(auth.accessToken, {
        description,
        isPublic,
        files: { [filename]: { content } },
      })

      // Refresh gists list
      get().fetchGists()

      // Track this shared gist
      await get().trackSharedGist(gist.id, name)

      return gist
    },

    // Update an existing gist
    updateGist: async (gistId, content) => {
      const { auth, userGists } = get()
      if (!auth) throw new Error('Not authenticated')

      const existingGist = userGists.find((g) => g.id === gistId)
      if (!existingGist) throw new Error('Gist not found')

      const filename = Object.keys(existingGist.files)[0]
      const gist = await gistsApi.update(auth.accessToken, gistId, {
        files: { [filename]: { content } },
      })

      get().fetchGists()
      return gist
    },

    // Delete a gist
    deleteGist: async (gistId) => {
      const { auth } = get()
      if (!auth) throw new Error('Not authenticated')

      await gistsApi.delete(auth.accessToken, gistId)
      get().fetchGists()

      // Remove from tracked gists
      const { sharedGists } = get()
      const updated = sharedGists.filter((g) => g.gistId !== gistId)
      await storageLocal.set({ [SHARED_GISTS_KEY]: updated })
      set({ sharedGists: updated })
    },

    // Fetch user's repos
    fetchRepos: async () => {
      const { auth } = get()
      if (!auth) return

      set({ isLoadingRepos: true })
      try {
        const repos = await reposApi.list(auth.accessToken)
        set({ userRepos: repos, isLoadingRepos: false })
      } catch (error) {
        console.error('Failed to fetch repos:', error)
        set({ isLoadingRepos: false })
        
        // Check if it's an authentication error and handle it
        const wasAuthError = await handleAuthError(error, get())
        if (wasAuthError) return
        
        // For other errors, just log
        if (typeof chrome !== 'undefined' && chrome.runtime) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          console.warn('GitHub repos fetch failed, but continuing:', errorMessage)
        }
      }
    },

    // Create a new repo
    createRepo: async (name, description, isPrivate) => {
      const { auth } = get()
      if (!auth) throw new Error('Not authenticated')

      const repo = await reposApi.create(auth.accessToken, {
        name,
        description,
        isPrivate,
      })

      get().fetchRepos()
      return repo
    },

    // Save bookmarks to a repo
    saveToRepo: async (owner, repo, content, message, filePath, folderName) => {
      const { auth } = get()
      if (!auth) throw new Error('Not authenticated')

      const path = filePath || 'bookmarks.json'

      // Check if file exists to get SHA
      const sha = await reposApi.getFileSha(auth.accessToken, owner, repo, path)

      // Save bookmarks file
      await reposApi.putFile(
        auth.accessToken,
        owner,
        repo,
        path,
        content,
        message,
        sha || undefined
      )

      // Also create/update README.md in repository root
      try {
        const readmePath = 'README.md'
        const readmeContent = generateSyncReadme(folderName || 'Bookmarks', path, content)
        const readmeSha = await reposApi.getFileSha(auth.accessToken, owner, repo, readmePath)
        
        await reposApi.putFile(
          auth.accessToken,
          owner,
          repo,
          readmePath,
          readmeContent,
          `Update README for ${folderName || 'bookmarks'}`,
          readmeSha || undefined
        )
      } catch (error) {
        console.warn('Failed to update README:', error)
        // Don't fail the whole operation if README update fails
      }
    },

    // Delete a file from a repo
    deleteFileFromRepo: async (owner, repo, filePath, message) => {
      const { auth } = get()
      if (!auth) throw new Error('Not authenticated')

      // Get the file SHA first
      const sha = await reposApi.getFileSha(auth.accessToken, owner, repo, filePath)
      if (!sha) {
        console.warn('File not found in repo:', filePath)
        return // File doesn't exist, nothing to delete
      }

      // Delete the file using GitHub API
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          sha,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to delete file: ${response.statusText}`)
      }
    },

    // Clean up orphaned bookmark files in a repository
    cleanupOrphanedFiles: async (owner, repo) => {
      const { auth, folderShares } = get()
      if (!auth) throw new Error('Not authenticated')

      try {
        // Get all files in the repository root and bookmarks/ directory
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`, {
          headers: {
            Authorization: `Bearer ${auth.accessToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        })

        if (!response.ok) {
          console.warn('Failed to fetch repo tree for cleanup')
          return
        }

        const data = await response.json()
        const files = data.tree.filter((item: any) => 
          item.type === 'blob' && 
          (item.path.endsWith('.json') && item.path !== 'package.json' && item.path !== 'package-lock.json')
        )

        // Get all current file paths from folder shares for this repo
        const currentFilePaths = new Set<string>()
        Object.values(folderShares).forEach((share) => {
          if (share.type === 'repo' && share.resourceId === `${owner}/${repo}`) {
            currentFilePaths.add(share.filePath || 'bookmarks.json')
          }
        })

        // Find orphaned files
        const orphanedFiles = files.filter((file: any) => !currentFilePaths.has(file.path))

        // Delete orphaned files
        for (const file of orphanedFiles) {
          console.log('Deleting orphaned file:', file.path)
          await get().deleteFileFromRepo(
            owner, 
            repo, 
            file.path, 
            `Cleanup: Remove orphaned bookmark file ${file.path}`
          )
        }

        if (orphanedFiles.length > 0) {
          console.log(`Cleaned up ${orphanedFiles.length} orphaned file(s) from ${owner}/${repo}`)
        }
      } catch (error) {
        console.error('Failed to cleanup orphaned files:', error)
        // Don't throw - this is a best-effort cleanup
      }
    },

    // Load subscriptions (from sync storage for cross-device sync)
    loadSubscriptions: async () => {
      const result = await storageSync.get<{ [SUBSCRIPTIONS_KEY]: Subscription[] }>([
        SUBSCRIPTIONS_KEY,
      ])
      set({ subscriptions: result[SUBSCRIPTIONS_KEY] || [] })
    },

    // Add subscription
    addSubscription: async (subscription) => {
      const { subscriptions } = get()
      const newSub: Subscription = {
        ...subscription,
        id: crypto.randomUUID(),
      }
      const updated = [...subscriptions, newSub]
      await storageSync.set({ [SUBSCRIPTIONS_KEY]: updated })
      set({ subscriptions: updated })
    },

    // Remove subscription
    removeSubscription: async (id) => {
      const { subscriptions } = get()
      const updated = subscriptions.filter((s) => s.id !== id)
      await storageSync.set({ [SUBSCRIPTIONS_KEY]: updated })
      set({ subscriptions: updated })
    },

    // Sync a subscription (fetch latest and import)
    syncSubscription: async (id) => {
      const { subscriptions } = get()
      const subscription = subscriptions.find((s) => s.id === id)
      if (!subscription) throw new Error('Subscription not found')

      // TODO: Implement actual sync logic using get().auth
      // This would fetch the gist/repo content and import bookmarks

      // Update last synced time
      const updated = subscriptions.map((s) =>
        s.id === id ? { ...s, lastSynced: new Date().toISOString() } : s
      )
      await storageSync.set({ [SUBSCRIPTIONS_KEY]: updated })
      set({ subscriptions: updated })
    },

    // Track a shared gist
    trackSharedGist: async (gistId, name) => {
      const { sharedGists } = get()
      const updated = [
        ...sharedGists,
        { gistId, name, createdAt: new Date().toISOString() },
      ]
      await storageLocal.set({ [SHARED_GISTS_KEY]: updated })
      set({ sharedGists: updated })
    },

    // Load shared gists
    loadSharedGists: async () => {
      const result = await storageLocal.get<{
        [SHARED_GISTS_KEY]: { gistId: string; name: string; createdAt: string }[]
      }>([SHARED_GISTS_KEY])
      set({ sharedGists: result[SHARED_GISTS_KEY] || [] })
    },

    // Load folder shares (from sync storage for cross-device sync)
    loadFolderShares: async () => {
      const result = await storageSync.get<{
        [FOLDER_SHARES_KEY]: Record<string, FolderShare>
      }>([FOLDER_SHARES_KEY])
      set({ folderShares: result[FOLDER_SHARES_KEY] || {} })
    },

    // Link a folder to a gist
    linkFolderToGist: async (folderId, gistId, url, name) => {
      const { folderShares } = get()
      const share: FolderShare = {
        folderId,
        type: 'gist',
        resourceId: gistId,
        url,
        name,
        lastSynced: new Date().toISOString(),
      }
      const updated = { ...folderShares, [folderId]: share }
      await storageSync.set({ [FOLDER_SHARES_KEY]: updated })
      set({ folderShares: updated })
    },

    // Link a folder to a repo
    linkFolderToRepo: async (folderId, repoFullName, url, name, filePath) => {
      const { folderShares } = get()
      const share: FolderShare = {
        folderId,
        type: 'repo',
        resourceId: repoFullName,
        url,
        name,
        filePath,
        lastSynced: new Date().toISOString(),
      }
      const updated = { ...folderShares, [folderId]: share }
      await storageSync.set({ [FOLDER_SHARES_KEY]: updated })
      set({ folderShares: updated })
    },

    // Unlink a folder
    unlinkFolder: async (folderId) => {
      const { folderShares } = get()
      const { [folderId]: _, ...rest } = folderShares
      await storageSync.set({ [FOLDER_SHARES_KEY]: rest })
      set({ folderShares: rest })
    },

    // Get folder share info
    getFolderShare: (folderId) => {
      return get().folderShares[folderId]
    },

    // Update folder sync time
    updateFolderSyncTime: async (folderId) => {
      const { folderShares } = get()
      const share = folderShares[folderId]
      if (!share) return

      const updated = {
        ...folderShares,
        [folderId]: { ...share, lastSynced: new Date().toISOString() },
      }
      await storageSync.set({ [FOLDER_SHARES_KEY]: updated })
      set({ folderShares: updated })
    },

    // Update folder share name (when folder is renamed)
    updateFolderShareName: async (folderId, newName) => {
      const { folderShares } = get()
      const share = folderShares[folderId]
      if (!share) return

      // Generate new file path based on new name
      const sanitizedName = newName.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase()
      const newFilePath = share.type === 'repo' ? `bookmarks/${sanitizedName}.json` : undefined

      // If it's a repo and file path changed, we'll handle the rename on next sync
      // The old file will remain (user can delete manually) and new file will be created
      const updated = {
        ...folderShares,
        [folderId]: {
          ...share,
          name: newName,
          filePath: newFilePath || share.filePath,
        },
      }
      await storageSync.set({ [FOLDER_SHARES_KEY]: updated })
      set({ folderShares: updated })
    },

    // Pull content from repo (for syncing changes from GitHub)
    pullFromRepo: async (folderId) => {
      const { folderShares, auth } = get()
      const share = folderShares[folderId]
      if (!share || !auth) return null

      try {
        if (share.type === 'repo') {
          const [owner, repo] = share.resourceId.split('/')
          const response = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${share.filePath || 'bookmarks.json'}`,
            {
              headers: {
                Authorization: `Bearer ${auth.accessToken}`,
                Accept: 'application/vnd.github.v3+json',
              },
            }
          )
          if (response.ok) {
            const data = await response.json()
            // Content is base64 encoded
            const content = atob(data.content)
            return content
          }
        } else if (share.type === 'gist') {
          const response = await fetch(
            `https://api.github.com/gists/${share.resourceId}`,
            {
              headers: {
                Authorization: `Bearer ${auth.accessToken}`,
                Accept: 'application/vnd.github.v3+json',
              },
            }
          )
          if (response.ok) {
            const data = await response.json()
            const files = Object.values(data.files) as Array<{ content: string }>
            if (files.length > 0) {
              return files[0].content
            }
          }
        }
      } catch (error) {
        console.error('Failed to pull from repo:', error)
      }
      return null
    },

    // Load repo colors (from sync storage for cross-device sync)
    loadRepoColors: async () => {
      const result = await storageSync.get<{
        [REPO_COLORS_KEY]: Record<string, string>
      }>([REPO_COLORS_KEY])
      set({ repoColors: result[REPO_COLORS_KEY] || {} })
    },

    // Set repo color
    setRepoColor: async (resourceId, color) => {
      const { repoColors } = get()
      const updated = { ...repoColors, [resourceId]: color }
      await storageSync.set({ [REPO_COLORS_KEY]: updated })
      set({ repoColors: updated })
    },

    // Get repo color
    getRepoColor: (resourceId) => {
      return get().repoColors[resourceId]
    },

    // Load tag library (from sync storage for cross-device sync)
    loadTagLibrary: async () => {
      const result = await storageSync.get<{ [TAG_LIBRARY_KEY]: string[] }>([TAG_LIBRARY_KEY])
      set({ tagLibrary: result[TAG_LIBRARY_KEY] || [] })
    },

    // Add tag to library
    addTagToLibrary: async (tag) => {
      const { tagLibrary } = get()
      const normalizedTag = tag.trim().toLowerCase()
      if (normalizedTag && !tagLibrary.includes(normalizedTag)) {
        const updated = [...tagLibrary, normalizedTag].sort()
        await storageSync.set({ [TAG_LIBRARY_KEY]: updated })
        set({ tagLibrary: updated })
      }
    },

    // Remove tag from library
    removeTagFromLibrary: async (tag) => {
      const { tagLibrary } = get()
      const updated = tagLibrary.filter((t) => t !== tag)
      await storageSync.set({ [TAG_LIBRARY_KEY]: updated })
      set({ tagLibrary: updated })
    },

    // Set entire tag library
    setTagLibrary: async (tags) => {
      const normalized = [...new Set(tags.map((t) => t.trim().toLowerCase()).filter(Boolean))].sort()
      await storageSync.set({ [TAG_LIBRARY_KEY]: normalized })
      set({ tagLibrary: normalized })
    },
  }))
)
