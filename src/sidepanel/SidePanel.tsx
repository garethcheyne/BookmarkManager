import { useState, useEffect, useRef } from 'react'
import {
  Settings,
  Moon,
  Sun,
  FolderPlus,
  BookmarkPlus,
  Trash2,
  Download,
  Upload,
  Github,
  Copy,
  FolderGit2,
  Link,
  User,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/toaster'
import { SearchBar, BookmarkTree, SearchResults, type SearchBarHandle } from '@/components'
import { useKeyboardShortcuts } from '@/hooks'
import { AddBookmarkDialog } from '@/components/AddBookmarkDialog'
import { AddFolderDialog } from '@/components/AddFolderDialog'
import { ImportExportDialog } from '@/components/ImportExportDialog'
import { DuplicatesDialog } from '@/components/DuplicatesDialog'
import { GitHubConnectDialog } from '@/components/GitHubConnectDialog'
import { ShareToGistDialog } from '@/components/ShareToGistDialog'
import { ShareToRepoDialog } from '@/components/ShareToRepoDialog'
import { ImportFromGistDialog } from '@/components/ImportFromGistDialog'
import { ImportFromRepoDialog } from '@/components/ImportFromRepoDialog'
import { useBookmarkStore, useSettingsStore, useGitHubStore } from '@/store'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu'
import versionInfo from '@/version.json'

export function SidePanel() {
  const { searchResults, filter, selectedIds, deleteBookmarks, deselectAll, clearFilter } = useBookmarkStore()
  const { settings, fetchSettings, updateSettings, getEffectiveTheme } = useSettingsStore()
  const { isAuthenticated, auth, initialize: initializeGitHub } = useGitHubStore()

  // Refs
  const searchBarRef = useRef<SearchBarHandle>(null)

  const [addBookmarkOpen, setAddBookmarkOpen] = useState(false)
  const [addFolderOpen, setAddFolderOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [duplicatesDialogOpen, setDuplicatesDialogOpen] = useState(false)

  // GitHub dialogs
  const [githubConnectOpen, setGithubConnectOpen] = useState(false)
  const [shareToGistOpen, setShareToGistOpen] = useState(false)
  const [shareToRepoOpen, setShareToRepoOpen] = useState(false)
  const [importFromGistOpen, setImportFromGistOpen] = useState(false)
  const [importFromRepoOpen, setImportFromRepoOpen] = useState(false)

  useEffect(() => {
    fetchSettings()
    initializeGitHub()
  }, [fetchSettings, initializeGitHub])

  const handleDelete = async () => {
    if (selectedIds.size === 0) return
    if (settings.confirmDelete) {
      const confirmed = window.confirm(
        `Delete ${selectedIds.size} selected bookmark${selectedIds.size > 1 ? 's' : ''}?`
      )
      if (!confirmed) return
    }
    await deleteBookmarks(Array.from(selectedIds))
    deselectAll()
  }

  const handleOpenOptions = () => {
    chrome.runtime.openOptionsPage()
  }

  const toggleTheme = () => {
    const currentTheme = getEffectiveTheme()
    updateSettings({ theme: currentTheme === 'dark' ? 'light' : 'dark' })
  }

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onFocusSearch: () => searchBarRef.current?.focus(),
    onClearSearch: () => {
      searchBarRef.current?.clear()
      clearFilter()
    },
    onNewBookmark: () => setAddBookmarkOpen(true),
    onDelete: handleDelete,
  })

  const showSearchResults = filter.query && searchResults.length >= 0

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Compact single toolbar for side panel mode */}
      <div className="flex items-center gap-1 p-2 border-b bg-muted/50">

        <div className="bg-white p-1 rounded-full border-2">
          <img src="/icons/icon32.png" alt="BookStash" className="w-4 h-4" />
        </div>
        {/* Add buttons */}

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setAddFolderOpen(true)}
          title="New Folder"
        >
          <FolderPlus className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setAddBookmarkOpen(true)}
          title="New Bookmark"
        >
          <BookmarkPlus className="h-4 w-4" />
        </Button>

        {selectedIds.size > 0 && (
          <Button variant="ghost" size="icon" onClick={handleDelete} title="Delete selected">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        )}

        <div className="flex-1" />

        {/* Tools dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" title="Import/Export">
              <Download className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setImportDialogOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Import Bookmarks
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setExportDialogOpen(true)}>
              <Download className="mr-2 h-4 w-4" />
              Export Bookmarks
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setDuplicatesDialogOpen(true)}>
              <Copy className="mr-2 h-4 w-4" />
              Find Duplicates
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* GitHub dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              title="GitHub"
              className={isAuthenticated ? 'text-green-600' : ''}
            >
              <Github className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setGithubConnectOpen(true)}>
              <User className="mr-2 h-4 w-4" />
              {isAuthenticated ? `Connected: ${auth?.username}` : 'Connect GitHub'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Upload className="mr-2 h-4 w-4" />
                Share to GitHub
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => setShareToGistOpen(true)}>
                  <Link className="mr-2 h-4 w-4" />
                  Share as Gist
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShareToRepoOpen(true)}>
                  <FolderGit2 className="mr-2 h-4 w-4" />
                  Save to Repository
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Download className="mr-2 h-4 w-4" />
                Import from GitHub
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => setImportFromGistOpen(true)}>
                  <Link className="mr-2 h-4 w-4" />
                  Import from Gist
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setImportFromRepoOpen(true)}>
                  <FolderGit2 className="mr-2 h-4 w-4" />
                  Import from Repository
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme toggle */}
        <Button variant="ghost" size="icon" onClick={toggleTheme} title="Toggle theme">
          {getEffectiveTheme() === 'dark' ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>

        {/* Settings */}
        <Button variant="ghost" size="icon" onClick={handleOpenOptions} title="Settings">
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      {/* Search */}
      <div className="p-3 border-b">
        <SearchBar />
      </div>

      {/* Selection info */}
      {selectedIds.size > 0 && (
        <div className="px-3 py-1 bg-accent text-accent-foreground text-sm flex items-center justify-between">
          <span>{selectedIds.size} selected</span>
          <Button variant="ghost" size="sm" onClick={deselectAll}>
            Clear
          </Button>
        </div>
      )}

      {/* Content */}
      <main className="flex-1 overflow-hidden">
        {showSearchResults ? <SearchResults /> : <BookmarkTree />}
      </main>

      {/* Footer - minimal in side panel mode */}
      <footer className="px-2 py-1 border-t text-[10px] text-muted-foreground flex justify-between items-center">
        <span className="opacity-60">Right-click for options</span>
        <span className="opacity-60">v{versionInfo.version}</span>
      </footer>

      {/* Dialogs */}
      <AddBookmarkDialog open={addBookmarkOpen} onOpenChange={setAddBookmarkOpen} />
      <AddFolderDialog open={addFolderOpen} onOpenChange={setAddFolderOpen} />
      <ImportExportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        mode="import"
      />
      <ImportExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        mode="export"
      />
      <DuplicatesDialog open={duplicatesDialogOpen} onOpenChange={setDuplicatesDialogOpen} />

      {/* GitHub Dialogs */}
      <GitHubConnectDialog open={githubConnectOpen} onOpenChange={setGithubConnectOpen} />
      <ShareToGistDialog open={shareToGistOpen} onOpenChange={setShareToGistOpen} />
      <ShareToRepoDialog open={shareToRepoOpen} onOpenChange={setShareToRepoOpen} />
      <ImportFromGistDialog open={importFromGistOpen} onOpenChange={setImportFromGistOpen} />
      <ImportFromRepoDialog open={importFromRepoOpen} onOpenChange={setImportFromRepoOpen} />
      <Toaster />
    </div>
  )
}
