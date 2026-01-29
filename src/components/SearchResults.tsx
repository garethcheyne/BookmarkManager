import { useBookmarkStore } from '@/store'
import { BookmarkItem } from './BookmarkItem'
import { ScrollArea } from './ui/scroll-area'
import { SearchX } from 'lucide-react'

export function SearchResults() {
  const { searchResults, filter } = useBookmarkStore()

  if (!filter.query && searchResults.length === 0) {
    return null
  }

  if (searchResults.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-muted-foreground">
        <SearchX className="h-12 w-12 mb-4" />
        <p className="text-sm">No bookmarks found</p>
        <p className="text-xs mt-1">Try a different search term</p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-2">
        <p className="text-xs text-muted-foreground px-2 mb-2">
          {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
        </p>
        {searchResults.map((bookmark) => (
          <BookmarkItem key={bookmark.id} bookmark={bookmark} showChildren={false} />
        ))}
      </div>
    </ScrollArea>
  )
}
