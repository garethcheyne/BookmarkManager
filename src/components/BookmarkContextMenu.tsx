import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from './ui/context-menu'
import {
  ExternalLink,
  Edit,
  Trash2,
  Copy,
  FolderInput,
  Tag,
  Github,
  Link,
  FolderGit2,
  RefreshCw,
  Unlink,
} from 'lucide-react'
import type { Bookmark } from '@/types'
import { useBookmarkStore } from '@/store'
import type { FolderShare } from '@/store/githubStore'

interface BookmarkContextMenuProps {
  bookmark: Bookmark
  children: React.ReactNode
  onEdit: () => void
  onDelete: () => void
  onAddTags: () => void
  onShareToGist?: () => void
  onShareToRepo?: () => void
  onSyncToGitHub?: () => void
  onUnlinkFromGitHub?: () => void
  folderShare?: FolderShare
}

export function BookmarkContextMenu({
  bookmark,
  children,
  onEdit,
  onDelete,
  onAddTags,
  onShareToGist,
  onShareToRepo,
  onSyncToGitHub,
  onUnlinkFromGitHub,
  folderShare,
}: BookmarkContextMenuProps) {
  const { flatBookmarks, moveBookmark, trackAccess } = useBookmarkStore()

  const isFolder = !bookmark.url
  const folders = flatBookmarks.filter((b) => !b.url && b.id !== bookmark.id && b.id !== '0')

  const handleOpen = () => {
    if (bookmark.url) {
      trackAccess(bookmark.id)
      window.open(bookmark.url, '_blank')
    }
  }

  const handleCopyUrl = () => {
    if (bookmark.url) {
      navigator.clipboard.writeText(bookmark.url)
    }
  }

  const handleCopyTitle = () => {
    navigator.clipboard.writeText(bookmark.title)
  }

  const handleMoveTo = async (folderId: string) => {
    await moveBookmark(bookmark.id, folderId)
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        {!isFolder && (
          <>
            <ContextMenuItem onClick={handleOpen}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Open in New Tab
            </ContextMenuItem>
            <ContextMenuItem onClick={handleCopyUrl}>
              <Copy className="mr-2 h-4 w-4" />
              Copy URL
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        )}

        <ContextMenuItem onClick={onEdit}>
          <Edit className="mr-2 h-4 w-4" />
          Edit
        </ContextMenuItem>

        <ContextMenuItem onClick={handleCopyTitle}>
          <Copy className="mr-2 h-4 w-4" />
          Copy Title
        </ContextMenuItem>

        {!isFolder && (
          <ContextMenuItem onClick={onAddTags}>
            <Tag className="mr-2 h-4 w-4" />
            Add Tags
          </ContextMenuItem>
        )}

        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <FolderInput className="mr-2 h-4 w-4" />
            Move to...
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48 max-h-[250px] overflow-auto" sideOffset={2} alignOffset={-5}>
            {folders.map((folder) => (
              <ContextMenuItem
                key={folder.id}
                onClick={() => handleMoveTo(folder.id)}
                disabled={folder.id === bookmark.parentId}
              >
                {folder.title || 'Untitled'}
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>

        {isFolder && folderShare && (
          <>
            <ContextMenuItem onClick={onSyncToGitHub}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync to {folderShare.type === 'gist' ? 'Gist' : 'Repo'}
            </ContextMenuItem>
            <ContextMenuItem onClick={onUnlinkFromGitHub} className="text-orange-600">
              <Unlink className="mr-2 h-4 w-4" />
              Unlink from GitHub
            </ContextMenuItem>
          </>
        )}

        {isFolder && !folderShare && (onShareToGist || onShareToRepo) && (
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <Github className="mr-2 h-4 w-4" />
              Share to GitHub
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-48">
              {onShareToGist && (
                <ContextMenuItem onClick={onShareToGist}>
                  <Link className="mr-2 h-4 w-4" />
                  Share as Gist
                </ContextMenuItem>
              )}
              {onShareToRepo && (
                <ContextMenuItem onClick={onShareToRepo}>
                  <FolderGit2 className="mr-2 h-4 w-4" />
                  Save to Repository
                </ContextMenuItem>
              )}
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}

        <ContextMenuSeparator />

        <ContextMenuItem onClick={onDelete} className="text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
