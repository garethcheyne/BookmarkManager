import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { TagInput } from './TagInput'
import { useBookmarkStore } from '@/store'
import type { Bookmark } from '@/types'

interface EditBookmarkDialogProps {
  bookmark: Bookmark | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditBookmarkDialog({ bookmark, open, onOpenChange }: EditBookmarkDialogProps) {
  const { updateBookmark, updateMetadata, metadata } = useBookmarkStore()
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Get all existing tags for suggestions
  const allTags = Array.from(
    new Set(Object.values(metadata).flatMap((m) => m.customTags || []))
  )

  useEffect(() => {
    if (bookmark) {
      setTitle(bookmark.title || '')
      setUrl(bookmark.url || '')
      const bookmarkMeta = metadata[bookmark.id]
      setTags(bookmarkMeta?.customTags || [])
      setNotes(bookmarkMeta?.notes || '')
    }
  }, [bookmark, metadata])

  const handleSave = async () => {
    if (!bookmark) return

    setIsLoading(true)
    try {
      // Update bookmark title/URL
      await updateBookmark(bookmark.id, { title, url: url || undefined })

      // Update metadata (tags, notes)
      await updateMetadata(bookmark.id, { customTags: tags, notes })

      onOpenChange(false)
    } catch (error) {
      console.error('Failed to update bookmark:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const isFolder = !bookmark?.url

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isFolder ? 'Edit Folder' : 'Edit Bookmark'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Bookmark title"
            />
          </div>

          {!isFolder && (
            <div className="grid gap-2">
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
          )}

          <div className="grid gap-2">
            <Label>Tags</Label>
            <TagInput
              tags={tags}
              onTagsChange={setTags}
              suggestions={allTags}
              placeholder="Add tags (press Enter)"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this bookmark..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading || !title.trim()}>
            {isLoading ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
