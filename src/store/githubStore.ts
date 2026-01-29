import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { GitHubAuth, GistInfo, RepoInfo, Subscription } from '@/types'
import {
  getStoredAuth,
  clearAuth,
  authenticateWithToken,
  validateAuth,
} from '@/lib/github-auth'
import { gistsApi, reposApi } from '@/lib/github-api'
import { storageLocal, storageSync } from '@/lib/chrome-api'

const SUBSCRIPTIONS_KEY = 'github_subscriptions'
const SHARED_GISTS_KEY = 'shared_gists'
const FOLDER_SHARES_KEY = 'folder_shares'

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
    filePath?: string // Optional: custom file path (default: bookmarks.json)
  ) => Promise<void>

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
}

type GitHubStore = GitHubState & GitHubActions

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

    // Initialize - check for existing auth
    initialize: async () => {
      // Always load folder shares (even if not authenticated, to show indicators)
      get().loadFolderShares()

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
          await clearAuth()
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
    saveToRepo: async (owner, repo, content, message, filePath) => {
      const { auth } = get()
      if (!auth) throw new Error('Not authenticated')

      const path = filePath || 'bookmarks.json'

      // Check if file exists to get SHA
      const sha = await reposApi.getFileSha(auth.accessToken, owner, repo, path)

      await reposApi.putFile(
        auth.accessToken,
        owner,
        repo,
        path,
        content,
        message,
        sha || undefined
      )
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
  }))
)
