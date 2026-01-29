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
import { Input } from './ui/input'
import { Label } from './ui/label'
import { ScrollArea } from './ui/scroll-area'
import { useBookmarkStore, useGitHubStore } from '@/store'
import { reposApi, parseRepoUrl, parseCollectionJson } from '@/lib/github-api'
import { importFromJson } from '@/lib/import-export'
import { FolderGit2, Download, Check, AlertCircle, Loader2, FileJson } from 'lucide-react'
import type { RepoInfo } from '@/types'

interface ImportFromRepoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ImportFromRepoDialog({ open, onOpenChange }: ImportFromRepoDialogProps) {
  const { refreshBookmarks } = useBookmarkStore()
  const { isAuthenticated, auth, userRepos, fetchRepos, isLoadingRepos } = useGitHubStore()

  const [repoUrl, setRepoUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ repo: RepoInfo; content: string; path: string } | null>(
    null
  )
  const [result, setResult] = useState<{ imported: number } | null>(null)
  const [skipDuplicates, setSkipDuplicates] = useState(true)

  useEffect(() => {
    if (open && isAuthenticated && userRepos.length === 0) {
      fetchRepos()
    }
  }, [open, isAuthenticated, userRepos.length, fetchRepos])

  const handleFetchRepo = async (owner?: string, repoName?: string) => {
    let targetOwner = owner
    let targetRepo = repoName

    if (!targetOwner || !targetRepo) {
      const parsed = parseRepoUrl(repoUrl)
      if (!parsed) {
        setError('Invalid repository URL')
        return
      }
      targetOwner = parsed.owner
      targetRepo = parsed.repo
    }

    setIsLoading(true)
    setError(null)
    setPreview(null)

    try {
      // Try to get the repo info
      let repo: RepoInfo
      if (auth) {
        repo = await reposApi.get(auth.accessToken, targetOwner, targetRepo)
      } else {
        // For public repos without auth
        const response = await fetch(`https://api.github.com/repos/${targetOwner}/${targetRepo}`)
        if (!response.ok) throw new Error('Repository not found')
        const data = await response.json()
        repo = {
          id: data.id,
          name: data.name,
          fullName: data.full_name,
          description: data.description || '',
          htmlUrl: data.html_url,
          defaultBranch: data.default_branch,
          isPrivate: data.private,
          owner: {
            login: data.owner.login,
            avatarUrl: data.owner.avatar_url,
          },
        }
      }

      // Try to find bookmarks.json file
      const path = 'bookmarks.json'
      const content = await reposApi.getFileContent(
        auth?.accessToken || '',
        targetOwner,
        targetRepo,
        path
      )

      // Validate it's a valid collection
      parseCollectionJson(content)

      setPreview({ repo, content, path })
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
    setRepoUrl('')
    setError(null)
    setPreview(null)
    setResult(null)
    onOpenChange(false)
  }

  const handleSelectRepo = (repo: RepoInfo) => {
    handleFetchRepo(repo.owner.login, repo.name)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderGit2 className="h-5 w-5" />
            Import from GitHub Repository
          </DialogTitle>
          <DialogDescription>
            Import bookmarks from a GitHub repository URL or select from your repos
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
                <span className="font-medium">
                  {preview.repo.fullName}/{preview.path}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">From: {preview.repo.htmlUrl}</p>
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
              <Label htmlFor="repoUrl">Repository URL</Label>
              <div className="flex gap-2">
                <Input
                  id="repoUrl"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/user/repo"
                  onKeyDown={(e) => e.key === 'Enter' && handleFetchRepo()}
                />
                <Button onClick={() => handleFetchRepo()} disabled={isLoading || !repoUrl.trim()}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Fetch'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Repository must contain a bookmarks.json file
              </p>
            </div>

            {isAuthenticated && (
              <div className="space-y-2">
                <Label>Or select from your repositories</Label>
                {isLoadingRepos ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : userRepos.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No repositories found.</p>
                ) : (
                  <ScrollArea className="h-[200px] border rounded-md">
                    <div className="p-2 space-y-1">
                      {userRepos.map((repo) => (
                        <button
                          key={repo.id}
                          onClick={() => handleSelectRepo(repo)}
                          className="w-full p-2 text-left rounded hover:bg-accent transition-colors"
                        >
                          <p className="font-medium text-sm truncate">{repo.fullName}</p>
                          {repo.description && (
                            <p className="text-xs text-muted-foreground truncate">
                              {repo.description}
                            </p>
                          )}
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                )}
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
