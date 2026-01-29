import { useState, useCallback, forwardRef, useImperativeHandle, useRef } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { useBookmarkStore } from '@/store'
import { cn } from '@/lib/utils'

interface SearchBarProps {
  className?: string
  placeholder?: string
}

export interface SearchBarHandle {
  focus: () => void
  clear: () => void
}

export const SearchBar = forwardRef<SearchBarHandle, SearchBarProps>(function SearchBar(
  { className, placeholder = 'Search bookmarks...' },
  ref
) {
  const [query, setQuery] = useState('')
  const { search, clearFilter, isSearching } = useBookmarkStore()
  const inputRef = useRef<HTMLInputElement>(null)

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    clear: () => handleClear(),
  }))

  const handleSearch = useCallback(
    (value: string) => {
      setQuery(value)
      if (value.trim()) {
        search(value)
      } else {
        clearFilter()
      }
    },
    [search, clearFilter]
  )

  const handleClear = () => {
    setQuery('')
    clearFilter()
  }

  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-9"
      />
      {query && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
          onClick={handleClear}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
      {isSearching && (
        <div className="absolute right-10 top-1/2 -translate-y-1/2">
          <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  )
})
