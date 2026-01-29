import { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { useBookmarkStore, useGitHubStore } from '@/store'
import { exportToJson } from '@/lib/import-export'
import { Github, Globe, Lock, Check, Copy, ExternalLink, Loader2, Link2 } from 'lucide-react'

interface ShareToGistDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  folderId?: string // Optional: share only this folder
  folderName?: string // Optional: name of the folder being shared
}

export function ShareToGistDialog({ open, onOpenChange, folderId, folderName }: ShareToGistDialogProps) {
  const { bookmarkTree, selectedIds, flatBookmarks, getBookmarkById } = useBookmarkStore()
  const { isAuthenticated, createGist, userGists, updateGist, linkFolderToGist, folderShares } = useGitHubStore()

  // Get list of already-connected gists from existing folder shares
  const connectedGists = useMemo(() => {
    const gistMap = new Map<string, { resourceId: string; name: string; url: string }>()
    Object.values(folderShares).forEach((share) => {
      if (share.type === 'gist' && !gistMap.has(share.resourceId)) {
        gistMap.set(share.resourceId, {
          resourceId: share.resourceId,
          name: share.name,
          url: share.url,
        })
      }
    })
    return Array.from(gistMap.values())
  }, [folderShares])

  const [name, setName] = useState(folderName || 'My Bookmarks')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{ url: string; id: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [updateExisting, setUpdateExisting] = useState(false)
  const [selectedGistId, setSelectedGistId] = useState<string>('')

  // Filter gists that look like bookmark collections
  const bookmarkGists = userGists.filter(
    (g) => Object.keys(g.files).some((f) => f.endsWith('.json'))
  )

  const handleShare = async () => {
    setIsLoading(true)
    setResult(null)

    try {
      // Get bookmarks to export
      let bookmarksToExport = bookmarkTree[0]?.children || []

      // If a specific folder is provided, export only that folder's contents
      if (folderId) {
        const folder = getBookmarkById(folderId)
        if (folder?.children) {
          bookmarksToExport = folder.children
        }
      }
      // If specific bookmarks are selected, export only those
      else if (selectedIds.size > 0) {
        bookmarksToExport = flatBookmarks.filter((b) => selectedIds.has(b.id))
      }

      // Generate JSON content
      const content = await exportToJson(bookmarksToExport, {
        format: 'json',
        includeMetadata: true,
        includeTags: true,
        includeNotes: true,
      })

      let gist
      if (updateExisting && selectedGistId) {
        gist = await updateGist(selectedGistId, content)
      } else {
        gist = await createGist(name, description, content, isPublic)
      }

      // Link folder to gist if sharing a specific folder
      if (folderId) {
        await linkFolderToGist(folderId, gist.id, gist.htmlUrl, name)
      }

      setResult({ url: gist.htmlUrl, id: gist.id })
    } catch (error) {
      console.error('Failed to share to gist:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyUrl = () => {
    if (result?.url) {
      navigator.clipboard.writeText(result.url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleClose = () => {
    setResult(null)
    setName('My Bookmarks')
    setDescription('')
    setIsPublic(true)
    setUpdateExisting(false)
    setSelectedGistId('')
    onOpenChange(false)
  }

  if (!isAuthenticated) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Github className="h-5 w-5" />
              Share to GitHub Gist
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center">
            <p className="text-muted-foreground mb-4">
              Connect your GitHub account to share bookmarks.
            </p>
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            Share to GitHub Gist
          </DialogTitle>
          <DialogDescription>
            {folderId && folderName
              ? `Share folder "${folderName}" as a GitHub Gist`
              : selectedIds.size > 0
                ? `Share ${selectedIds.size} selected bookmark${selectedIds.size > 1 ? 's' : ''}`
                : 'Share all your bookmarks as a GitHub Gist'}
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="py-4 space-y-4">
            <div className="flex items-center gap-2 p-4 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-lg">
              <Check className="h-5 w-5" />
              <span>Gist created successfully!</span>
            </div>

            <div className="space-y-2">
              <Label>Share URL</Label>
              <div className="flex gap-2">
                <Input value={result.url} readOnly className="flex-1" />
                <Button variant="outline" size="icon" onClick={handleCopyUrl}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleClose}>
                Close
              </Button>
              <Button className="flex-1" asChild>
                <a href={result.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Gist
                </a>
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-4 space-y-4">
            {/* Show connected gists for quick selection */}
            {connectedGists.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Link2 className="h-3.5 w-3.5" />
                  Your Connected Gists
                </Label>
                <div className="flex flex-wrap gap-2">
                  {connectedGists.map((gist) => (
                    <Button
                      key={gist.resourceId}
                      variant={updateExisting && selectedGistId === gist.resourceId ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setUpdateExisting(true)
                        setSelectedGistId(gist.resourceId)
                      }}
                      className="text-xs"
                    >
                      {gist.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {bookmarkGists.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="updateExisting"
                    checked={updateExisting}
                    onChange={(e) => setUpdateExisting(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="updateExisting">{connectedGists.length > 0 ? 'Update another gist' : 'Update existing gist'}</Label>
                </div>

                {updateExisting && (
                  <select
                    value={selectedGistId}
                    onChange={(e) => setSelectedGistId(e.target.value)}
                    className="w-full p-2 border rounded-md bg-background"
                  >
                    <option value="">Select a gist...</option>
                    {bookmarkGists.map((gist) => (
                      <option key={gist.id} value={gist.id}>
                        {gist.description || Object.keys(gist.files)[0]}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {!updateExisting && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Collection Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="My Bookmarks"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="A collection of useful bookmarks..."
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Visibility</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={isPublic ? 'default' : 'outline'}
                      onClick={() => setIsPublic(true)}
                      className="flex-1"
                    >
                      <Globe className="mr-2 h-4 w-4" />
                      Public
                    </Button>
                    <Button
                      type="button"
                      variant={!isPublic ? 'default' : 'outline'}
                      onClick={() => setIsPublic(false)}
                      className="flex-1"
                    >
                      <Lock className="mr-2 h-4 w-4" />
                      Private
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isPublic
                      ? 'Anyone with the link can view this gist'
                      : 'Only you can see this gist'}
                  </p>
                </div>
              </>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleShare}
                disabled={isLoading || (!updateExisting && !name.trim()) || (updateExisting && !selectedGistId)}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {updateExisting ? 'Updating...' : 'Creating...'}
                  </>
                ) : updateExisting ? (
                  'Update Gist'
                ) : (
                  'Create Gist'
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
