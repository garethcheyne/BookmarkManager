import { useState, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from './ui/dialog'
import { Button } from './ui/button'
import { Label } from './ui/label'
import { Input } from './ui/input'
import { useBookmarkStore } from '@/store'
import {
  exportToJson,
  exportToHtml,
  importFromJson,
  importFromHtml,
  downloadFile,
} from '@/lib/import-export'
import { Download, Upload, FileJson, FileText, Check, AlertCircle } from 'lucide-react'

interface ImportExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'import' | 'export'
}

export function ImportExportDialog({ open, onOpenChange, mode }: ImportExportDialogProps) {
  const { bookmarkTree, refreshBookmarks } = useBookmarkStore()
  const [format, setFormat] = useState<'json' | 'html'>('json')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Export options
  const [includeTags, setIncludeTags] = useState(true)
  const [includeNotes, setIncludeNotes] = useState(true)

  // Import options
  const [skipDuplicates, setSkipDuplicates] = useState(true)
  const [preserveTags, setPreserveTags] = useState(true)

  const handleExport = async () => {
    setIsLoading(true)
    setResult(null)

    try {
      const rootChildren = bookmarkTree[0]?.children || []

      let content: string
      let filename: string
      let mimeType: string

      if (format === 'json') {
        content = await exportToJson(rootChildren, {
          format: 'json',
          includeMetadata: true,
          includeTags,
          includeNotes,
        })
        filename = `bookmarks-${new Date().toISOString().split('T')[0]}.json`
        mimeType = 'application/json'
      } else {
        content = await exportToHtml(rootChildren)
        filename = `bookmarks-${new Date().toISOString().split('T')[0]}.html`
        mimeType = 'text/html'
      }

      downloadFile(content, filename, mimeType)
      setResult({ success: true, message: 'Bookmarks exported successfully!' })
    } catch (error) {
      setResult({ success: false, message: `Export failed: ${(error as Error).message}` })
    } finally {
      setIsLoading(false)
    }
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    setResult(null)

    try {
      const content = await file.text()

      let importResult: { imported: number; errors: string[] }

      if (file.name.endsWith('.json')) {
        importResult = await importFromJson(content, {
          strategy: 'append',
          skipDuplicates,
          preserveTags,
        })
      } else if (file.name.endsWith('.html') || file.name.endsWith('.htm')) {
        importResult = await importFromHtml(content, {
          strategy: 'append',
          skipDuplicates,
          preserveTags,
        })
      } else {
        throw new Error('Unsupported file format. Please use .json or .html files.')
      }

      await refreshBookmarks()

      if (importResult.errors.length > 0) {
        setResult({
          success: true,
          message: `Imported ${importResult.imported} bookmarks with ${importResult.errors.length} errors.`,
        })
      } else {
        setResult({
          success: true,
          message: `Successfully imported ${importResult.imported} bookmarks!`,
        })
      }
    } catch (error) {
      setResult({ success: false, message: `Import failed: ${(error as Error).message}` })
    } finally {
      setIsLoading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleClose = () => {
    setResult(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'export' ? (
              <>
                <Download className="h-5 w-5" />
                Export Bookmarks
              </>
            ) : (
              <>
                <Upload className="h-5 w-5" />
                Import Bookmarks
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {mode === 'export'
              ? 'Export your bookmarks to a file'
              : 'Import bookmarks from a file'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {mode === 'export' && (
            <>
              <div className="grid gap-2">
                <Label>Format</Label>
                <div className="flex gap-2">
                  <Button
                    variant={format === 'json' ? 'default' : 'outline'}
                    onClick={() => setFormat('json')}
                    className="flex-1"
                  >
                    <FileJson className="mr-2 h-4 w-4" />
                    JSON
                  </Button>
                  <Button
                    variant={format === 'html' ? 'default' : 'outline'}
                    onClick={() => setFormat('html')}
                    className="flex-1"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    HTML
                  </Button>
                </div>
              </div>

              {format === 'json' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="includeTags"
                      checked={includeTags}
                      onChange={(e) => setIncludeTags(e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="includeTags">Include tags</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="includeNotes"
                      checked={includeNotes}
                      onChange={(e) => setIncludeNotes(e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="includeNotes">Include notes</Label>
                  </div>
                </div>
              )}
            </>
          )}

          {mode === 'import' && (
            <>
              <div className="grid gap-2">
                <Label>Select File</Label>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.html,.htm"
                  onChange={handleImport}
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Supported formats: JSON, HTML (Netscape Bookmark format)
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="skipDuplicates"
                    checked={skipDuplicates}
                    onChange={(e) => setSkipDuplicates(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="skipDuplicates">Skip duplicate URLs</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="preserveTags"
                    checked={preserveTags}
                    onChange={(e) => setPreserveTags(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="preserveTags">Preserve tags (JSON only)</Label>
                </div>
              </div>
            </>
          )}

          {result && (
            <div
              className={`flex items-center gap-2 p-3 rounded-md ${
                result.success ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              }`}
            >
              {result.success ? (
                <Check className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <span className="text-sm">{result.message}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {result ? 'Close' : 'Cancel'}
          </Button>
          {mode === 'export' && (
            <Button onClick={handleExport} disabled={isLoading}>
              {isLoading ? 'Exporting...' : 'Export'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
