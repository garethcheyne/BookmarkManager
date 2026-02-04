import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type {
  Snippet,
  SnippetCategory,
  SnippetFilter,
  SnippetExecutionResult,
  SnippetOperation,
} from '@/types'
import { toast } from '@/components/ui/use-toast'

const SNIPPETS_STORAGE_KEY = 'snippets'
const CATEGORIES_STORAGE_KEY = 'snippet_categories'

interface SnippetState {
  // Data
  snippets: Snippet[]
  categories: SnippetCategory[]
  filteredSnippets: Snippet[]

  // UI State
  selectedIds: Set<string>
  lastSelectedId: string | null

  // Search & Filter
  filter: SnippetFilter
  isSearching: boolean

  // Loading states
  isLoading: boolean
  error: string | null

  // Operation history for undo/redo
  operationHistory: SnippetOperation[]
  historyIndex: number
}

interface SnippetActions {
  // Data fetching
  fetchSnippets: () => Promise<void>
  fetchCategories: () => Promise<void>
  refreshSnippets: () => Promise<void>

  // CRUD operations
  createSnippet: (snippet: Omit<Snippet, 'id' | 'dateAdded' | 'dateModified' | 'usageCount'>) => Promise<Snippet>
  updateSnippet: (id: string, changes: Partial<Snippet>) => Promise<Snippet>
  deleteSnippet: (id: string) => Promise<void>
  deleteSnippets: (ids: string[]) => Promise<void>
  duplicateSnippet: (id: string) => Promise<Snippet>

  // Category operations
  createCategory: (category: Omit<SnippetCategory, 'id'>) => Promise<SnippetCategory>
  updateCategory: (id: string, changes: Partial<SnippetCategory>) => Promise<SnippetCategory>
  deleteCategory: (id: string) => Promise<void>

  // Execution
  executeSnippet: (id: string, tabId?: number) => Promise<SnippetExecutionResult>
  trackUsage: (snippetId: string) => Promise<void>

  // Selection
  selectSnippet: (id: string, multi?: boolean) => void
  deselectSnippet: (id: string) => void
  toggleSelection: (id: string) => void
  selectAll: () => void
  deselectAll: () => void

  // Search & Filter
  setFilter: (filter: Partial<SnippetFilter>) => void
  clearFilter: () => void
  applyFilter: () => void

  // Favorites
  toggleFavorite: (id: string) => Promise<void>

  // Undo/Redo
  undo: () => Promise<void>
  redo: () => Promise<void>
  canUndo: () => boolean
  canRedo: () => boolean

  // Utils
  getSnippetById: (id: string) => Snippet | undefined
  getSnippetsByCategory: (categoryId: string) => Snippet[]
  getSnippetsByTag: (tag: string) => Snippet[]
}

type SnippetStore = SnippetState & SnippetActions

// Storage helpers
const storage = {
  async get<T>(key: string): Promise<T | null> {
    const result = await chrome.storage.local.get(key)
    return (result[key] as T) || null
  },
  async set(key: string, value: any): Promise<void> {
    await chrome.storage.local.set({ [key]: value })
  },
}

export const useSnippetStore = create<SnippetStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    snippets: [],
    categories: [],
    filteredSnippets: [],
    selectedIds: new Set(),
    lastSelectedId: null,
    filter: {},
    isSearching: false,
    isLoading: false,
    error: null,
    operationHistory: [],
    historyIndex: -1,

    // Data fetching
    fetchSnippets: async () => {
      try {
        set({ isLoading: true, error: null })
        const snippets = await storage.get<Snippet[]>(SNIPPETS_STORAGE_KEY)
        set({
          snippets: snippets || [],
          filteredSnippets: snippets || [],
          isLoading: false,
        })
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Failed to fetch snippets',
          isLoading: false,
        })
      }
    },

    fetchCategories: async () => {
      try {
        const categories = await storage.get<SnippetCategory[]>(CATEGORIES_STORAGE_KEY)
        set({ categories: categories || [] })
      } catch (error) {
        console.error('Failed to fetch categories:', error)
      }
    },

    refreshSnippets: async () => {
      await get().fetchSnippets()
      await get().fetchCategories()
      get().applyFilter()
    },

    // CRUD operations
    createSnippet: async (snippet) => {
      const newSnippet: Snippet = {
        ...snippet,
        id: crypto.randomUUID(),
        dateAdded: Date.now(),
        dateModified: Date.now(),
        usageCount: 0,
      }

      const snippets = [...get().snippets, newSnippet]
      await storage.set(SNIPPETS_STORAGE_KEY, snippets)

      set({ snippets })
      get().applyFilter()

      // Add to history
      const operation: SnippetOperation = {
        type: 'create',
        timestamp: Date.now(),
        snippetId: newSnippet.id,
        after: newSnippet,
      }
      set((state) => ({
        operationHistory: [...state.operationHistory.slice(0, state.historyIndex + 1), operation],
        historyIndex: state.historyIndex + 1,
      }))

      toast({
        title: 'Snippet created',
        description: `"${newSnippet.title}" has been added`,
      })

      return newSnippet
    },

    updateSnippet: async (id, changes) => {
      const snippets = get().snippets
      const index = snippets.findIndex((s) => s.id === id)
      if (index === -1) throw new Error('Snippet not found')

      const oldSnippet = snippets[index]
      const updatedSnippet: Snippet = {
        ...oldSnippet,
        ...changes,
        dateModified: Date.now(),
      }

      const newSnippets = [...snippets]
      newSnippets[index] = updatedSnippet
      await storage.set(SNIPPETS_STORAGE_KEY, newSnippets)

      set({ snippets: newSnippets })
      get().applyFilter()

      // Add to history
      const operation: SnippetOperation = {
        type: 'update',
        timestamp: Date.now(),
        snippetId: id,
        before: oldSnippet,
        after: updatedSnippet,
      }
      set((state) => ({
        operationHistory: [...state.operationHistory.slice(0, state.historyIndex + 1), operation],
        historyIndex: state.historyIndex + 1,
      }))

      toast({
        title: 'Snippet updated',
        description: `"${updatedSnippet.title}" has been updated`,
      })

      return updatedSnippet
    },

    deleteSnippet: async (id) => {
      const snippets = get().snippets
      const snippet = snippets.find((s) => s.id === id)
      if (!snippet) throw new Error('Snippet not found')

      const newSnippets = snippets.filter((s) => s.id !== id)
      await storage.set(SNIPPETS_STORAGE_KEY, newSnippets)

      set({ snippets: newSnippets })
      get().applyFilter()
      get().deselectSnippet(id)

      // Add to history
      const operation: SnippetOperation = {
        type: 'delete',
        timestamp: Date.now(),
        snippetId: id,
        before: snippet,
      }
      set((state) => ({
        operationHistory: [...state.operationHistory.slice(0, state.historyIndex + 1), operation],
        historyIndex: state.historyIndex + 1,
      }))

      toast({
        title: 'Snippet deleted',
        description: `"${snippet.title}" has been removed`,
      })
    },

    deleteSnippets: async (ids) => {
      for (const id of ids) {
        await get().deleteSnippet(id)
      }
    },

    duplicateSnippet: async (id) => {
      const snippet = get().snippets.find((s) => s.id === id)
      if (!snippet) throw new Error('Snippet not found')

      return get().createSnippet({
        ...snippet,
        title: `${snippet.title} (Copy)`,
      })
    },

    // Category operations
    createCategory: async (category) => {
      const newCategory: SnippetCategory = {
        ...category,
        id: crypto.randomUUID(),
      }

      const categories = [...get().categories, newCategory]
      await storage.set(CATEGORIES_STORAGE_KEY, categories)

      set({ categories })

      toast({
        title: 'Category created',
        description: `"${newCategory.name}" has been added`,
      })

      return newCategory
    },

    updateCategory: async (id, changes) => {
      const categories = get().categories
      const index = categories.findIndex((c) => c.id === id)
      if (index === -1) throw new Error('Category not found')

      const updatedCategory = { ...categories[index], ...changes }
      const newCategories = [...categories]
      newCategories[index] = updatedCategory
      await storage.set(CATEGORIES_STORAGE_KEY, newCategories)

      set({ categories: newCategories })

      toast({
        title: 'Category updated',
        description: `"${updatedCategory.name}" has been updated`,
      })

      return updatedCategory
    },

    deleteCategory: async (id) => {
      const categories = get().categories
      const category = categories.find((c) => c.id === id)
      if (!category) throw new Error('Category not found')

      // Remove category from snippets
      const snippets = get().snippets.map((s) =>
        s.category === id ? { ...s, category: undefined } : s
      )
      await storage.set(SNIPPETS_STORAGE_KEY, snippets)

      const newCategories = categories.filter((c) => c.id !== id)
      await storage.set(CATEGORIES_STORAGE_KEY, newCategories)

      set({ categories: newCategories, snippets })
      get().applyFilter()

      toast({
        title: 'Category deleted',
        description: `"${category.name}" has been removed`,
      })
    },

    // Execution
    executeSnippet: async (id, tabId) => {
      const snippet = get().snippets.find((s) => s.id === id)
      if (!snippet) throw new Error('Snippet not found')

      const startTime = performance.now()

      try {
        // Get current tab if not specified
        if (!tabId) {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
          tabId = tab?.id
          
          // Check if we got a valid tab
          if (!tab) {
            throw new Error('No active tab found')
          }
          
          // Check if the tab URL is valid for script injection
          const url = tab.url || ''
          if (url.startsWith('chrome://') || 
              url.startsWith('chrome-extension://') || 
              url.startsWith('edge://') ||
              url.startsWith('about:') ||
              url === '') {
            throw new Error('Cannot execute snippets on browser internal pages')
          }
        }

        if (!tabId) {
          throw new Error('No valid tab ID')
        }

        // Execute the snippet
        const results = await chrome.scripting.executeScript({
          target: { tabId },
          func: (code: string) => {
            try {
              // Execute code in page context
              const result = eval(code)
              return { success: true, result }
            } catch (error) {
              return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
              }
            }
          },
          args: [snippet.code],
          world: 'MAIN', // Execute in page context, not isolated world
        })

        const executionTime = performance.now() - startTime
        const result = results[0]?.result

        if (result && !result.success) {
          toast({
            title: 'Execution failed',
            description: result.error,
            variant: 'destructive',
          })
          return {
            success: false,
            error: result.error,
            executionTime,
          }
        }

        // Track usage
        await get().trackUsage(id)

        toast({
          title: 'Snippet executed',
          description: `"${snippet.title}" ran successfully`,
        })

        return {
          success: true,
          result: result?.result,
          executionTime,
        }
      } catch (error) {
        const executionTime = performance.now() - startTime
        const errorMessage = error instanceof Error ? error.message : String(error)

        toast({
          title: 'Execution error',
          description: errorMessage,
          variant: 'destructive',
        })

        return {
          success: false,
          error: errorMessage,
          executionTime,
        }
      }
    },

    trackUsage: async (snippetId) => {
      const snippet = get().snippets.find((s) => s.id === snippetId)
      if (!snippet) return

      await get().updateSnippet(snippetId, {
        lastUsed: Date.now(),
        usageCount: snippet.usageCount + 1,
      })
    },

    // Selection
    selectSnippet: (id, multi = false) => {
      set((state) => {
        const newSelected = new Set(multi ? state.selectedIds : [])
        newSelected.add(id)
        return {
          selectedIds: newSelected,
          lastSelectedId: id,
        }
      })
    },

    deselectSnippet: (id) => {
      set((state) => {
        const newSelected = new Set(state.selectedIds)
        newSelected.delete(id)
        return {
          selectedIds: newSelected,
          lastSelectedId: newSelected.size > 0 ? state.lastSelectedId : null,
        }
      })
    },

    toggleSelection: (id) => {
      const selected = get().selectedIds
      if (selected.has(id)) {
        get().deselectSnippet(id)
      } else {
        get().selectSnippet(id, true)
      }
    },

    selectAll: () => {
      set({
        selectedIds: new Set(get().filteredSnippets.map((s) => s.id)),
      })
    },

    deselectAll: () => {
      set({
        selectedIds: new Set(),
        lastSelectedId: null,
      })
    },

    // Search & Filter
    setFilter: (filter) => {
      set((state) => ({
        filter: { ...state.filter, ...filter },
      }))
      get().applyFilter()
    },

    clearFilter: () => {
      set({ filter: {} })
      get().applyFilter()
    },

    applyFilter: () => {
      const { snippets, filter } = get()
      let filtered = [...snippets]

      // Filter by query
      if (filter.query) {
        const query = filter.query.toLowerCase()
        filtered = filtered.filter(
          (s) =>
            s.title.toLowerCase().includes(query) ||
            s.description?.toLowerCase().includes(query) ||
            s.code.toLowerCase().includes(query) ||
            s.tags?.some((t) => t.toLowerCase().includes(query))
        )
      }

      // Filter by tags
      if (filter.tags && filter.tags.length > 0) {
        filtered = filtered.filter((s) =>
          filter.tags!.every((tag) => s.tags?.includes(tag))
        )
      }

      // Filter by category
      if (filter.category) {
        filtered = filtered.filter((s) => s.category === filter.category)
      }

      // Filter by favorite
      if (filter.favorite) {
        filtered = filtered.filter((s) => s.favorite)
      }

      // Filter by language
      if (filter.language) {
        filtered = filtered.filter((s) => s.language === filter.language)
      }

      set({ filteredSnippets: filtered })
    },

    // Favorites
    toggleFavorite: async (id) => {
      const snippet = get().snippets.find((s) => s.id === id)
      if (!snippet) return

      await get().updateSnippet(id, {
        favorite: !snippet.favorite,
      })
    },

    // Undo/Redo
    undo: async () => {
      const { operationHistory, historyIndex } = get()
      if (historyIndex < 0) return

      const operation = operationHistory[historyIndex]

      // Revert operation
      switch (operation.type) {
        case 'create':
          if (operation.after) {
            const snippets = get().snippets.filter((s) => s.id !== operation.snippetId)
            await storage.set(SNIPPETS_STORAGE_KEY, snippets)
            set({ snippets })
          }
          break
        case 'update':
          if (operation.before) {
            const snippets = get().snippets.map((s) =>
              s.id === operation.snippetId ? operation.before! : s
            )
            await storage.set(SNIPPETS_STORAGE_KEY, snippets)
            set({ snippets })
          }
          break
        case 'delete':
          if (operation.before) {
            const snippets = [...get().snippets, operation.before]
            await storage.set(SNIPPETS_STORAGE_KEY, snippets)
            set({ snippets })
          }
          break
      }

      set({ historyIndex: historyIndex - 1 })
      get().applyFilter()
    },

    redo: async () => {
      const { operationHistory, historyIndex } = get()
      if (historyIndex >= operationHistory.length - 1) return

      const operation = operationHistory[historyIndex + 1]

      // Reapply operation
      switch (operation.type) {
        case 'create':
          if (operation.after) {
            const snippets = [...get().snippets, operation.after]
            await storage.set(SNIPPETS_STORAGE_KEY, snippets)
            set({ snippets })
          }
          break
        case 'update':
          if (operation.after) {
            const snippets = get().snippets.map((s) =>
              s.id === operation.snippetId ? operation.after! : s
            )
            await storage.set(SNIPPETS_STORAGE_KEY, snippets)
            set({ snippets })
          }
          break
        case 'delete': {
          const snippets = get().snippets.filter((s) => s.id !== operation.snippetId)
          await storage.set(SNIPPETS_STORAGE_KEY, snippets)
          set({ snippets })
          break
        }
      }

      set({ historyIndex: historyIndex + 1 })
      get().applyFilter()
    },

    canUndo: () => get().historyIndex >= 0,
    canRedo: () => get().historyIndex < get().operationHistory.length - 1,

    // Utils
    getSnippetById: (id) => {
      return get().snippets.find((s) => s.id === id)
    },

    getSnippetsByCategory: (categoryId) => {
      return get().snippets.filter((s) => s.category === categoryId)
    },

    getSnippetsByTag: (tag) => {
      return get().snippets.filter((s) => s.tags?.includes(tag))
    },
  }))
)
