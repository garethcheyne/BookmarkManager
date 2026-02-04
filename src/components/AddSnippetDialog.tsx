import { useState } from 'react'
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


interface AddSnippetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddSnippetDialog({ open, onOpenChange }: AddSnippetDialogProps) {
  const { createSnippet, categories } = useSnippetStore()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [code, setCode] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [category, setCategory] = useState<string>('none')
  const [language, setLanguage] = useState<'javascript' | 'typescript'>('javascript')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim() || !code.trim()) {
      return
    }

    setIsSubmitting(true)

    try {
      await createSnippet({
        title: title.trim(),
        description: description.trim() || undefined,
        code: code.trim(),
        tags: tags.length > 0 ? tags : undefined,
        category: category === 'none' ? undefined : category,
        language,
      })

      // Reset form
      setTitle('')
      setDescription('')
      setCode('')
      setTags([])
      setCategory('none')
      setLanguage('javascript')
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to create snippet:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Snippet</DialogTitle>
          <DialogDescription>
            Create a JavaScript snippet to execute on web pages
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="snippet-title">Title *</Label>
            <Input
              id="snippet-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Highlight all links"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="snippet-description">Description</Label>
            <Input
              id="snippet-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of what this snippet does"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="snippet-code">Code *</Label>
            <Textarea
              id="snippet-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="document.querySelectorAll('a').forEach(link => link.style.border = '2px solid red');"
              className="font-mono text-sm min-h-[200px]"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="snippet-language">Language</Label>
              <Select value={language} onValueChange={(value: any) => setLanguage(value)}>
                <SelectTrigger id="snippet-language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="javascript">JavaScript</SelectItem>
                  <SelectItem value="typescript">TypeScript</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="snippet-category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="snippet-category">
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
            <Label htmlFor="snippet-tags">Tags</Label>
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
              {isSubmitting ? 'Creating...' : 'Create Snippet'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
