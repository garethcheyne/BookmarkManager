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
chrome.bookmarks.onCreated.addListener((id, bookmark) => {
  console.log('Bookmark created:', id, bookmark)
  notifyUI('bookmark-created', { id, bookmark })
})

chrome.bookmarks.onRemoved.addListener((id, removeInfo) => {
  console.log('Bookmark removed:', id, removeInfo)
  notifyUI('bookmark-removed', { id, removeInfo })

  // Clean up metadata when bookmark is deleted
  chrome.storage.local.remove(`bookmark_meta_${id}`)
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
        const sanitizedName = changeInfo.title.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase()
        const newFilePath = share.type === 'repo' ? `bookmarks/${sanitizedName}.json` : undefined

        folderShares[id] = {
          ...share,
          name: changeInfo.title,
          filePath: newFilePath || share.filePath,
        }
        await chrome.storage.sync.set({ folder_shares: folderShares })
        console.log('Updated folder share for renamed folder:', changeInfo.title)
      }
    } catch (error) {
      console.error('Failed to update folder share on rename:', error)
    }
  }
})

chrome.bookmarks.onMoved.addListener((id, moveInfo) => {
  console.log('Bookmark moved:', id, moveInfo)
  notifyUI('bookmark-moved', { id, moveInfo })
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
