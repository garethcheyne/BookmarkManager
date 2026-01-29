import { useEffect, useState } from 'react'
import { Moon, Sun, Monitor, Github, Unlink, ExternalLink, FolderGit2, Link } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useSettingsStore, useGitHubStore, useBookmarkStore } from '@/store'
import { GitHubConnectDialog } from '@/components/GitHubConnectDialog'
import versionInfo from '@/version.json'

export function Options() {
  const { settings, fetchSettings, updateSettings, resetSettings } = useSettingsStore()
  const {
    isAuthenticated,
    auth,
    folderShares,
    initialize: initializeGitHub,
    unlinkFolder,
    logout
  } = useGitHubStore()
  const { getBookmarkById, fetchBookmarks } = useBookmarkStore()

  const [githubConnectOpen, setGithubConnectOpen] = useState(false)

  useEffect(() => {
    fetchSettings()
    initializeGitHub()
    fetchBookmarks()
  }, [fetchSettings, initializeGitHub, fetchBookmarks])

  const folderSharesList = Object.values(folderShares)

  const handleUnlink = async (folderId: string, folderName: string) => {
    if (confirm(`Unlink "${folderName}" from GitHub? This won't delete the file on GitHub.`)) {
      await unlinkFolder(folderId)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto p-8">
        <h1 className="text-2xl font-bold mb-6">Bookmark Manager Pro Settings</h1>

        <Tabs defaultValue="settings" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="github">
              <Github className="h-4 w-4 mr-2" />
              GitHub Sync
            </TabsTrigger>
          </TabsList>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-8">
            {/* Appearance Section */}
            <section>
              <h2 className="text-lg font-semibold mb-4">Appearance</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Theme</label>
                  <div className="flex gap-2">
                    <Button
                      variant={settings.theme === 'light' ? 'default' : 'outline'}
                      onClick={() => updateSettings({ theme: 'light' })}
                    >
                      <Sun className="h-4 w-4 mr-2" />
                      Light
                    </Button>
                    <Button
                      variant={settings.theme === 'dark' ? 'default' : 'outline'}
                      onClick={() => updateSettings({ theme: 'dark' })}
                    >
                      <Moon className="h-4 w-4 mr-2" />
                      Dark
                    </Button>
                    <Button
                      variant={settings.theme === 'system' ? 'default' : 'outline'}
                      onClick={() => updateSettings({ theme: 'system' })}
                    >
                      <Monitor className="h-4 w-4 mr-2" />
                      System
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">Compact Mode</label>
                    <p className="text-xs text-muted-foreground">Reduce padding and spacing</p>
                  </div>
                  <Button
                    variant={settings.compactMode ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateSettings({ compactMode: !settings.compactMode })}
                  >
                    {settings.compactMode ? 'On' : 'Off'}
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">Show Favicons</label>
                    <p className="text-xs text-muted-foreground">Display website icons</p>
                  </div>
                  <Button
                    variant={settings.showFavicons ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateSettings({ showFavicons: !settings.showFavicons })}
                  >
                    {settings.showFavicons ? 'On' : 'Off'}
                  </Button>
                </div>
              </div>
            </section>

            {/* Behavior Section */}
            <section>
              <h2 className="text-lg font-semibold mb-4">Behavior</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">Confirm Delete</label>
                    <p className="text-xs text-muted-foreground">Ask before deleting bookmarks</p>
                  </div>
                  <Button
                    variant={settings.confirmDelete ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateSettings({ confirmDelete: !settings.confirmDelete })}
                  >
                    {settings.confirmDelete ? 'On' : 'Off'}
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">Open in New Tab</label>
                    <p className="text-xs text-muted-foreground">Open bookmarks in new tab by default</p>
                  </div>
                  <Button
                    variant={settings.openInNewTab ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateSettings({ openInNewTab: !settings.openInNewTab })}
                  >
                    {settings.openInNewTab ? 'On' : 'Off'}
                  </Button>
                </div>
              </div>
            </section>

            {/* Search Section */}
            <section>
              <h2 className="text-lg font-semibold mb-4">Search</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">Fuzzy Search</label>
                    <p className="text-xs text-muted-foreground">Enable fuzzy matching</p>
                  </div>
                  <Button
                    variant={settings.fuzzySearch ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateSettings({ fuzzySearch: !settings.fuzzySearch })}
                  >
                    {settings.fuzzySearch ? 'On' : 'Off'}
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">Search in URLs</label>
                    <p className="text-xs text-muted-foreground">Include URLs in search</p>
                  </div>
                  <Button
                    variant={settings.searchInUrls ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateSettings({ searchInUrls: !settings.searchInUrls })}
                  >
                    {settings.searchInUrls ? 'On' : 'Off'}
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">Search in Notes</label>
                    <p className="text-xs text-muted-foreground">Include notes in search</p>
                  </div>
                  <Button
                    variant={settings.searchInNotes ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateSettings({ searchInNotes: !settings.searchInNotes })}
                  >
                    {settings.searchInNotes ? 'On' : 'Off'}
                  </Button>
                </div>
              </div>
            </section>

            {/* Privacy Section */}
            <section>
              <h2 className="text-lg font-semibold mb-4">Privacy</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">Track Access Count</label>
                    <p className="text-xs text-muted-foreground">Track how often bookmarks are used</p>
                  </div>
                  <Button
                    variant={settings.trackAccessCount ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateSettings({ trackAccessCount: !settings.trackAccessCount })}
                  >
                    {settings.trackAccessCount ? 'On' : 'Off'}
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">Track Last Accessed</label>
                    <p className="text-xs text-muted-foreground">Track when bookmarks were last used</p>
                  </div>
                  <Button
                    variant={settings.trackLastAccessed ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateSettings({ trackLastAccessed: !settings.trackLastAccessed })}
                  >
                    {settings.trackLastAccessed ? 'On' : 'Off'}
                  </Button>
                </div>
              </div>
            </section>

            {/* Reset Section */}
            <section className="border-t pt-6">
              <h2 className="text-lg font-semibold mb-4">Reset</h2>
              <Button variant="destructive" onClick={resetSettings}>
                Reset All Settings to Defaults
              </Button>
            </section>
          </TabsContent>

          {/* GitHub Sync Tab */}
          <TabsContent value="github" className="space-y-6">
            {/* Connection Status */}
            <section className="p-4 border rounded-lg">
              <h2 className="text-lg font-semibold mb-4">GitHub Connection</h2>
              {isAuthenticated ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <Github className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">{auth?.username}</p>
                      <p className="text-sm text-muted-foreground">Connected</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setGithubConnectOpen(true)}>
                      Change Token
                    </Button>
                    <Button variant="destructive" size="sm" onClick={logout}>
                      Disconnect
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground mb-4">
                    Connect your GitHub account to sync folders to repositories or gists.
                  </p>
                  <Button onClick={() => setGithubConnectOpen(true)}>
                    <Github className="h-4 w-4 mr-2" />
                    Connect GitHub
                  </Button>
                </div>
              )}
            </section>

            {/* Connected Folders */}
            <section>
              <h2 className="text-lg font-semibold mb-4">Connected Folders</h2>
              {folderSharesList.length === 0 ? (
                <div className="text-center py-8 border rounded-lg bg-muted/30">
                  <FolderGit2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No folders connected to GitHub yet.</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Right-click a folder in the bookmark manager to share it.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {folderSharesList.map((share) => {
                    const folder = getBookmarkById(share.folderId)
                    const folderName = folder?.title || share.name || 'Unknown Folder'

                    return (
                      <div
                        key={share.folderId}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            share.type === 'repo'
                              ? 'bg-purple-100 dark:bg-purple-900/30'
                              : 'bg-blue-100 dark:bg-blue-900/30'
                          }`}>
                            {share.type === 'repo' ? (
                              <FolderGit2 className="h-5 w-5 text-purple-600" />
                            ) : (
                              <Link className="h-5 w-5 text-blue-600" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{folderName}</p>
                            <p className="text-sm text-muted-foreground truncate">
                              {share.type === 'repo' ? 'Repository' : 'Gist'}: {share.resourceId}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Last synced: {formatDate(share.lastSynced)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            title="Open on GitHub"
                          >
                            <a href={share.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleUnlink(share.folderId, folderName)}
                            title="Unlink from GitHub"
                          >
                            <Unlink className="h-4 w-4 text-orange-500" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            {/* Sync Info */}
            <section className="p-4 border rounded-lg bg-muted/30">
              <h3 className="font-medium mb-2">About Sync</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>- Folder connections sync across your Chrome browsers automatically</li>
                <li>- Use the sync button in the context menu to push changes to GitHub</li>
                <li>- Each folder is saved as a separate JSON file to avoid conflicts</li>
                <li>- Your GitHub token is stored locally and does not sync</li>
              </ul>
            </section>
          </TabsContent>
        </Tabs>

        {/* About Section */}
        <section className="border-t pt-6 mt-8">
          <h2 className="text-lg font-semibold mb-4">About</h2>
          <div className="text-sm text-muted-foreground">
            <p>Bookmark Manager Pro v{versionInfo.version}</p>
            <p className="mt-2">
              A modern bookmark management extension with GitHub Gist/Repo sharing capabilities.
            </p>
          </div>
        </section>
      </div>

      {/* GitHub Connect Dialog */}
      <GitHubConnectDialog open={githubConnectOpen} onOpenChange={setGithubConnectOpen} />
    </div>
  )
}
