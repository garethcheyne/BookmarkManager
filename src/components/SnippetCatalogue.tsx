import { useState, useEffect } from 'react'
import { Plus, Search, Star, Code, Upload, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SnippetItem } from './SnippetItem'
import { AddSnippetDialog } from './AddSnippetDialog'
import { EditSnippetDialog } from './EditSnippetDialog'
import { ShareSnippetsToGistDialog } from './ShareSnippetsToGistDialog'
import { ImportSnippetsFromGistDialog } from './ImportSnippetsFromGistDialog'
import { useSnippetStore } from '@/store'
import type { Snippet } from '@/types'

export function SnippetCatalogue() {
  const {
    filteredSnippets,
    categories,
    selectedIds,
    filter,
    setFilter,
    clearFilter,
    fetchSnippets,
    fetchCategories,
  } = useSnippetStore()

  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingSnippetId, setEditingSnippetId] = useState<string | null>(null)
  const [shareToGistOpen, setShareToGistOpen] = useState(false)
  const [importFromGistOpen, setImportFromGistOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('all')

  useEffect(() => {
    fetchSnippets()
    fetchCategories()
  }, [fetchSnippets, fetchCategories])

  const handleEdit = (snippet: Snippet) => {
    setEditingSnippetId(snippet.id)
    setEditDialogOpen(true)
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setFilter({ query: value })
  }

  const handleCategoryFilter = (categoryId: string) => {
    setFilter({ category: categoryId === 'all' ? undefined : categoryId })
  }

  const handleLanguageFilter = (language: string) => {
    setFilter({ language: language === 'all' ? undefined : (language as any) })
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    if (value === 'favorites') {
      setFilter({ favorite: true })
    } else if (value === 'all') {
      clearFilter()
      setSearchQuery('')
    }
  }

  const favoriteSnippets = filteredSnippets.filter((s) => s.favorite)
  const allTags = Array.from(
    new Set(filteredSnippets.flatMap((s) => s.tags || []))
  ).sort()

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Snippet Catalogue</h2>
          <div className="flex gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  <Upload className="w-4 h-4 mr-2" />
                  Sync
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShareToGistOpen(true)}>
                  <Upload className="w-4 h-4 mr-2" />
                  Share to Gist
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setImportFromGistOpen(true)}>
                  <Download className="w-4 h-4 mr-2" />
                  Import from Gist
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" onClick={() => setAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Snippet
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search snippets..."
            className="pl-9"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <Select
            value={filter.category || 'all'}
            onValueChange={handleCategoryFilter}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filter.language || 'all'}
            onValueChange={handleLanguageFilter}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="javascript">JavaScript</SelectItem>
              <SelectItem value="typescript">TypeScript</SelectItem>
            </SelectContent>
          </Select>

          {(filter.category || filter.language || filter.query) && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                clearFilter()
                setSearchQuery('')
              }}
            >
              Clear
            </Button>
          )}
        </div>

        {/* Tags */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {allTags.slice(0, 10).map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="cursor-pointer hover:bg-accent"
                onClick={() => handleSearchChange(tag)}
              >
                #{tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-3">
          <TabsTrigger value="all">
            All ({filteredSnippets.length})
          </TabsTrigger>
          <TabsTrigger value="favorites">
            <Star className="w-4 h-4 mr-1" />
            Favorites ({favoriteSnippets.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-2">
              {filteredSnippets.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Code className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">
                    {searchQuery || filter.category || filter.language
                      ? 'No snippets found matching your filters'
                      : 'No snippets yet. Click "Add Snippet" to create your first one.'}
                  </p>
                </div>
              ) : (
                filteredSnippets.map((snippet) => (
                  <SnippetItem
                    key={snippet.id}
                    snippet={snippet}
                    onEdit={handleEdit}
                    isSelected={selectedIds.has(snippet.id)}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="favorites" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-2">
              {favoriteSnippets.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Star className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">No favorite snippets yet</p>
                </div>
              ) : (
                favoriteSnippets.map((snippet) => (
                  <SnippetItem
                    key={snippet.id}
                    snippet={snippet}
                    onEdit={handleEdit}
                    isSelected={selectedIds.has(snippet.id)}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <AddSnippetDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
      <EditSnippetDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        snippetId={editingSnippetId}
      />
      <ShareSnippetsToGistDialog open={shareToGistOpen} onOpenChange={setShareToGistOpen} />
      <ImportSnippetsFromGistDialog
        open={importFromGistOpen}
        onOpenChange={setImportFromGistOpen}
      />
    </div>
  )
}
