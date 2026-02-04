import { useState } from 'react'
import { Play, Edit, Copy, Trash2, Star, MoreVertical, Code } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useSnippetStore } from '@/store'
import { toast } from '@/components/ui/use-toast'
import type { Snippet } from '@/types'

interface SnippetItemProps {
  snippet: Snippet
  onEdit: (snippet: Snippet) => void
  isSelected: boolean
}

export function SnippetItem({ snippet, onEdit, isSelected }: SnippetItemProps) {
  const {
    executeSnippet,
    deleteSnippet,
    duplicateSnippet,
    toggleFavorite,
    toggleSelection,
    categories,
  } = useSnippetStore()
  const [isExecuting, setIsExecuting] = useState(false)

  const category = categories.find((c) => c.id === snippet.category)

  const handleExecute = async () => {
    setIsExecuting(true)
    try {
      await executeSnippet(snippet.id)
    } finally {
      setIsExecuting(false)
    }
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(snippet.code)
    toast({
      title: 'Code copied',
      description: 'Snippet code copied to clipboard',
    })
  }

  const handleDuplicate = async () => {
    try {
      await duplicateSnippet(snippet.id)
    } catch (error) {
      console.error('Failed to duplicate snippet:', error)
    }
  }

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete "${snippet.title}"?`)) {
      try {
        await deleteSnippet(snippet.id)
      } catch (error) {
        console.error('Failed to delete snippet:', error)
      }
    }
  }

  const handleToggleFavorite = async () => {
    try {
      await toggleFavorite(snippet.id)
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
    }
  }

  return (
    <div
      className={`group p-3 rounded-lg border transition-colors hover:bg-accent/50 ${
        isSelected ? 'bg-accent border-primary' : 'bg-card'
      }`}
      onClick={(e) => {
        if (e.ctrlKey || e.metaKey) {
          toggleSelection(snippet.id)
        }
      }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0 space-y-2">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium truncate">{snippet.title}</h3>
                {snippet.favorite && (
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                )}
              </div>
              {snippet.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {snippet.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={(e) => {
                  e.stopPropagation()
                  handleExecute()
                }}
                disabled={isExecuting}
              >
                <Play className="w-4 h-4" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(snippet)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCopyCode}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Code
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDuplicate}>
                    <Code className="w-4 h-4 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleToggleFavorite}>
                    <Star
                      className={`w-4 h-4 mr-2 ${
                        snippet.favorite ? 'fill-yellow-400 text-yellow-400' : ''
                      }`}
                    />
                    {snippet.favorite ? 'Remove from Favorites' : 'Add to Favorites'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Code preview */}
          <div className="bg-muted/50 rounded p-2 overflow-hidden">
            <code className="text-xs font-mono text-muted-foreground line-clamp-2">
              {snippet.code}
            </code>
          </div>

          {/* Tags and metadata */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs">
              {snippet.language}
            </Badge>
            {category && (
              <Badge variant="secondary" className="text-xs">
                {category.name}
              </Badge>
            )}
            {snippet.tags?.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                #{tag}
              </Badge>
            ))}
          </div>

          {/* Usage stats */}
          {snippet.usageCount > 0 && (
            <div className="text-xs text-muted-foreground">
              Used {snippet.usageCount} time{snippet.usageCount !== 1 ? 's' : ''}
              {snippet.lastUsed && (
                <> · Last used {new Date(snippet.lastUsed).toLocaleDateString()}</>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
