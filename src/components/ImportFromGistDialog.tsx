import { useState } from 'react'
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
import { ScrollArea } from './ui/scroll-area'
import { useBookmarkStore, useGitHubStore } from '@/store'
import { gistsApi, parseGistUrl, parseCollectionJson } from '@/lib/github-api'
import { importFromJson } from '@/lib/import-export'
import { Github, Download, Check, AlertCircle, Loader2, FileJson } from 'lucide-react'
import type { GistInfo } from '@/types'

interface ImportFromGistDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ImportFromGistDialog({ open, onOpenChange }: ImportFromGistDialogProps) {
  const { refreshBookmarks } = useBookmarkStore()
  const { isAuthenticated, auth, userGists } = useGitHubStore()

  const [gistUrl, setGistUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ gist: GistInfo; content: string } | null>(null)
  const [result, setResult] = useState<{ imported: number } | null>(null)
  const [skipDuplicates, setSkipDuplicates] = useState(true)

  // Filter gists that look like bookmark collections
  const bookmarkGists = userGists.filter(
    (g) => Object.keys(g.files).some((f) => f.endsWith('.json'))
  )

  const handleFetchGist = async (gistId?: string) => {
    const id = gistId || parseGistUrl(gistUrl)
    if (!id) {
      setError('Invalid Gist URL or ID')
      return
    }

    setIsLoading(true)
    setError(null)
    setPreview(null)

    try {
      // Try to fetch the gist (public or with auth)
      let gist: GistInfo
      if (auth) {
        gist = await gistsApi.get(auth.accessToken, id)
      } else {
        gist = await gistsApi.getPublic(id)
      }

      // Find the JSON file
      const jsonFile = Object.values(gist.files).find(
        (f) => f.filename.endsWith('.json')
      )

      if (!jsonFile) {
        throw new Error('No bookmark collection found in this gist')
      }

      // Fetch the content
      const content = await gistsApi.getFileContent(jsonFile.rawUrl)

      // Validate it's a valid collection
      parseCollectionJson(content)

      setPreview({ gist, content })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleImport = async () => {
    if (!preview) return

    setIsLoading(true)
    setError(null)

    try {
      const importResult = await importFromJson(preview.content, {
        strategy: 'append',
        skipDuplicates,
        preserveTags: true,
      })

      await refreshBookmarks()
      setResult({ imported: importResult.imported })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setGistUrl('')
    setError(null)
    setPreview(null)
    setResult(null)
    onOpenChange(false)
  }

  const handleSelectGist = (gist: GistInfo) => {
    handleFetchGist(gist.id)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            Import from GitHub Gist
          </DialogTitle>
          <DialogDescription>
            Import bookmarks from a GitHub Gist URL or select from your gists
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="py-4 space-y-4">
            <div className="flex items-center gap-2 p-4 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-lg">
              <Check className="h-5 w-5" />
              <span>Successfully imported {result.imported} bookmarks!</span>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>Close</Button>
            </DialogFooter>
          </div>
        ) : preview ? (
          <div className="py-4 space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <FileJson className="h-5 w-5" />
                <span className="font-medium">{preview.gist.description || 'Bookmark Collection'}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                From: {preview.gist.htmlUrl}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="skipDuplicates"
                checked={skipDuplicates}
                onChange={(e) => setSkipDuplicates(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="skipDuplicates">Skip duplicate URLs</Label>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setPreview(null)}>
                Back
              </Button>
              <Button onClick={handleImport} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Import
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gistUrl">Gist URL or ID</Label>
              <div className="flex gap-2">
                <Input
                  id="gistUrl"
                  value={gistUrl}
                  onChange={(e) => setGistUrl(e.target.value)}
                  placeholder="https://gist.github.com/user/abc123 or abc123"
                  onKeyDown={(e) => e.key === 'Enter' && handleFetchGist()}
                />
                <Button onClick={() => handleFetchGist()} disabled={isLoading || !gistUrl.trim()}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Fetch'}
                </Button>
              </div>
            </div>

            {isAuthenticated && bookmarkGists.length > 0 && (
              <div className="space-y-2">
                <Label>Or select from your gists</Label>
                <ScrollArea className="h-[200px] border rounded-md">
                  <div className="p-2 space-y-1">
                    {bookmarkGists.map((gist) => (
                      <button
                        key={gist.id}
                        onClick={() => handleSelectGist(gist)}
                        className="w-full p-2 text-left rounded hover:bg-accent transition-colors"
                      >
                        <p className="font-medium text-sm truncate">
                          {gist.description || Object.keys(gist.files)[0]}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Updated: {new Date(gist.updatedAt).toLocaleDateString()}
                        </p>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
