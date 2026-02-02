/**
 * Background Service Worker
 * Handles bookmark events and message passing
 */

interface StoredMetadata {
  accessCount?: number
  lastAccessed?: number
}

interface FolderShare {
  folderId: string
  type: 'gist' | 'repo'
  resourceId: string
  url: string
  name: string
  filePath?: string
  lastSynced: string
}

type FolderShares = Record<string, FolderShare>

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('BookStash installed:', details.reason)

  if (details.reason === 'install') {
    // First time installation
    chrome.storage.local.set({ installDate: Date.now() })
  }
})

// Listen for bookmark changes to keep UI in sync
chrome.bookmarks.onCreated.addListener(async (id, bookmark) => {
  console.log('Bookmark created:', id, bookmark)
  notifyUI('bookmark-created', { id, bookmark })
  
  // Check if created inside a synced folder
  if (bookmark.parentId) {
    try {
      const result = await chrome.storage.sync.get('folder_shares')
      const folderShares: FolderShares = (result.folder_shares as FolderShares) || ({} as FolderShares)
      
      // Check if parent or any ancestor is synced
      let currentId = bookmark.parentId
      while (currentId) {
        if (folderShares[currentId]) {
          console.log('Bookmark created in synced folder, triggering auto-sync:', folderShares[currentId])
          notifyUI('bookmark-created-sync-needed', {
            folderId: currentId,
            share: folderShares[currentId],
            bookmarkId: id
          })
          break
        }
        // Check parent's parent
        const parent = await chrome.bookmarks.get(currentId)
        currentId = parent[0]?.parentId || ''
        if (!currentId) break
      }
    } catch (error) {
      console.error('Failed to check for synced folder on create:', error)
    }
  }
})

chrome.bookmarks.onRemoved.addListener(async (id, removeInfo) => {
  console.log('Bookmark removed:', id, removeInfo)
  notifyUI('bookmark-removed', { id, removeInfo })

  // Clean up metadata when bookmark is deleted
  chrome.storage.local.remove(`bookmark_meta_${id}`)

  // Check if removed from a synced folder
  if (removeInfo.parentId) {
    try {
      const result = await chrome.storage.sync.get('folder_shares')
      const folderShares: FolderShares = (result.folder_shares as FolderShares) || ({} as FolderShares)
      
      // Check if parent is synced
      if (folderShares[removeInfo.parentId]) {
        console.log('Bookmark removed from synced folder, triggering auto-sync:', folderShares[removeInfo.parentId])
        notifyUI('bookmark-removed-sync-needed', {
          folderId: removeInfo.parentId,
          share: folderShares[removeInfo.parentId],
          bookmarkId: id
        })
      }
    } catch (error) {
      console.error('Failed to check for synced folder on remove:', error)
    }
  }

  // Check if this was a linked folder and notify for cleanup
  try {
    const result = await chrome.storage.sync.get('folder_shares')
    const folderShares: FolderShares = (result.folder_shares as FolderShares) || ({} as FolderShares)
    if (folderShares[id]) {
      const share = folderShares[id]
      console.log('Linked folder deleted, needs cleanup:', share)
      
      // Remove the folder share mapping
      delete folderShares[id]
      await chrome.storage.sync.set({ folder_shares: folderShares })
      
      // Notify UI to clean up the file from the repo
      notifyUI('folder-share-cleanup-needed', { 
        folderId: id, 
        share 
      })
    }
  } catch (error) {
    console.error('Failed to check for folder share on delete:', error)
  }
})

chrome.bookmarks.onChanged.addListener(async (id, changeInfo) => {
  console.log('Bookmark changed:', id, changeInfo)
  notifyUI('bookmark-changed', { id, changeInfo })

  // Check if this is a linked folder and update the share name
  if (changeInfo.title) {
    try {
      const result = await chrome.storage.sync.get('folder_shares')
      const folderShares: FolderShares = (result.folder_shares as FolderShares) || ({} as FolderShares)
      if (folderShares[id]) {
        // Update the folder share name
        const share = folderShares[id]
        const oldFilePath = share.filePath
        const sanitizedName = changeInfo.title.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase()
        const newFilePath = share.type === 'repo' ? `bookmarks/${sanitizedName}.json` : undefined

        folderShares[id] = {
          ...share,
          name: changeInfo.title,
          filePath: newFilePath || share.filePath,
        }
        await chrome.storage.sync.set({ folder_shares: folderShares })
        console.log('Updated folder share for renamed folder:', changeInfo.title)
        
        // Notify UI to clean up old file and create new one
        if (share.type === 'repo' && oldFilePath !== newFilePath) {
          notifyUI('folder-share-renamed', {
            folderId: id,
            oldFilePath,
            newFilePath,
            share: folderShares[id]
          })
        }
      }
    } catch (error) {
      console.error('Failed to update folder share on rename:', error)
    }
  }
})

chrome.bookmarks.onMoved.addListener(async (id, moveInfo) => {
  console.log('Bookmark moved:', id, moveInfo)
  notifyUI('bookmark-moved', { id, moveInfo })
  
  // Check if this is a linked folder and trigger sync
  try {
    const result = await chrome.storage.sync.get('folder_shares')
    const folderShares: FolderShares = (result.folder_shares as FolderShares) || ({} as FolderShares)
    if (folderShares[id]) {
      // This is a synced folder that was moved - trigger auto-sync
      console.log('Synced folder moved, triggering auto-sync:', folderShares[id])
      notifyUI('folder-moved-sync-needed', {
        folderId: id,
        share: folderShares[id],
        moveInfo
      })
    }
  } catch (error) {
    console.error('Failed to check for folder share on move:', error)
  }
})

chrome.bookmarks.onChildrenReordered.addListener((id, reorderInfo) => {
  console.log('Bookmarks reordered:', id, reorderInfo)
  notifyUI('bookmarks-reordered', { id, reorderInfo })
})

// Handle action click to open side panel
chrome.action.onClicked.addListener((tab) => {
  if (tab.windowId) {
    chrome.sidePanel.open({ windowId: tab.windowId })
  }
})

// Handle messages from popup/sidepanel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received:', message, 'from:', sender)

  switch (message.type) {
    case 'open-sidepanel':
      // Note: sidePanel.open() requires user gesture - use action.onClicked instead
      // This message handler is kept for compatibility but may not work in all contexts
      sendResponse({ success: true, note: 'Use extension icon click to open side panel' })
      break

    case 'get-bookmarks':
      chrome.bookmarks.getTree().then((tree) => {
        sendResponse({ success: true, data: tree })
      })
      return true // Keep channel open for async response

    case 'search-bookmarks':
      chrome.bookmarks.search(message.query).then((results) => {
        sendResponse({ success: true, data: results })
      })
      return true

    case 'track-access':
      trackBookmarkAccess(message.bookmarkId).then(() => {
        sendResponse({ success: true })
      })
      return true

    case 'update-folder-share-name':
      updateFolderShareName(message.folderId, message.newName).then(() => {
        sendResponse({ success: true })
      }).catch((error) => {
        sendResponse({ success: false, error: error.message })
      })
      return true

    default:
      console.warn('Unknown message type:', message.type)
      sendResponse({ success: false, error: 'Unknown message type' })
  }
})

// Side panel behavior - open on action click
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: false })
  .catch((error) => console.error('Failed to set panel behavior:', error))

// Notify all UI contexts about bookmark changes
function notifyUI(type: string, data: unknown) {
  chrome.runtime.sendMessage({ type, data }).catch(() => {
    // Ignore errors when no listeners are available
  })
}

// Track bookmark access for statistics
async function trackBookmarkAccess(bookmarkId: string) {
  const key = `bookmark_meta_${bookmarkId}`
  const result = await chrome.storage.local.get(key)
  const existing: StoredMetadata = result[key] || { accessCount: 0 }

  await chrome.storage.local.set({
    [key]: {
      ...existing,
      lastAccessed: Date.now(),
      accessCount: (existing.accessCount ?? 0) + 1,
    },
  })
}

// Update folder share name when folder is renamed
async function updateFolderShareName(folderId: string, newName: string) {
  const result = await chrome.storage.sync.get('folder_shares')
  const folderShares: FolderShares = (result.folder_shares as FolderShares) || ({} as FolderShares)

  if (folderShares[folderId]) {
    const share: FolderShare = folderShares[folderId]
    const sanitizedName = newName.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase()
    const newFilePath = share.type === 'repo' ? `bookmarks/${sanitizedName}.json` : undefined

    folderShares[folderId] = {
      ...share,
      name: newName,
      filePath: newFilePath || share.filePath,
    }
    await chrome.storage.sync.set({ folder_shares: folderShares })
  }
}

console.log('BookStash background service worker started')
