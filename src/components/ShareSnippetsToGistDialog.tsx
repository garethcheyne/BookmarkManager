import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui'
import { Alert, AlertDescription } from '@/components/ui'
import { ExternalLink, Loader2 } from 'lucide-react'
import { useSnippetStore } from '@/store'
import { useGitHubStore } from '@/store/githubStore'
import { gistsApi } from '@/lib/github-api'
import { exportSnippetsToJson } from '@/lib/import-export'
import { toast } from '@/components/ui/use-toast'

interface ShareSnippetsToGistDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ShareSnippetsToGistDialog({ open, onOpenChange }: ShareSnippetsToGistDialogProps) {
  const { snippets, selectedIds } = useSnippetStore()
  const { auth, isAuthenticated } = useGitHubStore()

  const [gistName, setGistName] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const [gistUrl, setGistUrl] = useState<string | null>(null)

  const handleShare = async () => {
    if (!isAuthenticated || !auth?.accessToken) {
      toast({
        title: 'Not authenticated',
        description: 'Please connect to GitHub first',
        variant: 'destructive',
      })
      return
    }

    if (!gistName.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a name for the gist',
        variant: 'destructive',
      })
      return
    }

    setIsSharing(true)
    setGistUrl(null)

    try {
      // Get snippets to share
      const snippetsToShare = selectedIds.size > 0
        ? snippets.filter((s) => selectedIds.has(s.id))
        : snippets

      if (snippetsToShare.length === 0) {
        toast({
          title: 'No snippets',
          description: 'No snippets to share',
          variant: 'destructive',
        })
        return
      }

      // Export snippets
      const json = exportSnippetsToJson(snippetsToShare)

      // Create gist
      const gist = await gistsApi.create(
        auth.accessToken,
        {
          description: description || `${snippetsToShare.length} snippets from BookStash`,
          isPublic: isPublic,
          files: {
            [`${gistName}.json`]: { content: json },
          },
        }
      )

      setGistUrl(gist.htmlUrl)

      toast({
        title: 'Snippets shared',
        description: `Shared ${snippetsToShare.length} snippet(s) to GitHub Gist`,
      })
    } catch (error) {
      console.error('Failed to share snippets:', error)
      toast({
        title: 'Share failed',
        description: error instanceof Error ? error.message : 'Failed to create gist',
        variant: 'destructive',
      })
    } finally {
      setIsSharing(false)
    }
  }

  const handleClose = () => {
    setGistName('')
    setDescription('')
    setIsPublic(false)
    setGistUrl(null)
    onOpenChange(false)
  }

  const snippetsToShareCount = selectedIds.size > 0 ? selectedIds.size : snippets.length

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share Snippets to Gist</DialogTitle>
          <DialogDescription>
            Share {snippetsToShareCount} snippet{snippetsToShareCount !== 1 ? 's' : ''} as a GitHub Gist
          </DialogDescription>
        </DialogHeader>

        {!isAuthenticated && (
          <Alert>
            <AlertDescription>
              You need to connect to GitHub first to share snippets.
            </AlertDescription>
          </Alert>
        )}

        {gistUrl ? (
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                Snippets successfully shared to GitHub Gist!
              </AlertDescription>
            </Alert>
            <div className="flex items-center gap-2">
              <Input value={gistUrl} readOnly />
              <Button
                variant="outline"
                size="icon"
                onClick={() => window.open(gistUrl, '_blank')}
                title="Open Gist"
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gist-name">Gist Name *</Label>
              <Input
                id="gist-name"
                value={gistName}
                onChange={(e) => setGistName(e.target.value)}
                placeholder="my-snippets"
                disabled={isSharing}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gist-description">Description</Label>
              <Textarea
                id="gist-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                disabled={isSharing}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="public-gist"
                checked={isPublic}
                onCheckedChange={(checked: boolean) => setIsPublic(checked)}
                disabled={isSharing}
              />
              <Label htmlFor="public-gist" className="cursor-pointer">
                Make this gist public
              </Label>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSharing}>
            {gistUrl ? 'Close' : 'Cancel'}
          </Button>
          {!gistUrl && (
            <Button
              onClick={handleShare}
              disabled={isSharing || !isAuthenticated || !gistName.trim()}
            >
              {isSharing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sharing...
                </>
              ) : (
                'Share to Gist'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
