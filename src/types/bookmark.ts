/**
 * Extended bookmark interface with custom fields
 * Base properties come from Chrome's bookmark API
 */
export interface Bookmark {
  id: string
  title: string
  url?: string
  dateAdded?: number
  dateGroupModified?: number
  parentId?: string
  index?: number
  children?: Bookmark[]
  // Custom extensions stored in chrome.storage.local
  customTags?: string[]
  notes?: string
  lastAccessed?: number
  accessCount?: number
}

/**
 * Folder structure for organizing bookmarks
 */
export interface BookmarkFolder {
  id: string
  title: string
  parentId?: string
  index?: number
  dateAdded?: number
  dateGroupModified?: number
  children?: (Bookmark | BookmarkFolder)[]
}

/**
 * Custom metadata stored separately from Chrome bookmarks
 */
export interface BookmarkMetadata {
  bookmarkId: string
  customTags: string[]
  notes: string
  lastAccessed?: number
  accessCount: number
  createdAt: number
  updatedAt: number
}

/**
 * Search/filter criteria
 */
export interface BookmarkFilter {
  query?: string
  tags?: string[]
  folderId?: string
  dateRange?: {
    start: number
    end: number
  }
  hasNotes?: boolean
  sortBy?: 'title' | 'dateAdded' | 'lastAccessed' | 'accessCount'
  sortOrder?: 'asc' | 'desc'
}

/**
 * Bulk operation types
 */
export type BulkOperation =
  | { type: 'move'; targetFolderId: string }
  | { type: 'delete' }
  | { type: 'addTags'; tags: string[] }
  | { type: 'removeTags'; tags: string[] }

/**
 * Operation result for undo/redo
 */
export interface BookmarkOperation {
  id: string
  type: 'create' | 'update' | 'delete' | 'move'
  timestamp: number
  bookmark: Bookmark
  previousState?: Bookmark
  canUndo: boolean
}
