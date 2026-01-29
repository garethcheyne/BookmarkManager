import { useState, useEffect, useMemo } from 'react'
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
import { Github, FolderGit2, Check, ExternalLink, Loader2, Plus, Link2 } from 'lucide-react'

interface ShareToRepoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  folderId?: string // Optional: share only this folder
  folderName?: string // Optional: name of the folder being shared
}

export function ShareToRepoDialog({ open, onOpenChange, folderId, folderName }: ShareToRepoDialogProps) {
  const { bookmarkTree, selectedIds, flatBookmarks, getBookmarkById } = useBookmarkStore()
  const { isAuthenticated, userRepos, isLoadingRepos, saveToRepo, createRepo, fetchRepos, linkFolderToRepo, folderShares } =
    useGitHubStore()

  // Get list of already-connected repos from existing folder shares
  const connectedRepos = useMemo(() => {
    const repoMap = new Map<string, { resourceId: string; name: string; url: string }>()
    Object.values(folderShares).forEach((share) => {
      if (share.type === 'repo' && !repoMap.has(share.resourceId)) {
        repoMap.set(share.resourceId, {
          resourceId: share.resourceId,
          name: share.name,
          url: share.url,
        })
      }
    })
    return Array.from(repoMap.values())
  }, [folderShares])

  const [mode, setMode] = useState<'select' | 'create'>('select')
  const [selectedRepo, setSelectedRepo] = useState('')
  const [commitMessage, setCommitMessage] = useState('Update bookmarks')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{ url: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  // New repo form
  const [newRepoName, setNewRepoName] = useState('')
  const [newRepoDescription, setNewRepoDescription] = useState('')
  const [newRepoPrivate, setNewRepoPrivate] = useState(false)

  useEffect(() => {
    if (open && isAuthenticated && userRepos.length === 0) {
      fetchRepos()
    }
  }, [open, isAuthenticated, userRepos.length, fetchRepos])

  const handleShare = async () => {
    if (!selectedRepo && mode === 'select') {
      setError('Please select a repository')
      return
    }

    if (mode === 'create' && !newRepoName.trim()) {
      setError('Please enter a repository name')
      return
    }

    setIsLoading(true)
    setError(null)
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

      let targetRepo: { owner: string; name: string; htmlUrl: string }

      if (mode === 'create') {
        // Create new repo first
        const repo = await createRepo(newRepoName.trim(), newRepoDescription, newRepoPrivate)
        targetRepo = { owner: repo.owner.login, name: repo.name, htmlUrl: repo.htmlUrl }
      } else {
        // Use selected repo
        const repo = userRepos.find((r) => `${r.owner.login}/${r.name}` === selectedRepo)
        if (!repo) throw new Error('Repository not found')
        targetRepo = { owner: repo.owner.login, name: repo.name, htmlUrl: repo.htmlUrl }
      }

      // Generate file path - unique per folder to avoid overwrites
      const safeFileName = (folderName || 'bookmarks')
        .replace(/[^a-zA-Z0-9-_\s]/g, '')
        .replace(/\s+/g, '-')
        .toLowerCase()
      const filePath = folderId
        ? `bookmarks/${safeFileName}.json`
        : 'bookmarks.json'

      // Save to repo
      await saveToRepo(targetRepo.owner, targetRepo.name, content, commitMessage, filePath)

      // Link folder to repo if sharing a specific folder
      if (folderId) {
        const repoFullName = `${targetRepo.owner}/${targetRepo.name}`
        await linkFolderToRepo(folderId, repoFullName, targetRepo.htmlUrl, folderName || targetRepo.name, filePath)
      }

      setResult({ url: `${targetRepo.htmlUrl}/blob/main/${filePath}` })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setResult(null)
    setError(null)
    setSelectedRepo('')
    setCommitMessage('Update bookmarks')
    setMode('select')
    setNewRepoName('')
    setNewRepoDescription('')
    setNewRepoPrivate(false)
    onOpenChange(false)
  }

  if (!isAuthenticated) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderGit2 className="h-5 w-5" />
              Share to GitHub Repository
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center">
            <p className="text-muted-foreground mb-4">
              Connect your GitHub account to save bookmarks to a repository.
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
            <FolderGit2 className="h-5 w-5" />
            Share to GitHub Repository
          </DialogTitle>
          <DialogDescription>
            {folderId && folderName
              ? `Save folder "${folderName}" to a GitHub repository`
              : selectedIds.size > 0
                ? `Save ${selectedIds.size} selected bookmark${selectedIds.size > 1 ? 's' : ''} to a repository`
                : 'Save all your bookmarks to a GitHub repository'}
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="py-4 space-y-4">
            <div className="flex items-center gap-2 p-4 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-lg">
              <Check className="h-5 w-5" />
              <span>Bookmarks saved to repository!</span>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleClose}>
                Close
              </Button>
              <Button className="flex-1" asChild>
                <a href={result.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View File
                </a>
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-4 space-y-4">
            <div className="flex gap-2">
              <Button
                variant={mode === 'select' ? 'default' : 'outline'}
                onClick={() => setMode('select')}
                className="flex-1"
              >
                <Github className="mr-2 h-4 w-4" />
                Existing Repo
              </Button>
              <Button
                variant={mode === 'create' ? 'default' : 'outline'}
                onClick={() => setMode('create')}
                className="flex-1"
              >
                <Plus className="mr-2 h-4 w-4" />
                New Repo
              </Button>
            </div>

            {mode === 'select' ? (
              <div className="space-y-3">
                {/* Show connected repos for quick selection */}
                {connectedRepos.length > 0 && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      <Link2 className="h-3.5 w-3.5" />
                      Your Connected Repos
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {connectedRepos.map((repo) => (
                        <Button
                          key={repo.resourceId}
                          variant={selectedRepo === repo.resourceId ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSelectedRepo(repo.resourceId)}
                          className="text-xs"
                        >
                          {repo.resourceId}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>{connectedRepos.length > 0 ? 'Or Select Another Repository' : 'Select Repository'}</Label>
                  {isLoadingRepos ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                  ) : userRepos.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">
                      No repositories found. Create a new one instead.
                    </p>
                  ) : (
                    <select
                      value={selectedRepo}
                      onChange={(e) => setSelectedRepo(e.target.value)}
                      className="w-full p-2 border rounded-md bg-background"
                    >
                      <option value="">Select a repository...</option>
                      {userRepos.map((repo) => (
                        <option key={repo.id} value={`${repo.owner.login}/${repo.name}`}>
                          {repo.owner.login}/{repo.name}
                          {repo.isPrivate ? ' (private)' : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="repoName">Repository Name</Label>
                  <Input
                    id="repoName"
                    value={newRepoName}
                    onChange={(e) => setNewRepoName(e.target.value)}
                    placeholder="my-bookmarks"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="repoDescription">Description (optional)</Label>
                  <Textarea
                    id="repoDescription"
                    value={newRepoDescription}
                    onChange={(e) => setNewRepoDescription(e.target.value)}
                    placeholder="My bookmark collection"
                    rows={2}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="repoPrivate"
                    checked={newRepoPrivate}
                    onChange={(e) => setNewRepoPrivate(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="repoPrivate">Make repository private</Label>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="commitMessage">Commit Message</Label>
              <Input
                id="commitMessage"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="Update bookmarks"
              />
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
                {error}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleShare}
                disabled={
                  isLoading ||
                  (mode === 'select' && !selectedRepo) ||
                  (mode === 'create' && !newRepoName.trim())
                }
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save to Repo'
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
