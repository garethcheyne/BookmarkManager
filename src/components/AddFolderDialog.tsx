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
import { useBookmarkStore } from '@/store'

interface AddFolderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  parentId?: string
}

export function AddFolderDialog({ open, onOpenChange, parentId = '1' }: AddFolderDialogProps) {
  const { createFolder } = useBookmarkStore()
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) return

    setIsLoading(true)
    try {
      await createFolder(parentId, name)
      setName('')
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to create folder:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setName('')
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
