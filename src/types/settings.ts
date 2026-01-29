/**
 * User settings stored in chrome.storage.sync
 */
export interface Settings {
  // Appearance
  theme: 'light' | 'dark' | 'system'
  compactMode: boolean
  showFavicons: boolean

  // Behavior
  defaultView: 'tree' | 'list'
  defaultSortBy: 'title' | 'dateAdded' | 'lastAccessed'
  defaultSortOrder: 'asc' | 'desc'
  confirmDelete: boolean
  openInNewTab: boolean

  // Sidebar
  sidebarWidth: number
  showBookmarkCount: boolean
  expandFoldersOnHover: boolean

  // Search
  searchInUrls: boolean
  searchInNotes: boolean
  fuzzySearch: boolean
  searchHistoryEnabled: boolean
  maxSearchHistory: number

  // Sync & Sharing
  autoSyncSubscriptions: boolean
  syncFrequency: 'manual' | 'daily' | 'weekly'
  notifyOnUpdates: boolean

  // Privacy
  trackAccessCount: boolean
  trackLastAccessed: boolean

  // Advanced
  enableKeyboardShortcuts: boolean
  maxRecentBookmarks: number
  cacheTimeout: number // minutes
}

/**
 * Default settings values
 */
export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  compactMode: false,
  showFavicons: true,

  defaultView: 'tree',
  defaultSortBy: 'title',
  defaultSortOrder: 'asc',
  confirmDelete: true,
  openInNewTab: false,

  sidebarWidth: 280,
  showBookmarkCount: true,
  expandFoldersOnHover: false,

  searchInUrls: true,
  searchInNotes: true,
  fuzzySearch: true,
  searchHistoryEnabled: true,
  maxSearchHistory: 20,

  autoSyncSubscriptions: true,
  syncFrequency: 'daily',
  notifyOnUpdates: true,

  trackAccessCount: true,
  trackLastAccessed: true,

  enableKeyboardShortcuts: true,
  maxRecentBookmarks: 20,
  cacheTimeout: 30,
}

/**
 * Keyboard shortcut mappings
 */
export interface KeyboardShortcuts {
  search: string
  newBookmark: string
  newFolder: string
  delete: string
  edit: string
  copy: string
  paste: string
  selectAll: string
  undo: string
  redo: string
}

export const DEFAULT_SHORTCUTS: KeyboardShortcuts = {
  search: 'Ctrl+F',
  newBookmark: 'Ctrl+D',
  newFolder: 'Ctrl+Shift+N',
  delete: 'Delete',
  edit: 'F2',
  copy: 'Ctrl+C',
  paste: 'Ctrl+V',
  selectAll: 'Ctrl+A',
  undo: 'Ctrl+Z',
  redo: 'Ctrl+Y',
}
