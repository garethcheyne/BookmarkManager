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
import { Alert, AlertDescription } from '@/components/ui'
import { Loader2 } from 'lucide-react'
import { useSnippetStore } from '@/store'
import { useGitHubStore } from '@/store/githubStore'
import { gistsApi } from '@/lib/github-api'
import { importSnippetsFromJson } from '@/lib/import-export'
import { toast } from '@/components/ui/use-toast'

interface ImportSnippetsFromGistDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ImportSnippetsFromGistDialog({
  open,
  onOpenChange,
}: ImportSnippetsFromGistDialogProps) {
  const { createSnippet } = useSnippetStore()
  const { auth, isAuthenticated } = useGitHubStore()

  const [gistUrl, setGistUrl] = useState('')
  const [isImporting, setIsImporting] = useState(false)

  const handleImport = async () => {
    if (!isAuthenticated || !auth?.accessToken) {
      toast({
        title: 'Not authenticated',
        description: 'Please connect to GitHub first',
        variant: 'destructive',
      })
      return
    }

    if (!gistUrl.trim()) {
      toast({
        title: 'URL required',
        description: 'Please enter a Gist URL',
        variant: 'destructive',
      })
      return
    }

    setIsImporting(true)

    try {
      // Extract gist ID from URL
      const match = gistUrl.match(/gist\.github\.com\/(?:.*?\/)?([a-f0-9]+)/)
      if (!match) {
        throw new Error('Invalid Gist URL')
      }

      const gistId = match[1]

      // Fetch gist
      const gist = await gistsApi.get(auth.accessToken, gistId)

      // Find JSON file in gist
      const jsonFile = Object.values(gist.files).find(
        (file) => file.filename.endsWith('.json')
      )

      if (!jsonFile || !jsonFile.content) {
        throw new Error('No JSON file found in Gist')
      }

      // Import snippets
      const snippets = importSnippetsFromJson(jsonFile.content)

      // Create snippets
      for (const snippet of snippets) {
        await createSnippet(snippet)
      }

      toast({
        title: 'Snippets imported',
        description: `Imported ${snippets.length} snippet(s) from Gist`,
      })

      handleClose()
    } catch (error) {
      console.error('Failed to import snippets:', error)
      toast({
        title: 'Import failed',
        description: error instanceof Error ? error.message : 'Failed to import snippets',
        variant: 'destructive',
      })
    } finally {
      setIsImporting(false)
    }
  }

  const handleClose = () => {
    setGistUrl('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import Snippets from Gist</DialogTitle>
          <DialogDescription>
            Import JavaScript snippets from a GitHub Gist
          </DialogDescription>
        </DialogHeader>

        {!isAuthenticated && (
          <Alert>
            <AlertDescription>
              You need to connect to GitHub first to import snippets.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gist-url">Gist URL *</Label>
            <Input
              id="gist-url"
              value={gistUrl}
              onChange={(e) => setGistUrl(e.target.value)}
              placeholder="https://gist.github.com/username/gist-id"
              disabled={isImporting}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isImporting}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={isImporting || !isAuthenticated || !gistUrl.trim()}
          >
            {isImporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              'Import Snippets'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
