/**
 * JavaScript snippet for execution on web pages
 */
export interface Snippet {
  id: string
  title: string
  description?: string
  code: string
  tags?: string[]
  category?: string
  language: 'javascript' | 'typescript'
  dateAdded: number
  dateModified: number
  lastUsed?: number
  usageCount: number
  favorite?: boolean
}

/**
 * Category for organizing snippets
 */
export interface SnippetCategory {
  id: string
  name: string
  description?: string
  color?: string
}

/**
 * Filter criteria for snippets
 */
export interface SnippetFilter {
  query?: string
  tags?: string[]
  category?: string
  favorite?: boolean
  language?: 'javascript' | 'typescript'
}

/**
 * Shared snippet for GitHub sync
 */
export interface SharedSnippet {
  title: string
  description?: string
  code: string
  tags?: string[]
  category?: string
  language: 'javascript' | 'typescript'
  dateAdded?: string
  dateModified?: string
}

/**
 * Collection of snippets for GitHub sync
 */
export interface SharedSnippetCollection {
  version: string
  metadata: {
    name: string
    description: string
    author: string
    created: string
    updated: string
    tags: string[]
    isPublic: boolean
    source: 'gist' | 'repo'
  }
  snippets: SharedSnippet[]
  categories?: SnippetCategory[]
}

/**
 * Execution result for a snippet
 */
export interface SnippetExecutionResult {
  success: boolean
  result?: any
  error?: string
  executionTime: number
}

/**
 * Snippet operation for undo/redo
 */
export interface SnippetOperation {
  type: 'create' | 'update' | 'delete'
  timestamp: number
  snippetId: string
  before?: Snippet
  after?: Snippet
}
