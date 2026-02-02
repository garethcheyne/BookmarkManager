import { useEffect, useState, useMemo } from 'react'
import { Moon, Sun, Monitor, Github, Unlink, ExternalLink, FolderGit2, Link, Folder, ChevronDown, ChevronRight, Tag, X, Plus, RefreshCw, Shield, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/use-toast'
import { useSettingsStore, useGitHubStore, useBookmarkStore } from '@/store'
import { REPO_COLORS } from '@/store/githubStore'
import { GitHubConnectDialog } from '@/components/GitHubConnectDialog'
import { exportToJson } from '@/lib/import-export'
import versionInfo from '@/version.json'

export function Options() {
  const { settings, fetchSettings, updateSettings, resetSettings } = useSettingsStore()
  const {
    isAuthenticated,
    auth,
    folderShares,
    repoColors,
    tagLibrary,
    initialize: initializeGitHub,
    unlinkFolder,
    logout,
    setRepoColor,
    addTagToLibrary,
    removeTagFromLibrary,
    saveToRepo,
    updateGist,
    updateFolderSyncTime
  } = useGitHubStore()
  const { getBookmarkById, fetchBookmarks } = useBookmarkStore()

  const [githubConnectOpen, setGithubConnectOpen] = useState(false)
  const [expandedRepos, setExpandedRepos] = useState<Set<string>>(new Set())
  const [newTag, setNewTag] = useState('')
  const [isSyncing, setIsSyncing] = useState(false)

  // Group folder shares by repo/gist
  const groupedShares = useMemo(() => {
    const groups: Record<string, { type: 'gist' | 'repo'; resourceId: string; url: string; name: string; folders: typeof folderSharesList }> = {}

    Object.values(folderShares).forEach(share => {
      if (!groups[share.resourceId]) {
        groups[share.resourceId] = {
          type: share.type,
          resourceId: share.resourceId,
          url: share.url,
          name: share.name,
          folders: []
        }
      }
      groups[share.resourceId].folders.push(share)
    })

    return Object.values(groups)
  }, [folderShares])

  const toggleRepoExpanded = (resourceId: string) => {
    setExpandedRepos(prev => {
      const next = new Set(prev)
      if (next.has(resourceId)) {
        next.delete(resourceId)
      } else {
        next.add(resourceId)
      }
      return next
    })
  }

  const getColorForRepo = (resourceId: string) => {
    const colorValue = repoColors[resourceId]
    return REPO_COLORS.find(c => c.value === colorValue) || REPO_COLORS[0]
  }

  const handleAddTag = async () => {
    if (newTag.trim()) {
      await addTagToLibrary(newTag.trim())
      setNewTag('')
    }
  }

  const handleForceSync = async () => {
    if (!isAuthenticated || isSyncing) return
    
    const folderCount = Object.keys(folderShares).length
    if (folderCount === 0) {
      toast.warning('No folders to sync', 'Connect folders to GitHub first.')
      return
    }

    setIsSyncing(true)
    let successCount = 0
    let errorCount = 0

    try {
      for (const [folderId, share] of Object.entries(folderShares)) {
        try {
          const folder = getBookmarkById(folderId)
          if (!folder || !folder.children) {
            console.warn('Folder not found or empty:', folderId)
            continue
          }

          // Export folder contents
          const content = await exportToJson(folder.children, {
            format: 'json',
            includeMetadata: true,
            includeTags: true,
            includeNotes: true,
          })

          // Sync to GitHub
          if (share.type === 'repo') {
            const [owner, repo] = share.resourceId.split('/')
            await saveToRepo(owner, repo, content, `Force sync: ${folder.title}`, share.filePath, folder.title)
          } else if (share.type === 'gist') {
            await updateGist(share.resourceId, content)
          }

          // Update sync time
          await updateFolderSyncTime(folderId)
          successCount++
        } catch (error) {
          console.error('Failed to sync folder:', folderId, error)
          errorCount++
        }
      }

      if (errorCount === 0) {
        toast.success('Sync Complete', `Successfully synced ${successCount} folder${successCount !== 1 ? 's' : ''} to GitHub`)
      } else {
        toast.warning('Sync Partial', `Synced ${successCount} folders, ${errorCount} failed`)
      }
    } catch (error) {
      console.error('Force sync failed:', error)
      toast.error('Sync Failed', (error as Error).message)
    } finally {
      setIsSyncing(false)
    }
  }

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
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="max-w-6xl mx-auto p-8 pb-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">BookStash Settings</h1>
          <p className="text-muted-foreground">Manage your bookmark preferences and GitHub sync</p>
        </div>

        <Tabs defaultValue="settings" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-8">
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="github">
              <Github className="h-4 w-4 mr-2" />
              GitHub Sync
            </TabsTrigger>
          </TabsList>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            {/* Appearance Section */}
            <section className="bg-card border rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <Sun className="h-5 w-5" />
                Appearance
              </h2>
              <div className="space-y-6">
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

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
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

                  <div className="flex items-center justify-between p-4 border rounded-lg">
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

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <label className="text-sm font-medium">Hide Root Folders</label>
                      <p className="text-xs text-muted-foreground">Show only folder contents (flattened view)</p>
                    </div>
                    <Button
                      variant={settings.hideRootFolders ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateSettings({ hideRootFolders: !settings.hideRootFolders })}
                    >
                      {settings.hideRootFolders ? 'On' : 'Off'}
                    </Button>
                  </div>
                </div>
              </div>
            </section>

            {/* Behavior Section */}
            <section className="bg-card border rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Behavior
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
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

                <div className="flex items-center justify-between p-4 border rounded-lg">
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
            <section className="bg-card border rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <Search className="h-5 w-5" />
                Search
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
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

                <div className="flex items-center justify-between p-4 border rounded-lg">
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

                <div className="flex items-center justify-between p-4 border rounded-lg">
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
            <section className="bg-card border rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Privacy
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
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

                <div className="flex items-center justify-between p-4 border rounded-lg">
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

            {/* Tag Library Section */}
            <section className="border rounded-xl p-6 bg-card shadow-sm">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Tag Library
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                Manage your tag library. Tags are suggested when editing bookmarks and sync across devices.
              </p>
              <div className="flex gap-2 mb-6">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add a new tag..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddTag()
                    }
                  }}
                  className="max-w-md"
                />
                <Button onClick={handleAddTag} disabled={!newTag.trim()}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
              {tagLibrary.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted/30">
                  <Tag className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground font-medium">No tags in library yet.</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Tags are automatically added when you tag bookmarks.
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 p-6 border rounded-lg bg-muted/30">
                  {tagLibrary.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1 pl-3 pr-1 py-1.5 text-sm">
                      {tag}
                      <button
                        onClick={() => removeTagFromLibrary(tag)}
                        className="ml-1 hover:bg-muted rounded-full p-0.5 transition-colors"
                        title="Remove tag"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </section>

            {/* Reset Section */}
            <section className="border rounded-xl p-6 bg-card shadow-sm border-destructive/50">
              <h2 className="text-xl font-semibold mb-4">Reset Settings</h2>
              <p className="text-sm text-muted-foreground mb-4">
                This will restore all settings to their default values. This action cannot be undone.
              </p>
              <Button variant="destructive" onClick={resetSettings}>
                Reset All Settings to Defaults
              </Button>
            </section>
          </TabsContent>

          {/* GitHub Sync Tab */}
          <TabsContent value="github" className="space-y-6">
            {/* Connection Status */}
            <section className="bg-card border rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <Github className="h-5 w-5" />
                GitHub Connection
              </h2>
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

            {/* Force Sync Section */}
            {isAuthenticated && Object.keys(folderShares).length > 0 && (
              <section className="bg-card border rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
                      <RefreshCw className="h-5 w-5" />
                      Force Sync All Folders
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Sync all {Object.keys(folderShares).length} connected folder{Object.keys(folderShares).length !== 1 ? 's' : ''} to GitHub immediately
                    </p>
                  </div>
                  <Button 
                    onClick={handleForceSync} 
                    disabled={isSyncing}
                    className="gap-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Syncing...' : 'Sync Now'}
                  </Button>
                </div>
              </section>
            )}

            {/* Connected Repos */}
            <section className="bg-card border rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <FolderGit2 className="h-5 w-5" />
                Connected Repositories
              </h2>
              {groupedShares.length === 0 ? (
                <div className="text-center py-8 border rounded-lg bg-muted/30">
                  <FolderGit2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No folders connected to GitHub yet.</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Right-click a folder in the bookmark manager to share it.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {groupedShares.map((group) => {
                    const isExpanded = expandedRepos.has(group.resourceId)
                    const repoColor = getColorForRepo(group.resourceId)

                    return (
                      <div key={group.resourceId} className="border rounded-lg overflow-hidden">
                        {/* Repo Header */}
                        <div
                          className="flex items-center justify-between p-4 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => toggleRepoExpanded(group.resourceId)}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-muted-foreground">
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </span>
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: repoColor.value + '20' }}
                            >
                              {group.type === 'repo' ? (
                                <FolderGit2 className="h-5 w-5" style={{ color: repoColor.value }} />
                              ) : (
                                <Link className="h-5 w-5" style={{ color: repoColor.value }} />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium truncate">{group.resourceId}</p>
                              <p className="text-sm text-muted-foreground">
                                {group.type === 'repo' ? 'Repository' : 'Gist'} · {group.folders.length} folder{group.folders.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                            {/* Color Picker */}
                            <div className="flex items-center gap-1 p-1 border rounded-lg bg-background">
                              {REPO_COLORS.map((color) => (
                                <button
                                  key={color.value}
                                  className={`w-5 h-5 rounded-full transition-transform hover:scale-110 ${
                                    repoColor.value === color.value ? 'ring-2 ring-offset-2 ring-foreground' : ''
                                  }`}
                                  style={{ backgroundColor: color.value }}
                                  title={color.name}
                                  onClick={() => setRepoColor(group.resourceId, color.value)}
                                />
                              ))}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              asChild
                              title="Open on GitHub"
                            >
                              <a href={group.url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          </div>
                        </div>

                        {/* Folder List */}
                        {isExpanded && (
                          <div className="border-t">
                            {group.folders.map((share) => {
                              const folder = getBookmarkById(share.folderId)
                              const folderName = folder?.title || share.name || 'Unknown Folder'

                              return (
                                <div
                                  key={share.folderId}
                                  className="flex items-center justify-between px-4 py-3 border-b last:border-b-0 hover:bg-muted/20"
                                >
                                  <div className="flex items-center gap-3 min-w-0 pl-7">
                                    <Folder className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium truncate">{folderName}</p>
                                      <p className="text-xs text-muted-foreground">
                                        Last synced: {formatDate(share.lastSynced)}
                                      </p>
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleUnlink(share.folderId, folderName)}
                                    title="Unlink from GitHub"
                                  >
                                    <Unlink className="h-4 w-4 text-orange-500" />
                                  </Button>
                                </div>
                              )
                            })}
                          </div>
                        )}
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
            <p>BookStash v{versionInfo.version}</p>
            <p className="mt-2">
              A modern bookmark management extension with GitHub Gist/Repo sharing capabilities.
            </p>
            <p className="mt-2">
              By Gareth Cheyne & Claude · <a href="https://www.err403.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.err403.com</a>
            </p>
          </div>
        </section>
      </div>

      {/* GitHub Connect Dialog */}
      <GitHubConnectDialog open={githubConnectOpen} onOpenChange={setGithubConnectOpen} />
    </div>
  )
}
