import { useEffect, useCallback } from 'react'
import { useBookmarkStore } from '@/store'

interface KeyboardShortcutOptions {
  onFocusSearch?: () => void
  onClearSearch?: () => void
  onNewBookmark?: () => void
  onDelete?: () => void
  onEdit?: () => void
  enabled?: boolean
}

export function useKeyboardShortcuts({
  onFocusSearch,
  onClearSearch,
  onNewBookmark,
  onDelete,
  onEdit,
  enabled = true,
}: KeyboardShortcutOptions) {
  const {
    selectedIds,
    selectAll,
    deselectAll,
    flatBookmarks,
  } = useBookmarkStore()

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return

      // Don't handle shortcuts when typing in input fields
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Only handle Escape in input fields to clear/blur
        if (e.key === 'Escape') {
          target.blur()
          onClearSearch?.()
        }
        return
      }

      const isMod = e.ctrlKey || e.metaKey

      // Ctrl/Cmd + F - Focus search
      if (isMod && e.key === 'f') {
        e.preventDefault()
        onFocusSearch?.()
        return
      }

      // Ctrl/Cmd + A - Select all
      if (isMod && e.key === 'a') {
        e.preventDefault()
        selectAll()
        return
      }

      // Escape - Clear selection or search
      if (e.key === 'Escape') {
        e.preventDefault()
        if (selectedIds.size > 0) {
          deselectAll()
        } else {
          onClearSearch?.()
        }
        return
      }

      // Delete - Delete selected bookmarks
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.size > 0) {
          e.preventDefault()
          onDelete?.()
        }
        return
      }

      // Ctrl/Cmd + N - New bookmark
      if (isMod && e.key === 'n') {
        e.preventDefault()
        onNewBookmark?.()
        return
      }

      // Ctrl/Cmd + E or F2 - Edit selected
      if ((isMod && e.key === 'e') || e.key === 'F2') {
        if (selectedIds.size === 1) {
          e.preventDefault()
          onEdit?.()
        }
        return
      }

      // Enter - Open selected bookmarks
      if (e.key === 'Enter' && selectedIds.size > 0) {
        e.preventDefault()
        const selected = flatBookmarks.filter((b) => selectedIds.has(b.id))
        selected.forEach((b) => {
          if (b.url) {
            window.open(b.url, '_blank')
          }
        })
        return
      }
    },
    [
      enabled,
      selectedIds,
      selectAll,
      deselectAll,
      flatBookmarks,
      onFocusSearch,
      onClearSearch,
      onNewBookmark,
      onDelete,
      onEdit,
    ]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}
