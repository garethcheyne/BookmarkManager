import type { Bookmark, BookmarkMetadata } from '@/types'

/**
 * Chrome Bookmarks API wrapper
 */
export const bookmarksApi = {
  /**
   * Get the entire bookmark tree
   */
  async getTree(): Promise<chrome.bookmarks.BookmarkTreeNode[]> {
    return chrome.bookmarks.getTree()
  },

  /**
   * Get bookmarks by IDs
   */
  async get(id: string): Promise<chrome.bookmarks.BookmarkTreeNode[]> {
    return chrome.bookmarks.get(id)
  },

  /**
   * Get multiple bookmarks by IDs
   */
  async getMultiple(ids: string[]): Promise<chrome.bookmarks.BookmarkTreeNode[]> {
    if (ids.length === 0) return []
    return chrome.bookmarks.get(ids as [string, ...string[]])
  },

  /**
   * Get children of a folder
   */
  async getChildren(id: string): Promise<chrome.bookmarks.BookmarkTreeNode[]> {
    return chrome.bookmarks.getChildren(id)
  },

  /**
   * Get subtree starting from a node
   */
  async getSubTree(id: string): Promise<chrome.bookmarks.BookmarkTreeNode[]> {
    return chrome.bookmarks.getSubTree(id)
  },

  /**
   * Search bookmarks by query
   */
  async search(query: string | chrome.bookmarks.SearchQuery): Promise<chrome.bookmarks.BookmarkTreeNode[]> {
    return chrome.bookmarks.search(query)
  },

  /**
   * Create a new bookmark or folder
   */
  async create(bookmark: chrome.bookmarks.CreateDetails): Promise<chrome.bookmarks.BookmarkTreeNode> {
    return chrome.bookmarks.create(bookmark)
  },

  /**
   * Update a bookmark's title or URL
   */
  async update(
    id: string,
    changes: { title?: string; url?: string }
  ): Promise<chrome.bookmarks.BookmarkTreeNode> {
    return chrome.bookmarks.update(id, changes)
  },

  /**
   * Move a bookmark to a new location
   */
  async move(
    id: string,
    destination: { parentId?: string; index?: number }
  ): Promise<chrome.bookmarks.BookmarkTreeNode> {
    return chrome.bookmarks.move(id, destination)
  },

  /**
   * Remove a bookmark or empty folder
   */
  async remove(id: string): Promise<void> {
    return chrome.bookmarks.remove(id)
  },

  /**
   * Remove a folder and all its contents
   */
  async removeTree(id: string): Promise<void> {
    return chrome.bookmarks.removeTree(id)
  },

  /**
   * Get recent bookmarks
   */
  async getRecent(numberOfItems: number): Promise<chrome.bookmarks.BookmarkTreeNode[]> {
    return chrome.bookmarks.getRecent(numberOfItems)
  },
}

/**
 * Chrome Storage API wrapper for local storage
 */
export const storageLocal = {
  async get<T extends Record<string, unknown>>(keys: string | string[]): Promise<T> {
    const result = await chrome.storage.local.get(keys)
    return result as T
  },

  async set(items: Record<string, unknown>): Promise<void> {
    return chrome.storage.local.set(items)
  },

  async remove(keys: string | string[]): Promise<void> {
    return chrome.storage.local.remove(keys)
  },

  async clear(): Promise<void> {
    return chrome.storage.local.clear()
  },

  async getBytesInUse(keys?: string | string[]): Promise<number> {
    return chrome.storage.local.getBytesInUse(keys)
  },
}

/**
 * Chrome Storage API wrapper for sync storage
 */
export const storageSync = {
  async get<T extends Record<string, unknown>>(keys: string | string[]): Promise<T> {
    const result = await chrome.storage.sync.get(keys)
    return result as T
  },

  async set(items: Record<string, unknown>): Promise<void> {
    return chrome.storage.sync.set(items)
  },

  async remove(keys: string | string[]): Promise<void> {
    return chrome.storage.sync.remove(keys)
  },

  async clear(): Promise<void> {
    return chrome.storage.sync.clear()
  },

  async getBytesInUse(keys?: string | string[]): Promise<number> {
    return chrome.storage.sync.getBytesInUse(keys)
  },
}

/**
 * Custom metadata storage helpers
 */
const METADATA_KEY_PREFIX = 'bookmark_meta_'
const ALL_METADATA_KEY = 'all_bookmark_metadata'

export const metadataStorage = {
  /**
   * Get metadata for a specific bookmark
   */
  async get(bookmarkId: string): Promise<BookmarkMetadata | null> {
    const key = `${METADATA_KEY_PREFIX}${bookmarkId}`
    const result = await storageLocal.get<Record<string, BookmarkMetadata>>([key])
    return result[key] || null
  },

  /**
   * Get metadata for multiple bookmarks
   */
  async getMany(bookmarkIds: string[]): Promise<Record<string, BookmarkMetadata>> {
    const keys = bookmarkIds.map((id) => `${METADATA_KEY_PREFIX}${id}`)
    const result = await storageLocal.get<Record<string, BookmarkMetadata>>(keys)
    const metadata: Record<string, BookmarkMetadata> = {}
    for (const id of bookmarkIds) {
      const key = `${METADATA_KEY_PREFIX}${id}`
      if (result[key]) {
        metadata[id] = result[key]
      }
    }
    return metadata
  },

  /**
   * Get all stored metadata
   */
  async getAll(): Promise<Record<string, BookmarkMetadata>> {
    const result = await storageLocal.get<Record<string, Record<string, BookmarkMetadata>>>([
      ALL_METADATA_KEY,
    ])
    return result[ALL_METADATA_KEY] || {}
  },

  /**
   * Save metadata for a bookmark
   */
  async set(bookmarkId: string, metadata: Partial<BookmarkMetadata>): Promise<void> {
    const existing = await this.get(bookmarkId)
    const now = Date.now()
    const updated: BookmarkMetadata = {
      bookmarkId,
      customTags: metadata.customTags ?? existing?.customTags ?? [],
      notes: metadata.notes ?? existing?.notes ?? '',
      lastAccessed: metadata.lastAccessed ?? existing?.lastAccessed,
      accessCount: metadata.accessCount ?? existing?.accessCount ?? 0,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }

    const key = `${METADATA_KEY_PREFIX}${bookmarkId}`
    await storageLocal.set({ [key]: updated })

    // Also update the master list
    const allMeta = await this.getAll()
    allMeta[bookmarkId] = updated
    await storageLocal.set({ [ALL_METADATA_KEY]: allMeta })
  },

  /**
   * Remove metadata for a bookmark
   */
  async remove(bookmarkId: string): Promise<void> {
    const key = `${METADATA_KEY_PREFIX}${bookmarkId}`
    await storageLocal.remove(key)

    // Also update the master list
    const allMeta = await this.getAll()
    delete allMeta[bookmarkId]
    await storageLocal.set({ [ALL_METADATA_KEY]: allMeta })
  },

  /**
   * Track bookmark access
   */
  async trackAccess(bookmarkId: string): Promise<void> {
    const existing = await this.get(bookmarkId)
    await this.set(bookmarkId, {
      lastAccessed: Date.now(),
      accessCount: (existing?.accessCount ?? 0) + 1,
    })
  },
}

/**
 * Side Panel API wrapper
 */
export const sidePanelApi = {
  async open(windowId: number): Promise<void> {
    return chrome.sidePanel.open({ windowId })
  },

  async setOptions(options: chrome.sidePanel.PanelOptions): Promise<void> {
    return chrome.sidePanel.setOptions(options)
  },

  async getOptions(options: chrome.sidePanel.GetPanelOptions): Promise<chrome.sidePanel.PanelOptions> {
    return chrome.sidePanel.getOptions(options)
  },
}

/**
 * Convert Chrome bookmark tree node to our Bookmark type
 */
export function toBookmark(node: chrome.bookmarks.BookmarkTreeNode): Bookmark {
  return {
    id: node.id,
    title: node.title,
    url: node.url,
    dateAdded: node.dateAdded,
    dateGroupModified: node.dateGroupModified,
    parentId: node.parentId,
    index: node.index,
    children: node.children?.map(toBookmark),
  }
}

/**
 * Flatten bookmark tree into a flat array
 */
export function flattenBookmarkTree(nodes: chrome.bookmarks.BookmarkTreeNode[]): Bookmark[] {
  const result: Bookmark[] = []

  function traverse(node: chrome.bookmarks.BookmarkTreeNode) {
    result.push(toBookmark(node))
    if (node.children) {
      node.children.forEach(traverse)
    }
  }

  nodes.forEach(traverse)
  return result
}

/**
 * Check if a node is a folder (no URL)
 */
export function isFolder(node: chrome.bookmarks.BookmarkTreeNode | Bookmark): boolean {
  return !node.url
}

/**
 * Get all folders from bookmark tree
 */
export function getFolders(nodes: chrome.bookmarks.BookmarkTreeNode[]): Bookmark[] {
  return flattenBookmarkTree(nodes).filter(isFolder)
}

/**
 * Get all bookmarks (non-folders) from bookmark tree
 */
export function getBookmarksOnly(nodes: chrome.bookmarks.BookmarkTreeNode[]): Bookmark[] {
  return flattenBookmarkTree(nodes).filter((node) => !isFolder(node))
}
