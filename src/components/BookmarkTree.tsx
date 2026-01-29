import { useEffect } from 'react'
import { useBookmarkStore } from '@/store'
import { BookmarkItem } from './BookmarkItem'
import { ScrollArea } from './ui/scroll-area'
import { Loader2 } from 'lucide-react'

export function BookmarkTree() {
  const { bookmarkTree, isLoading, error, fetchBookmarks, fetchMetadata, loadExpandedFolders } = useBookmarkStore()

  useEffect(() => {
    fetchBookmarks()
    fetchMetadata()
    loadExpandedFolders()
  }, [fetchBookmarks, fetchMetadata, loadExpandedFolders])

  // Listen for bookmark changes from background
  useEffect(() => {
    const handleMessage = (message: { type: string }) => {
      if (
        message.type === 'bookmark-created' ||
        message.type === 'bookmark-removed' ||
        message.type === 'bookmark-changed' ||
        message.type === 'bookmark-moved' ||
        message.type === 'bookmarks-reordered'
      ) {
        fetchBookmarks()
      }
    }

    chrome.runtime.onMessage.addListener(handleMessage)
    return () => chrome.runtime.onMessage.removeListener(handleMessage)
  }, [fetchBookmarks])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <p className="text-destructive text-sm">{error}</p>
      </div>
    )
  }

  // The root of the bookmark tree is a single node with children
  const rootChildren = bookmarkTree[0]?.children || []

  return (
    <ScrollArea className="h-full">
      <div className="p-2">
        {rootChildren.map((node) => (
          <BookmarkItem key={node.id} bookmark={node} />
        ))}
      </div>
    </ScrollArea>
  )
}
