import { useState } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { TagInput } from './TagInput'
import { useBookmarkStore, useSettingsStore } from '@/store'

interface AddBookmarkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  parentId?: string
}

export function AddBookmarkDialog({ open, onOpenChange, parentId }: AddBookmarkDialogProps) {
  const { createBookmark, updateMetadata, metadata, flatBookmarks } = useBookmarkStore()
  const { settings } = useSettingsStore()
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [selectedParentId, setSelectedParentId] = useState(parentId || '1')
  const [isLoading, setIsLoading] = useState(false)

  // Get all folders for the dropdown
  const folders = flatBookmarks.filter((b) => !b.url && !['0'].includes(b.id))

  // Get all existing tags for suggestions
  const allTags = Array.from(
    new Set(Object.values(metadata).flatMap((m) => m.customTags || []))
  )

  const handleSave = async () => {
    if (!title.trim() || !url.trim()) return

    setIsLoading(true)
    try {
      const bookmark = await createBookmark(selectedParentId, title, url)

      // Add tags if any
      if (tags.length > 0) {
        await updateMetadata(bookmark.id, { customTags: tags })
      }

      // Reset form
      setTitle('')
      setUrl('')
      setTags([])
      setSelectedParentId(parentId || '1')
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to create bookmark:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setTitle('')
    setUrl('')
    setTags([])
    setSelectedParentId(parentId || '1')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Bookmark</DialogTitle>
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

          {settings.hideRootFolders && folders.length > 0 && (
            <div className="grid gap-2">
              <Label htmlFor="folder">Folder</Label>
              <Select value={selectedParentId} onValueChange={setSelectedParentId}>
                <SelectTrigger id="folder">
                  <SelectValue placeholder="Select folder" />
                </SelectTrigger>
                <SelectContent>
                  {folders.map((folder) => {
                    const depth = (folder.parentId === '0' ? 0 : folder.title?.split('/').length || 0)
                    const indent = '  '.repeat(depth)
                    return (
                      <SelectItem key={folder.id} value={folder.id}>
                        {indent}{folder.title}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-2">
            <Label>Tags (optional)</Label>
            <TagInput
              tags={tags}
              onTagsChange={setTags}
              suggestions={allTags}
              placeholder="Add tags (press Enter)"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading || !title.trim() || !url.trim()}>
            {isLoading ? 'Creating...' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
