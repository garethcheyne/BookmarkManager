import { useState, useCallback } from 'react'
import { Bookmark as BookmarkIcon, Folder, ChevronRight, ChevronDown, ExternalLink, Github } from 'lucide-react'
import { exportToJson } from '@/lib/import-export'
import { cn } from '@/lib/utils'
import type { Bookmark } from '@/types'
import { useBookmarkStore, useGitHubStore } from '@/store'
import { BookmarkContextMenu } from './BookmarkContextMenu'
import { EditBookmarkDialog } from './EditBookmarkDialog'
import { ShareToGistDialog } from './ShareToGistDialog'
import { ShareToRepoDialog } from './ShareToRepoDialog'
import { Badge } from './ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog'

interface BookmarkItemProps {
  bookmark: Bookmark
  depth?: number
  showChildren?: boolean
  showTags?: boolean
}

export function BookmarkItem({
  bookmark,
  depth = 0,
  showChildren = true,
  showTags = true,
}: BookmarkItemProps) {
  const {
    selectedIds,
    expandedFolderIds,
    metadata,
    toggleSelection,
    toggleFolder,
    trackAccess,
    getChildrenOf,
    deleteBookmark,
    getBookmarkById,
  } = useBookmarkStore()

  const { isAuthenticated, getFolderShare, unlinkFolder, updateFolderSyncTime, saveToRepo } = useGitHubStore()

  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [shareToGistOpen, setShareToGistOpen] = useState(false)
  const [shareToRepoOpen, setShareToRepoOpen] = useState(false)

  const isFolder = !bookmark.url
  const isSelected = selectedIds.has(bookmark.id)
  const isExpanded = expandedFolderIds.has(bookmark.id)
  const children = isFolder ? getChildrenOf(bookmark.id) : []
  const bookmarkMeta = metadata[bookmark.id]
  const tags = bookmarkMeta?.customTags || []
  const folderShare = isFolder ? getFolderShare(bookmark.id) : undefined

  const handleClick = (e: React.MouseEvent) => {
    if (isFolder) {
      toggleFolder(bookmark.id)
    } else {
      if (e.ctrlKey || e.metaKey) {
        toggleSelection(bookmark.id)
      } else {
        // Open bookmark
        trackAccess(bookmark.id)
        window.open(bookmark.url, '_blank')
      }
    }
  }

  const handleDelete = async () => {
    await deleteBookmark(bookmark.id)
    setDeleteDialogOpen(false)
  }

  const handleSyncToGitHub = useCallback(async () => {
    if (!folderShare || !isFolder) return

    try {
      // Get folder contents
      const folder = getBookmarkById(bookmark.id)
      if (!folder?.children) return

      // Export to JSON
      const content = await exportToJson(folder.children, {
        format: 'json',
        includeMetadata: true,
        includeTags: true,
        includeNotes: true,
      })

      if (folderShare.type === 'repo') {
        // Parse owner/repo from resourceId
        const [owner, repo] = folderShare.resourceId.split('/')
        await saveToRepo(owner, repo, content, `Sync ${bookmark.title}`, folderShare.filePath)
      }
      // TODO: Add gist sync support

      await updateFolderSyncTime(bookmark.id)
      alert('Synced successfully!')
    } catch (error) {
      console.error('Sync failed:', error)
      alert('Sync failed: ' + (error as Error).message)
    }
  }, [folderShare, isFolder, bookmark.id, bookmark.title, getBookmarkById, saveToRepo, updateFolderSyncTime])

  const handleUnlinkFromGitHub = useCallback(async () => {
    if (!folderShare) return
    if (confirm(`Unlink "${bookmark.title}" from GitHub? This won't delete the file on GitHub.`)) {
      await unlinkFolder(bookmark.id)
    }
  }, [folderShare, bookmark.id, bookmark.title, unlinkFolder])

  const itemContent = (
    <div
      className={cn(
        'flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors group',
        'hover:bg-accent',
        isSelected && 'bg-accent'
      )}
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
      onClick={handleClick}
    >
      {/* Expand/collapse indicator for folders */}
      {isFolder ? (
        <span className="w-4 h-4 flex items-center justify-center text-muted-foreground">
          {children.length > 0 &&
            (isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            ))}
        </span>
      ) : (
        <span className="w-4" />
      )}

      {/* Icon */}
      {isFolder ? (
        <Folder className="h-4 w-4 text-yellow-500 flex-shrink-0" />
      ) : (
        <BookmarkIcon className="h-4 w-4 text-blue-500 flex-shrink-0" />
      )}

      {/* GitHub shared indicator badge */}
      {isFolder && folderShare && (
        <span
          className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 text-[10px] flex-shrink-0"
          title={`Synced to ${folderShare.type === 'gist' ? 'Gist' : 'Repo'}: ${folderShare.name}`}
        >
          <Github className="h-3 w-3" />
          <span className="hidden sm:inline">{folderShare.type === 'gist' ? 'Gist' : 'Repo'}</span>
        </span>
      )}

      {/* Title and tags */}
      <div className="flex-1 min-w-0">
        <span className="truncate text-sm block">{bookmark.title || 'Untitled'}</span>
        {showTags && tags.length > 0 && (
          <div className="flex gap-1 mt-0.5 flex-wrap">
            {tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px] px-1 py-0">
                {tag}
              </Badge>
            ))}
            {tags.length > 3 && (
              <Badge variant="secondary" className="text-[10px] px-1 py-0">
                +{tags.length - 3}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* External link indicator for bookmarks */}
      {!isFolder && (
        <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 flex-shrink-0" />
      )}
    </div>
  )

  return (
    <div className="select-none">
      <BookmarkContextMenu
        bookmark={bookmark}
        onEdit={() => setEditDialogOpen(true)}
        onDelete={() => setDeleteDialogOpen(true)}
        onAddTags={() => setEditDialogOpen(true)}
        onShareToGist={isAuthenticated && isFolder ? () => setShareToGistOpen(true) : undefined}
        onShareToRepo={isAuthenticated && isFolder ? () => setShareToRepoOpen(true) : undefined}
        onSyncToGitHub={isAuthenticated && folderShare ? handleSyncToGitHub : undefined}
        onUnlinkFromGitHub={isAuthenticated && folderShare ? handleUnlinkFromGitHub : undefined}
        folderShare={folderShare}
      >
        {itemContent}
      </BookmarkContextMenu>

      {/* Children */}
      {isFolder && isExpanded && showChildren && (
        <div>
          {children.map((child) => (
            <BookmarkItem
              key={child.id}
              bookmark={child}
              depth={depth + 1}
              showTags={showTags}
            />
          ))}
        </div>
      )}

      {/* Edit dialog */}
      <EditBookmarkDialog
        bookmark={bookmark}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {isFolder ? 'Folder' : 'Bookmark'}?</AlertDialogTitle>
            <AlertDialogDescription>
              {isFolder
                ? `This will delete the folder "${bookmark.title}" and all its contents. This action cannot be undone.`
                : `This will delete the bookmark "${bookmark.title}". This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* GitHub share dialogs */}
      {isFolder && (
        <>
          <ShareToGistDialog
            open={shareToGistOpen}
            onOpenChange={setShareToGistOpen}
            folderId={bookmark.id}
            folderName={bookmark.title}
          />
          <ShareToRepoDialog
            open={shareToRepoOpen}
            onOpenChange={setShareToRepoOpen}
            folderId={bookmark.id}
            folderName={bookmark.title}
          />
        </>
      )}
    </div>
  )
}
