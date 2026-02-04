import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TagInput } from './TagInput'
import { useSnippetStore } from '@/store'


interface EditSnippetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  snippetId: string | null
}

export function EditSnippetDialog({ open, onOpenChange, snippetId }: EditSnippetDialogProps) {
  const { getSnippetById, updateSnippet, categories } = useSnippetStore()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [code, setCode] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [category, setCategory] = useState<string>('none')
  const [language, setLanguage] = useState<'javascript' | 'typescript'>('javascript')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (snippetId && open) {
      const snippet = getSnippetById(snippetId)
      if (snippet) {
        setTitle(snippet.title)
        setDescription(snippet.description || '')
        setCode(snippet.code)
        setTags(snippet.tags || [])
        setCategory(snippet.category || 'none')
        setLanguage(snippet.language)
      }
    }
  }, [snippetId, open, getSnippetById])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!snippetId || !title.trim() || !code.trim()) {
      return
    }

    setIsSubmitting(true)

    try {
      await updateSnippet(snippetId, {
        title: title.trim(),
        description: description.trim() || undefined,
        code: code.trim(),
        tags: tags.length > 0 ? tags : undefined,
        category: category === 'none' ? undefined : category,
        language,
      })

      onOpenChange(false)
    } catch (error) {
      console.error('Failed to update snippet:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Snippet</DialogTitle>
          <DialogDescription>
            Update your JavaScript snippet
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-snippet-title">Title *</Label>
            <Input
              id="edit-snippet-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-snippet-description">Description</Label>
            <Input
              id="edit-snippet-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of what this snippet does"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-snippet-code">Code *</Label>
            <Textarea
              id="edit-snippet-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="font-mono text-sm min-h-[200px]"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-snippet-language">Language</Label>
              <Select value={language} onValueChange={(value: any) => setLanguage(value)}>
                <SelectTrigger id="edit-snippet-language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="javascript">JavaScript</SelectItem>
                  <SelectItem value="typescript">TypeScript</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-snippet-category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="edit-snippet-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-snippet-tags">Tags</Label>
            <TagInput
              tags={tags}
              onTagsChange={setTags}
              placeholder="Add tags..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !title.trim() || !code.trim()}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
