import { useEffect, useState, useRef } from 'react'
import {
  PanelRightOpen,
  Settings,
  Moon,
  Sun,
  Github,
  Download,
  Upload,
  Copy,
  User,
  Link,
  FolderGit2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/toaster'
import { SearchBar, BookmarkTree, SearchResults, type SearchBarHandle } from '@/components'
import { useKeyboardShortcuts } from '@/hooks'
import { useBookmarkStore, useSettingsStore, useGitHubStore } from '@/store'
import { GitHubConnectDialog } from '@/components/GitHubConnectDialog'
import { ShareToGistDialog } from '@/components/ShareToGistDialog'
import { ShareToRepoDialog } from '@/components/ShareToRepoDialog'
import { ImportFromGistDialog } from '@/components/ImportFromGistDialog'
import { ImportFromRepoDialog } from '@/components/ImportFromRepoDialog'
import { ImportExportDialog } from '@/components/ImportExportDialog'
import { DuplicatesDialog } from '@/components/DuplicatesDialog'
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

export function Popup() {
  const { searchResults, filter, clearFilter } = useBookmarkStore()
  const { fetchSettings, updateSettings, getEffectiveTheme } = useSettingsStore()
  const { isAuthenticated, auth, initialize: initializeGitHub } = useGitHubStore()

  // Refs
  const searchBarRef = useRef<SearchBarHandle>(null)

  // Dialog states
  const [githubConnectOpen, setGithubConnectOpen] = useState(false)
  const [shareToGistOpen, setShareToGistOpen] = useState(false)
  const [shareToRepoOpen, setShareToRepoOpen] = useState(false)
  const [importFromGistOpen, setImportFromGistOpen] = useState(false)
  const [importFromRepoOpen, setImportFromRepoOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [duplicatesDialogOpen, setDuplicatesDialogOpen] = useState(false)

  useEffect(() => {
    fetchSettings()
    initializeGitHub()
  }, [fetchSettings, initializeGitHub])

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onFocusSearch: () => searchBarRef.current?.focus(),
    onClearSearch: () => {
      searchBarRef.current?.clear()
      clearFilter()
    },
  })

  const handleOpenSidePanel = async () => {
    // Call sidePanel.open() directly from popup - this IS a user gesture context
    const window = await chrome.windows.getCurrent()
    if (window.id) {
      await chrome.sidePanel.open({ windowId: window.id })
      // Close the popup after opening side panel
      globalThis.close()
    }
  }

  const handleOpenOptions = () => {
    chrome.runtime.openOptionsPage()
  }

  const toggleTheme = () => {
    const currentTheme = getEffectiveTheme()
    updateSettings({ theme: currentTheme === 'dark' ? 'light' : 'dark' })
  }

  const showSearchResults = filter.query && searchResults.length >= 0

  return (
    <div className="w-[480px] h-[580px] flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between pr-2 py-1.5 pl-4 border-b">
        <div className="flex items-center gap-2">
          <div className="bg-white p-1 rounded-full border-2">
            <img src="/icons/icon32.png" alt="BookStash" className="w-4 h-4" />
          </div>
          <h1 className="text-base font-semibold">BookStash</h1>
        </div>

        <div className="flex items-center gap-1">
          {/* Tools Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" title="Tools">
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

          {/* GitHub Dropdown */}
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

          <Button variant="ghost" size="icon" onClick={toggleTheme} title="Toggle theme">
            {getEffectiveTheme() === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
          <Button variant="ghost" size="icon" onClick={handleOpenOptions} title="Settings">
            <Settings className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleOpenSidePanel} title="Open Side Panel">
            <PanelRightOpen className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Search */}
      <div className="p-3 border-b">
        <SearchBar ref={searchBarRef} />
      </div>

      {/* Content */}
      <main className="flex-1 min-h-0 overflow-hidden">
        {showSearchResults ? <SearchResults /> : <BookmarkTree />}
      </main>

      {/* Footer */}
      <footer className="p-2 border-t text-xs text-muted-foreground text-center">
        BookStash v{versionInfo.version}
      </footer>

      {/* Dialogs */}
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
