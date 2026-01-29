import type { Bookmark, SharedCollection, SharedBookmark, ExportOptions, ImportOptions } from '@/types'
import { bookmarksApi, metadataStorage } from './chrome-api'

/**
 * Export bookmarks to JSON format
 */
export async function exportToJson(
  bookmarks: Bookmark[],
  options: ExportOptions
): Promise<string> {
  const metadata = await metadataStorage.getAll()

  const collection: SharedCollection = {
    version: '1.0',
    metadata: {
      name: 'Exported Bookmarks',
      description: 'Bookmarks exported from BookStash',
      author: '',
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      tags: [],
      isPublic: false,
      source: 'gist',
    },
    bookmarks: [],
    folders: [],
  }

  // Build folder structure and collect bookmarks
  const processBookmark = (bookmark: Bookmark, path: string = ''): void => {
    const isFolder = !bookmark.url

    if (isFolder) {
      const folderPath = path ? `${path}/${bookmark.title}` : bookmark.title
      if (bookmark.children) {
        const folderBookmarks: SharedBookmark[] = []

        bookmark.children.forEach((child) => {
          if (child.url) {
            const sharedBookmark: SharedBookmark = {
              title: child.title,
              url: child.url,
              dateAdded: child.dateAdded ? new Date(child.dateAdded).toISOString() : undefined,
            }

            if (options.includeTags) {
              const meta = metadata[child.id]
              if (meta?.customTags?.length) {
                sharedBookmark.tags = meta.customTags
              }
            }

            if (options.includeNotes) {
              const meta = metadata[child.id]
              if (meta?.notes) {
                sharedBookmark.notes = meta.notes
              }
            }

            folderBookmarks.push(sharedBookmark)
          } else {
            processBookmark(child, folderPath)
          }
        })

        if (folderBookmarks.length > 0) {
          collection.folders.push({
            name: bookmark.title,
            path: folderPath,
            bookmarks: folderBookmarks,
          })
        }
      }
    } else {
      const sharedBookmark: SharedBookmark = {
        title: bookmark.title,
        url: bookmark.url!,
        dateAdded: bookmark.dateAdded ? new Date(bookmark.dateAdded).toISOString() : undefined,
      }

      if (options.includeTags) {
        const meta = metadata[bookmark.id]
        if (meta?.customTags?.length) {
          sharedBookmark.tags = meta.customTags
        }
      }

      if (options.includeNotes) {
        const meta = metadata[bookmark.id]
        if (meta?.notes) {
          sharedBookmark.notes = meta.notes
        }
      }

      collection.bookmarks.push(sharedBookmark)
    }
  }

  bookmarks.forEach((b) => processBookmark(b))

  return JSON.stringify(collection, null, 2)
}

/**
 * Export bookmarks to HTML (Netscape Bookmark format)
 */
export async function exportToHtml(bookmarks: Bookmark[]): Promise<string> {
  let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
`

  const processBookmark = (bookmark: Bookmark, indent: string = '    '): string => {
    const isFolder = !bookmark.url

    if (isFolder) {
      let result = `${indent}<DT><H3>${escapeHtml(bookmark.title)}</H3>\n`
      result += `${indent}<DL><p>\n`

      if (bookmark.children) {
        bookmark.children.forEach((child) => {
          result += processBookmark(child, indent + '    ')
        })
      }

      result += `${indent}</DL><p>\n`
      return result
    } else {
      const addDate = bookmark.dateAdded ? ` ADD_DATE="${Math.floor(bookmark.dateAdded / 1000)}"` : ''
      return `${indent}<DT><A HREF="${escapeHtml(bookmark.url!)}"${addDate}>${escapeHtml(bookmark.title)}</A>\n`
    }
  }

  bookmarks.forEach((b) => {
    html += processBookmark(b)
  })

  html += '</DL><p>\n'
  return html
}

/**
 * Import bookmarks from JSON format
 */
export async function importFromJson(
  jsonString: string,
  options: ImportOptions
): Promise<{ imported: number; errors: string[] }> {
  const errors: string[] = []
  let imported = 0

  try {
    const data = JSON.parse(jsonString) as SharedCollection

    // Validate format
    if (!data.version || !data.bookmarks) {
      throw new Error('Invalid bookmark collection format')
    }

    const targetFolderId = options.targetFolderId || '1' // Default to Bookmarks Bar

    // Handle replace strategy
    if (options.strategy === 'replace') {
      // Clear target folder (careful - this is destructive!)
      const children = await bookmarksApi.getChildren(targetFolderId)
      for (const child of children) {
        try {
          if (child.url) {
            await bookmarksApi.remove(child.id)
          } else {
            await bookmarksApi.removeTree(child.id)
          }
        } catch (e) {
          errors.push(`Failed to remove ${child.title}: ${(e as Error).message}`)
        }
      }
    }

    // Import root-level bookmarks
    for (const bookmark of data.bookmarks) {
      try {
        const existingDuplicates = options.skipDuplicates
          ? await bookmarksApi.search({ url: bookmark.url })
          : []

        if (options.skipDuplicates && existingDuplicates.length > 0) {
          continue // Skip duplicate
        }

        const created = await bookmarksApi.create({
          parentId: targetFolderId,
          title: bookmark.title,
          url: bookmark.url,
        })

        // Save tags if present
        if (options.preserveTags && bookmark.tags?.length) {
          await metadataStorage.set(created.id, { customTags: bookmark.tags })
        }

        if (bookmark.notes) {
          await metadataStorage.set(created.id, { notes: bookmark.notes })
        }

        imported++
      } catch (e) {
        errors.push(`Failed to import "${bookmark.title}": ${(e as Error).message}`)
      }
    }

    // Import folders
    for (const folder of data.folders) {
      try {
        // Create folder
        const createdFolder = await bookmarksApi.create({
          parentId: targetFolderId,
          title: folder.name,
        })

        // Import bookmarks in folder
        for (const bookmark of folder.bookmarks) {
          try {
            const existingDuplicates = options.skipDuplicates
              ? await bookmarksApi.search({ url: bookmark.url })
              : []

            if (options.skipDuplicates && existingDuplicates.length > 0) {
              continue
            }

            const created = await bookmarksApi.create({
              parentId: createdFolder.id,
              title: bookmark.title,
              url: bookmark.url,
            })

            if (options.preserveTags && bookmark.tags?.length) {
              await metadataStorage.set(created.id, { customTags: bookmark.tags })
            }

            if (bookmark.notes) {
              await metadataStorage.set(created.id, { notes: bookmark.notes })
            }

            imported++
          } catch (e) {
            errors.push(`Failed to import "${bookmark.title}": ${(e as Error).message}`)
          }
        }
      } catch (e) {
        errors.push(`Failed to create folder "${folder.name}": ${(e as Error).message}`)
      }
    }
  } catch (e) {
    errors.push(`Failed to parse JSON: ${(e as Error).message}`)
  }

  return { imported, errors }
}

/**
 * Import bookmarks from HTML (Netscape Bookmark format)
 */
export async function importFromHtml(
  htmlString: string,
  options: ImportOptions
): Promise<{ imported: number; errors: string[] }> {
  const errors: string[] = []
  let imported = 0
  const targetFolderId = options.targetFolderId || '1'

  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(htmlString, 'text/html')

    const processNode = async (node: Element, parentId: string) => {
      const items = node.querySelectorAll(':scope > dt')

      for (const item of items) {
        const link = item.querySelector(':scope > a')
        const folder = item.querySelector(':scope > h3')

        if (link) {
          const url = link.getAttribute('href')
          const title = link.textContent || 'Untitled'

          if (url) {
            try {
              const existingDuplicates = options.skipDuplicates
                ? await bookmarksApi.search({ url })
                : []

              if (options.skipDuplicates && existingDuplicates.length > 0) {
                continue
              }

              await bookmarksApi.create({
                parentId,
                title,
                url,
              })
              imported++
            } catch (e) {
              errors.push(`Failed to import "${title}": ${(e as Error).message}`)
            }
          }
        } else if (folder) {
          const folderTitle = folder.textContent || 'Untitled Folder'
          const subList = item.querySelector(':scope > dl')

          try {
            const createdFolder = await bookmarksApi.create({
              parentId,
              title: folderTitle,
            })

            if (subList) {
              await processNode(subList, createdFolder.id)
            }
          } catch (e) {
            errors.push(`Failed to create folder "${folderTitle}": ${(e as Error).message}`)
          }
        }
      }
    }

    const rootDl = doc.querySelector('dl')
    if (rootDl) {
      await processNode(rootDl, targetFolderId)
    }
  } catch (e) {
    errors.push(`Failed to parse HTML: ${(e as Error).message}`)
  }

  return { imported, errors }
}

/**
 * Find duplicate bookmarks
 */
export function findDuplicates(bookmarks: Bookmark[]): Map<string, Bookmark[]> {
  const urlMap = new Map<string, Bookmark[]>()

  const processBookmark = (bookmark: Bookmark) => {
    if (bookmark.url) {
      const normalizedUrl = normalizeUrl(bookmark.url)
      const existing = urlMap.get(normalizedUrl) || []
      existing.push(bookmark)
      urlMap.set(normalizedUrl, existing)
    }

    if (bookmark.children) {
      bookmark.children.forEach(processBookmark)
    }
  }

  bookmarks.forEach(processBookmark)

  // Filter to only return actual duplicates (more than 1 bookmark per URL)
  const duplicates = new Map<string, Bookmark[]>()
  urlMap.forEach((bookmarks, url) => {
    if (bookmarks.length > 1) {
      duplicates.set(url, bookmarks)
    }
  })

  return duplicates
}

/**
 * Normalize URL for comparison
 */
function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url)
    // Remove trailing slashes, sort query params, lowercase
    let normalized = `${parsed.protocol}//${parsed.host}${parsed.pathname}`.toLowerCase()
    normalized = normalized.replace(/\/+$/, '')
    return normalized
  } catch {
    return url.toLowerCase()
  }
}

/**
 * Escape HTML entities
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Download a file
 */
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
