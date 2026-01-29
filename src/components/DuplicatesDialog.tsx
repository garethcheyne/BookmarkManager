import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from './ui/dialog'
import { Button } from './ui/button'
import { ScrollArea } from './ui/scroll-area'
import { useBookmarkStore } from '@/store'
import { findDuplicates } from '@/lib/import-export'
import { Trash2, ExternalLink, Copy } from 'lucide-react'
import type { Bookmark } from '@/types'

interface DuplicatesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DuplicatesDialog({ open, onOpenChange }: DuplicatesDialogProps) {
  const { bookmarkTree, deleteBookmark, refreshBookmarks } = useBookmarkStore()
  const [duplicates, setDuplicates] = useState<Map<string, Bookmark[]>>(new Map())
  const [selectedForDeletion, setSelectedForDeletion] = useState<Set<string>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (open && bookmarkTree.length > 0) {
      const rootChildren = bookmarkTree[0]?.children || []
      const found = findDuplicates(rootChildren)
      setDuplicates(found)
      setSelectedForDeletion(new Set())
    }
  }, [open, bookmarkTree])

  const toggleSelection = (bookmarkId: string) => {
    const newSelection = new Set(selectedForDeletion)
    if (newSelection.has(bookmarkId)) {
      newSelection.delete(bookmarkId)
    } else {
      newSelection.add(bookmarkId)
    }
    setSelectedForDeletion(newSelection)
  }

  const selectAllExceptFirst = () => {
    const newSelection = new Set<string>()
    duplicates.forEach((bookmarks) => {
      // Keep the first one, select rest for deletion
      bookmarks.slice(1).forEach((b) => newSelection.add(b.id))
    })
    setSelectedForDeletion(newSelection)
  }

  const handleDeleteSelected = async () => {
    if (selectedForDeletion.size === 0) return

    setIsDeleting(true)
    try {
      for (const id of selectedForDeletion) {
        await deleteBookmark(id)
      }
      await refreshBookmarks()
      setSelectedForDeletion(new Set())

      // Refresh duplicates list
      const rootChildren = bookmarkTree[0]?.children || []
      const found = findDuplicates(rootChildren)
      setDuplicates(found)
    } catch (error) {
      console.error('Failed to delete duplicates:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const totalDuplicates = Array.from(duplicates.values()).reduce(
    (acc, bookmarks) => acc + bookmarks.length - 1,
    0
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Duplicate Bookmarks
          </DialogTitle>
          <DialogDescription>
            {duplicates.size === 0
              ? 'No duplicate bookmarks found!'
              : `Found ${duplicates.size} URLs with ${totalDuplicates} duplicate bookmarks`}
          </DialogDescription>
        </DialogHeader>

        {duplicates.size > 0 && (
          <>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">
                {selectedForDeletion.size} selected for deletion
              </span>
              <Button variant="outline" size="sm" onClick={selectAllExceptFirst}>
                Select All Duplicates (Keep First)
              </Button>
            </div>

            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {Array.from(duplicates.entries()).map(([url, bookmarks]) => (
                  <div key={url} className="border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-500 hover:underline truncate flex-1"
                      >
                        {url}
                      </a>
                      <span className="text-xs bg-muted px-2 py-1 rounded">
                        {bookmarks.length} copies
                      </span>
                    </div>

                    <div className="space-y-1 ml-6">
                      {bookmarks.map((bookmark, index) => (
                        <div
                          key={bookmark.id}
                          className={`flex items-center gap-2 p-2 rounded ${
                            selectedForDeletion.has(bookmark.id)
                              ? 'bg-destructive/10'
                              : 'hover:bg-muted'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedForDeletion.has(bookmark.id)}
                            onChange={() => toggleSelection(bookmark.id)}
                            className="rounded"
                          />
                          <span className="flex-1 text-sm truncate">{bookmark.title}</span>
                          {index === 0 && (
                            <span className="text-xs text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-300 px-2 py-0.5 rounded">
                              Keep
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {duplicates.size > 0 && selectedForDeletion.size > 0 && (
            <Button
              variant="destructive"
              onClick={handleDeleteSelected}
              disabled={isDeleting}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {isDeleting
                ? 'Deleting...'
                : `Delete ${selectedForDeletion.size} Bookmarks`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
