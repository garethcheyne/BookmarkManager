import { useState, useCallback, useRef } from 'react'
import { Bookmark as BookmarkIcon, Folder, ChevronRight, ChevronDown, ExternalLink, Github, Loader2 } from 'lucide-react'
import { exportToJson, importFromJson } from '@/lib/import-export'
import { cn } from '@/lib/utils'
import type { Bookmark } from '@/types'
import { useBookmarkStore, useGitHubStore } from '@/store'
import { REPO_COLORS } from '@/store/githubStore'
import { BookmarkContextMenu } from './BookmarkContextMenu'
import { EditBookmarkDialog } from './EditBookmarkDialog'
import { ShareToGistDialog } from './ShareToGistDialog'
import { ShareToRepoDialog } from './ShareToRepoDialog'
import { Badge } from './ui/badge'
import { toast } from './ui/use-toast'
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
    lastSelectedId,
    expandedFolderIds,
    metadata,
    toggleSelection,
    selectRange,
    toggleFolder,
    trackAccess,
    getChildrenOf,
    deleteBookmark,
    getBookmarkById,
    moveBookmarks,
    fetchBookmarks,
  } = useBookmarkStore()

  const { isAuthenticated, getFolderShare, unlinkFolder, updateFolderSyncTime, saveToRepo, updateGist, getRepoColor, pullFromRepo } = useGitHubStore()

  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [shareToGistOpen, setShareToGistOpen] = useState(false)
  const [shareToRepoOpen, setShareToRepoOpen] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isPulling, setIsPulling] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOver, setDragOver] = useState<'above' | 'below' | 'inside' | null>(null)
  const itemRef = useRef<HTMLDivElement>(null)

  const isFolder = !bookmark.url
  const isSelected = selectedIds.has(bookmark.id)
  const isExpanded = expandedFolderIds.has(bookmark.id)
  const children = isFolder ? getChildrenOf(bookmark.id) : []
  const bookmarkMeta = metadata[bookmark.id]
  const tags = bookmarkMeta?.customTags || []
  const folderShare = isFolder ? getFolderShare(bookmark.id) : undefined
  const isRootFolder = ['0', '1', '2', '3'].includes(bookmark.id)

  const handleClick = (e: React.MouseEvent) => {
    // Handle selection for both folders and bookmarks
    if (e.shiftKey) {
      // Always prevent default when Shift is held
      e.preventDefault()
      if (lastSelectedId) {
        // Range selection with Shift
        selectRange(lastSelectedId, bookmark.id)
      } else {
        // First selection with Shift - just select this item
        toggleSelection(bookmark.id)
      }
    } else if (e.ctrlKey || e.metaKey) {
      // Multi-select with Ctrl/Cmd
      e.preventDefault()
      toggleSelection(bookmark.id)
    } else if (isFolder) {
      // Folders toggle expand/collapse on regular click
      toggleFolder(bookmark.id)
    } else {
      // Bookmarks open on regular click
      trackAccess(bookmark.id)
      window.open(bookmark.url, '_blank')
    }
  }

  const handleDelete = async () => {
    await deleteBookmark(bookmark.id)
    setDeleteDialogOpen(false)
  }

  const handleSyncToGitHub = useCallback(async () => {
    if (!folderShare || !isFolder) return

    setIsSyncing(true)
    try {
      // Get folder contents
      const folder = getBookmarkById(bookmark.id)
      if (!folder?.children) {
        toast.warning('Empty folder', 'No bookmarks to sync')
        return
      }

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
        await saveToRepo(owner, repo, content, `Sync ${bookmark.title}`, folderShare.filePath, bookmark.title)
      } else if (folderShare.type === 'gist') {
        // Gist sync support
        await updateGist(folderShare.resourceId, content)
      }

      await updateFolderSyncTime(bookmark.id)
      toast.success('Synced successfully!', `${bookmark.title} synced to GitHub`)
    } catch (error) {
      console.error('Sync failed:', error)
      toast.error('Sync failed', (error as Error).message)
    } finally {
      setIsSyncing(false)
    }
  }, [folderShare, isFolder, bookmark.id, bookmark.title, getBookmarkById, saveToRepo, updateGist, updateFolderSyncTime])

  const handleUnlinkFromGitHub = useCallback(async () => {
    if (!folderShare) return
    if (confirm(`Unlink "${bookmark.title}" from GitHub? This won't delete the file on GitHub.`)) {
      await unlinkFolder(bookmark.id)
      toast.success('Unlinked', `${bookmark.title} unlinked from GitHub`)
    }
  }, [folderShare, bookmark.id, bookmark.title, unlinkFolder])

  const handlePullFromGitHub = useCallback(async () => {
    if (!folderShare || !isFolder) return

    if (!confirm(`Pull from GitHub? This will replace all bookmarks in "${bookmark.title}" with the content from GitHub.`)) {
      return
    }

    setIsPulling(true)
    try {
      const content = await pullFromRepo(bookmark.id)
      if (!content) {
        toast.error('Pull failed', 'Could not fetch content from GitHub')
        return
      }

      // Import the content into this folder with replace strategy
      const result = await importFromJson(content, {
        targetFolderId: bookmark.id,
        strategy: 'replace',
        skipDuplicates: false,
        preserveTags: true,
      })

      if (result.errors.length > 0) {
        console.warn('Import errors:', result.errors)
        toast.warning('Partial import', `Imported ${result.imported} bookmarks with ${result.errors.length} errors`)
      } else {
        toast.success('Pulled successfully!', `Imported ${result.imported} bookmarks from GitHub`)
      }

      await updateFolderSyncTime(bookmark.id)
      await fetchBookmarks() // Refresh the UI
    } catch (error) {
      console.error('Pull failed:', error)
      toast.error('Pull failed', (error as Error).message)
    } finally {
      setIsPulling(false)
    }
  }, [folderShare, isFolder, bookmark.id, bookmark.title, pullFromRepo, updateFolderSyncTime, fetchBookmarks])

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent) => {
    // If dragging a selected item, drag all selected items
    const itemsToDrag = isSelected ? Array.from(selectedIds) : [bookmark.id]
    
    e.dataTransfer.setData('bookmark/ids', JSON.stringify(itemsToDrag))
    e.dataTransfer.setData('bookmark/parentId', bookmark.parentId || '')
    e.dataTransfer.effectAllowed = 'move'
    setIsDragging(true)
    
    // Visual feedback for multiple items
    if (itemsToDrag.length > 1) {
      const dragImage = document.createElement('div')
      dragImage.textContent = `${itemsToDrag.length} items`
      dragImage.style.position = 'absolute'
      dragImage.style.top = '-1000px'
      dragImage.style.padding = '4px 8px'
      dragImage.style.background = 'rgba(0, 0, 0, 0.8)'
      dragImage.style.color = 'white'
      dragImage.style.borderRadius = '4px'
      dragImage.style.fontSize = '12px'
      document.body.appendChild(dragImage)
      e.dataTransfer.setDragImage(dragImage, 0, 0)
      setTimeout(() => document.body.removeChild(dragImage), 0)
    }
  }

  const handleDragEnd = () => {
    setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const draggedIds = e.dataTransfer.types.includes('bookmark/ids')
    if (!draggedIds) return

    const rect = itemRef.current?.getBoundingClientRect()
    if (!rect) return

    const y = e.clientY - rect.top
    const height = rect.height

    if (isFolder && y > height * 0.25 && y < height * 0.75) {
      setDragOver('inside')
    } else if (y < height * 0.5) {
      setDragOver('above')
    } else {
      setDragOver('below')
    }
  }

  const handleDragLeave = () => {
    setDragOver(null)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const idsData = e.dataTransfer.getData('bookmark/ids')
    if (!idsData) {
      setDragOver(null)
      return
    }

    const draggedIds: string[] = JSON.parse(idsData)
    
    // Don't drop onto self or if any dragged item is the target
    if (draggedIds.includes(bookmark.id)) {
      setDragOver(null)
      return
    }

    try {
      if (dragOver === 'inside' && isFolder) {
        // Move all items into this folder
        await moveBookmarks(draggedIds, bookmark.id)
        const count = draggedIds.length
        toast.success('Moved', `${count} bookmark${count > 1 ? 's' : ''} moved successfully`)
      } else {
        // Move to same parent, reorder
        // For now, just move to the target parent without precise reordering
        const targetParentId = bookmark.parentId || '1'
        await moveBookmarks(draggedIds, targetParentId)
        const count = draggedIds.length
        toast.success('Moved', `${count} bookmark${count > 1 ? 's' : ''} moved successfully`)
      }
    } catch (error) {
      toast.error('Move failed', (error as Error).message)
    }

    setDragOver(null)
  }

  const itemContent = (
    <div
      ref={itemRef}
      className={cn(
        'flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors group relative',
        'hover:bg-accent',
        isSelected && 'bg-accent',
        isDragging && 'opacity-50',
        dragOver === 'inside' && 'bg-accent ring-2 ring-primary',
        dragOver === 'above' && 'drop-target-above',
        dragOver === 'below' && 'drop-target-below'
      )}
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
      onClick={handleClick}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
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
      {isFolder && folderShare && (() => {
        const colorValue = getRepoColor(folderShare.resourceId) || REPO_COLORS[0].value
        const isWorking = isSyncing || isPulling
        return (
          <span
            className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] flex-shrink-0"
            style={{
              backgroundColor: colorValue + '20',
              color: colorValue
            }}
            title={`Synced to ${folderShare.type === 'gist' ? 'Gist' : 'Repo'}: ${folderShare.name}`}
          >
            {isWorking ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Github className="h-3 w-3" />
            )}
            <span className="hidden sm:inline">{folderShare.type === 'gist' ? 'Gist' : 'Repo'}</span>
          </span>
        )
      })()}

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
      {isRootFolder ? (
        // Don't show context menu for root folders
        itemContent
      ) : (
        <BookmarkContextMenu
          bookmark={bookmark}
          onEdit={() => setEditDialogOpen(true)}
          onDelete={() => setDeleteDialogOpen(true)}
          onAddTags={() => setEditDialogOpen(true)}
          onShareToGist={isAuthenticated && isFolder ? () => setShareToGistOpen(true) : undefined}
          onShareToRepo={isAuthenticated && isFolder ? () => setShareToRepoOpen(true) : undefined}
          onSyncToGitHub={isAuthenticated && folderShare ? handleSyncToGitHub : undefined}
          onPullFromGitHub={isAuthenticated && folderShare ? handlePullFromGitHub : undefined}
          onUnlinkFromGitHub={isAuthenticated && folderShare ? handleUnlinkFromGitHub : undefined}
          folderShare={folderShare}
        >
          {itemContent}
        </BookmarkContextMenu>
      )}

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
