import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { Bookmark, BookmarkFilter, BookmarkMetadata, BookmarkOperation } from '@/types'
import { bookmarksApi, metadataStorage, toBookmark, flattenBookmarkTree, isFolder, storageLocal } from '@/lib/chrome-api'
import { toast } from '@/components/ui/use-toast'

const EXPANDED_FOLDERS_KEY = 'expanded_folder_ids'

interface BookmarkState {
  // Data
  bookmarkTree: Bookmark[]
  flatBookmarks: Bookmark[]
  metadata: Record<string, BookmarkMetadata>

  // UI State
  selectedIds: Set<string>
  expandedFolderIds: Set<string>
  currentFolderId: string | null

  // Search & Filter
  filter: BookmarkFilter
  searchResults: Bookmark[]
  isSearching: boolean

  // Loading states
  isLoading: boolean
  error: string | null

  // Operation history for undo/redo
  operationHistory: BookmarkOperation[]
  historyIndex: number
}

interface BookmarkActions {
  // Data fetching
  fetchBookmarks: () => Promise<void>
  fetchMetadata: () => Promise<void>
  refreshBookmarks: () => Promise<void>
  loadExpandedFolders: () => Promise<void>

  // CRUD operations
  createBookmark: (parentId: string, title: string, url: string) => Promise<Bookmark>
  createFolder: (parentId: string, title: string) => Promise<Bookmark>
  updateBookmark: (id: string, changes: { title?: string; url?: string }) => Promise<Bookmark>
  deleteBookmark: (id: string) => Promise<void>
  deleteBookmarks: (ids: string[]) => Promise<void>
  moveBookmark: (id: string, parentId: string, index?: number) => Promise<Bookmark>
  moveBookmarks: (ids: string[], parentId: string) => Promise<void>

  // Metadata operations
  updateMetadata: (bookmarkId: string, metadata: Partial<BookmarkMetadata>) => Promise<void>
  addTags: (bookmarkIds: string[], tags: string[]) => Promise<void>
  removeTags: (bookmarkIds: string[], tags: string[]) => Promise<void>
  trackAccess: (bookmarkId: string) => Promise<void>

  // Selection
  selectBookmark: (id: string, multi?: boolean) => void
  deselectBookmark: (id: string) => void
  selectAll: () => void
  deselectAll: () => void
  toggleSelection: (id: string) => void

  // Folder navigation
  expandFolder: (id: string) => void
  collapseFolder: (id: string) => void
  toggleFolder: (id: string) => void
  setCurrentFolder: (id: string | null) => void

  // Search & Filter
  setFilter: (filter: Partial<BookmarkFilter>) => void
  clearFilter: () => void
  search: (query: string) => Promise<void>

  // Undo/Redo
  undo: () => Promise<void>
  redo: () => Promise<void>
  canUndo: () => boolean
  canRedo: () => boolean

  // Utils
  getBookmarkById: (id: string) => Bookmark | undefined
  getFolderPath: (id: string) => Bookmark[]
  getChildrenOf: (parentId: string) => Bookmark[]
}

type BookmarkStore = BookmarkState & BookmarkActions

export const useBookmarkStore = create<BookmarkStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    bookmarkTree: [],
    flatBookmarks: [],
    metadata: {},
    selectedIds: new Set(),
    expandedFolderIds: new Set(['1', '2']), // Bookmark bar and Other bookmarks
    currentFolderId: null,
    filter: {},
    searchResults: [],
    isSearching: false,
    isLoading: false,
    error: null,
    operationHistory: [],
    historyIndex: -1,

    // Data fetching
    fetchBookmarks: async () => {
      set({ isLoading: true, error: null })
      try {
        const tree = await bookmarksApi.getTree()
        const bookmarkTree = tree.map(toBookmark)
        const flatBookmarks = flattenBookmarkTree(tree)
        set({ bookmarkTree, flatBookmarks, isLoading: false })
      } catch (error) {
        set({ error: (error as Error).message, isLoading: false })
      }
    },

    fetchMetadata: async () => {
      try {
        const metadata = await metadataStorage.getAll()
        set({ metadata })
      } catch (error) {
        console.error('Failed to fetch metadata:', error)
      }
    },

    refreshBookmarks: async () => {
      await get().fetchBookmarks()
      await get().fetchMetadata()
    },

    loadExpandedFolders: async () => {
      try {
        const result = await storageLocal.get<{ [EXPANDED_FOLDERS_KEY]: string[] }>([EXPANDED_FOLDERS_KEY])
        const savedIds = result[EXPANDED_FOLDERS_KEY]
        if (savedIds && savedIds.length > 0) {
          set({ expandedFolderIds: new Set(savedIds) })
        }
      } catch (error) {
        console.error('Failed to load expanded folders:', error)
      }
    },

    // CRUD operations
    createBookmark: async (parentId, title, url) => {
      const node = await bookmarksApi.create({ parentId, title, url })
      await get().refreshBookmarks()
      return toBookmark(node)
    },

    createFolder: async (parentId, title) => {
      const node = await bookmarksApi.create({ parentId, title })
      await get().refreshBookmarks()
      return toBookmark(node)
    },

    updateBookmark: async (id, changes) => {
      // Prevent updating root folders (0=root, 1=bookmark bar, 2=other, 3=mobile)
      if (['0', '1', '2', '3'].includes(id)) {
        toast.error('Cannot modify root folders')
        throw new Error("Can't modify the root bookmark folders")
      }
      const node = await bookmarksApi.update(id, changes)
      await get().refreshBookmarks()
      return toBookmark(node)
    },

    deleteBookmark: async (id) => {
      // Prevent deleting root folders (0=root, 1=bookmark bar, 2=other, 3=mobile)
      if (['0', '1', '2', '3'].includes(id)) {
        toast.error('Cannot delete root folders')
        return
      }
      const bookmark = get().getBookmarkById(id)
      if (bookmark && isFolder(bookmark)) {
        await bookmarksApi.removeTree(id)
      } else {
        await bookmarksApi.remove(id)
      }
      await metadataStorage.remove(id)
      await get().refreshBookmarks()
    },

    deleteBookmarks: async (ids) => {
      for (const id of ids) {
        await get().deleteBookmark(id)
      }
    },

    moveBookmark: async (id, parentId, index) => {
      // Prevent moving root folders (0=root, 1=bookmark bar, 2=other, 3=mobile)
      if (['0', '1', '2', '3'].includes(id)) {
        toast.error('Cannot move root folders')
        return get().getBookmarkById(id)!
      }
      const node = await bookmarksApi.move(id, { parentId, index })
      await get().refreshBookmarks()
      return toBookmark(node)
    },

    moveBookmarks: async (ids, parentId) => {
      for (const id of ids) {
        await bookmarksApi.move(id, { parentId })
      }
      await get().refreshBookmarks()
    },

    // Metadata operations
    updateMetadata: async (bookmarkId, metadata) => {
      await metadataStorage.set(bookmarkId, metadata)
      await get().fetchMetadata()
    },

    addTags: async (bookmarkIds, tags) => {
      for (const id of bookmarkIds) {
        const existing = await metadataStorage.get(id)
        const currentTags = existing?.customTags ?? []
        const newTags = [...new Set([...currentTags, ...tags])]
        await metadataStorage.set(id, { customTags: newTags })
      }
      await get().fetchMetadata()
    },

    removeTags: async (bookmarkIds, tags) => {
      for (const id of bookmarkIds) {
        const existing = await metadataStorage.get(id)
        const currentTags = existing?.customTags ?? []
        const newTags = currentTags.filter((t) => !tags.includes(t))
        await metadataStorage.set(id, { customTags: newTags })
      }
      await get().fetchMetadata()
    },

    trackAccess: async (bookmarkId) => {
      await metadataStorage.trackAccess(bookmarkId)
      await get().fetchMetadata()
    },

    // Selection
    selectBookmark: (id, multi = false) => {
      set((state) => {
        const newSelected = multi ? new Set(state.selectedIds) : new Set<string>()
        newSelected.add(id)
        return { selectedIds: newSelected }
      })
    },

    deselectBookmark: (id) => {
      set((state) => {
        const newSelected = new Set(state.selectedIds)
        newSelected.delete(id)
        return { selectedIds: newSelected }
      })
    },

    selectAll: () => {
      const { flatBookmarks, currentFolderId } = get()
      const bookmarksToSelect = currentFolderId
        ? flatBookmarks.filter((b) => b.parentId === currentFolderId)
        : flatBookmarks.filter((b) => !isFolder(b))
      set({ selectedIds: new Set(bookmarksToSelect.map((b) => b.id)) })
    },

    deselectAll: () => {
      set({ selectedIds: new Set() })
    },

    toggleSelection: (id) => {
      const { selectedIds } = get()
      if (selectedIds.has(id)) {
        get().deselectBookmark(id)
      } else {
        get().selectBookmark(id, true)
      }
    },

    // Folder navigation
    expandFolder: (id) => {
      set((state) => {
        const newExpanded = new Set(state.expandedFolderIds)
        newExpanded.add(id)
        // Persist to storage
        storageLocal.set({ [EXPANDED_FOLDERS_KEY]: Array.from(newExpanded) })
        return { expandedFolderIds: newExpanded }
      })
    },

    collapseFolder: (id) => {
      set((state) => {
        const newExpanded = new Set(state.expandedFolderIds)
        newExpanded.delete(id)
        // Persist to storage
        storageLocal.set({ [EXPANDED_FOLDERS_KEY]: Array.from(newExpanded) })
        return { expandedFolderIds: newExpanded }
      })
    },

    toggleFolder: (id) => {
      const { expandedFolderIds } = get()
      if (expandedFolderIds.has(id)) {
        get().collapseFolder(id)
      } else {
        get().expandFolder(id)
      }
    },

    setCurrentFolder: (id) => {
      set({ currentFolderId: id })
    },

    // Search & Filter
    setFilter: (filter) => {
      set((state) => ({ filter: { ...state.filter, ...filter } }))
    },

    clearFilter: () => {
      set({ filter: {}, searchResults: [], isSearching: false })
    },

    search: async (query) => {
      if (!query.trim()) {
        set({ searchResults: [], isSearching: false, filter: { ...get().filter, query: '' } })
        return
      }

      set({ isSearching: true, filter: { ...get().filter, query } })
      try {
        const results = await bookmarksApi.search(query)
        set({ searchResults: results.map(toBookmark), isSearching: false })
      } catch (error) {
        console.error('Search failed:', error)
        set({ isSearching: false })
      }
    },

    // Undo/Redo (simplified - full implementation would need more work)
    undo: async () => {
      // TODO: Implement undo logic
    },

    redo: async () => {
      // TODO: Implement redo logic
    },

    canUndo: () => {
      return get().historyIndex >= 0
    },

    canRedo: () => {
      const { operationHistory, historyIndex } = get()
      return historyIndex < operationHistory.length - 1
    },

    // Utils
    getBookmarkById: (id) => {
      return get().flatBookmarks.find((b) => b.id === id)
    },

    getFolderPath: (id) => {
      const path: Bookmark[] = []
      let current = get().getBookmarkById(id)
      while (current) {
        path.unshift(current)
        current = current.parentId ? get().getBookmarkById(current.parentId) : undefined
      }
      return path
    },

    getChildrenOf: (parentId) => {
      return get().flatBookmarks.filter((b) => b.parentId === parentId)
    },
  }))
)
