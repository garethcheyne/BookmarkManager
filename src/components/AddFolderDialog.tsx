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
import { useBookmarkStore, useSettingsStore } from '@/store'

interface AddFolderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  parentId?: string
}

export function AddFolderDialog({ open, onOpenChange, parentId }: AddFolderDialogProps) {
  const { createFolder, flatBookmarks } = useBookmarkStore()
  const { settings } = useSettingsStore()
  const [name, setName] = useState('')
  const [selectedParentId, setSelectedParentId] = useState(parentId || '1')
  const [isLoading, setIsLoading] = useState(false)

  // Get all folders for the dropdown
  const folders = flatBookmarks.filter((b) => !b.url && !['0'].includes(b.id))

  const handleSave = async () => {
    if (!name.trim()) return

    setIsLoading(true)
    try {
      await createFolder(selectedParentId, name)
      setName('')
      setSelectedParentId(parentId || '1')
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to create folder:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setName('')
    setSelectedParentId(parentId || '1')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[350px]">
        <DialogHeader>
          <DialogTitle>New Folder</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Folder Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Folder"
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
          </div>

          {settings.hideRootFolders && folders.length > 0 && (
            <div className="grid gap-2">
              <Label htmlFor="folder">Parent Folder</Label>
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading || !name.trim()}>
            {isLoading ? 'Creating...' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
