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
import { useGitHubStore } from '@/store'
import { Github, ExternalLink, Check, AlertCircle, Loader2 } from 'lucide-react'

interface GitHubConnectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GitHubConnectDialog({ open, onOpenChange }: GitHubConnectDialogProps) {
  const { isAuthenticated, auth, isAuthenticating, authError, login, logout } = useGitHubStore()
  const [token, setToken] = useState('')

  const handleConnect = async () => {
    if (!token.trim()) return
    try {
      await login(token.trim())
      setToken('')
      onOpenChange(false)
    } catch {
      // Error is handled in the store
    }
  }

  const handleDisconnect = async () => {
    await logout()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            {isAuthenticated ? 'GitHub Connected' : 'Connect to GitHub'}
          </DialogTitle>
          <DialogDescription>
            {isAuthenticated
              ? 'Your GitHub account is connected. You can share and sync bookmarks.'
              : 'Connect your GitHub account to share bookmark collections via Gists or Repos.'}
          </DialogDescription>
        </DialogHeader>

        {isAuthenticated && auth ? (
          <div className="py-4">
            <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
              {auth.avatarUrl && (
                <img
                  src={auth.avatarUrl}
                  alt={auth.username}
                  className="w-12 h-12 rounded-full"
                />
              )}
              <div className="flex-1">
                <p className="font-medium">{auth.username}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Check className="h-3 w-3 text-green-500" />
                  Connected
                </p>
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button variant="destructive" onClick={handleDisconnect}>
                Disconnect
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="py-4 space-y-4">
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <p className="text-sm font-medium">How to get a Personal Access Token:</p>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Go to GitHub Settings → Developer Settings</li>
                <li>Click "Personal Access Tokens" → "Tokens (classic)"</li>
                <li>Generate new token with <code className="bg-background px-1 rounded">gist</code> and <code className="bg-background px-1 rounded">repo</code> scopes</li>
                <li>Copy and paste the token below</li>
              </ol>
              <a
                href="https://github.com/settings/tokens/new?scopes=gist,repo&description=Bookmark%20Manager%20Pro"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-blue-500 hover:underline mt-2"
              >
                Create token on GitHub
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <div className="space-y-2">
              <Label htmlFor="token">Personal Access Token</Label>
              <Input
                id="token"
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
              />
            </div>

            {authError && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{authError}</span>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleConnect} disabled={!token.trim() || isAuthenticating}>
                {isAuthenticating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  'Connect'
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
