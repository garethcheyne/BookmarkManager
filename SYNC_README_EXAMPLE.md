# Example Synced Repository README

This is an example of the README.md file that BookStash automatically creates in your synced GitHub repositories.

---

# Development Resources

> 🔖 Personal bookmark collection synced with BookStash

This repository contains your **Development Resources** bookmark collection, automatically synchronized from your browser. All bookmarks are stored in a structured JSON format with tags, notes, and metadata preserved.

## 📂 Folder Structure

```
Development Resources/
  ├── Frontend/             (15 bookmarks)
  ├── Backend/              (22 bookmarks)
  ├── DevOps/               (8 bookmarks)
  └── Learning/             (31 bookmarks)
      ├── Tutorials/        (12 bookmarks)
      └── Documentation/    (19 bookmarks)
```

## 📊 Collection Stats

- **Total Bookmarks:** 76
- **Folders:** 6
- **Tags:** react, nodejs, docker, kubernetes, typescript, python, aws
- **Last Updated:** February 2, 2026

## 🔄 How Sync Works

### Automatic Synchronization
- **Push:** When you add, edit, or delete bookmarks in your browser, changes are automatically pushed to this repository
- **Structure Preservation:** Nested folders maintain their hierarchical structure using path notation
- **Metadata Included:** Tags, notes, creation dates, and custom metadata are all preserved
- **README Updates:** This file is automatically regenerated on each sync with current statistics

### Sync Triggers
1. Right-click folder → "Push to Repo" (manual sync)
2. Drag bookmarks while holding Ctrl/Cmd (auto-sync on drop)
3. Force Sync All button in settings (bulk sync)
4. Automatic cleanup when folders are renamed or deleted

### What Gets Synced
- ✅ Bookmark titles and URLs
- ✅ Folder organization and hierarchy
- ✅ Custom tags you've added
- ✅ Personal notes on bookmarks
- ✅ Date added timestamps
- ✅ Folder structure (nested paths)

## 📄 File Structure

```
.
├── README.md          # This file (auto-generated)
└── bookmarks.json     # Your bookmarks in JSON format
```

## 🔍 Data Format

Your bookmarks are stored in `bookmarks.json` using this structure:

```json
{
  "version": "1.0",
  "metadata": {
    "name": "Development Resources",
    "description": "...",
    "author": "Your GitHub username",
    "created": "2026-02-02T12:00:00.000Z",
    "updated": "2026-02-02T15:30:00.000Z",
    "tags": ["tag1", "tag2"],
    "isPublic": false
  },
  "bookmarks": [
    {
      "title": "Example Site",
      "url": "https://example.com",
      "dateAdded": "2026-01-15T10:00:00.000Z",
      "tags": ["work", "reference"],
      "notes": "Optional notes"
    }
  ],
  "folders": [
    {
      "name": "Subfolder",
      "path": "Parent/Subfolder",
      "bookmarks": [...]
    }
  ]
}
```

### Format Details
- **Folders:** Use `path` property with `/` separators for nested structures (e.g., `"Work/Projects/2024"`)
- **Bookmarks:** Each has title, URL, optional tags array, optional notes, and creation timestamp
- **Metadata:** Collection-level info including aggregate tags and sync timestamps

## 💡 Usage

### Import to Browser
1. Install [BookStash extension](https://github.com/garethcheyne/BookmarkManager)
2. Right-click any folder in your bookmarks
3. Select "Import from GitHub" → "Repository"
4. Enter this repository URL
5. Bookmarks are imported with full metadata

### Share with Others
- **Public Repos:** Anyone can import your bookmarks using the repo URL
- **Private Repos:** Only you and collaborators can access
- **Team Collections:** Perfect for sharing curated bookmark lists

### Manual Editing
You can edit `bookmarks.json` directly:
- Add new bookmarks to the `bookmarks` or `folders` arrays
- Modify titles, URLs, tags, or notes
- Next sync will merge your changes (may prompt for conflict resolution)

## 🔧 Maintenance

### Automatic Cleanup
BookStash automatically maintains repository cleanliness:
- **Folder Deletion:** Removes corresponding JSON file
- **Folder Rename:** Deletes old file, creates new one with updated name
- **Orphan Detection:** Scans for and removes any leftover bookmark files not linked to active folders

### Version Control
All changes are tracked through Git commits:
- Each sync creates a commit with descriptive message
- Full history preserved for rollback if needed
- Use GitHub's history view to see bookmark evolution

## ⚙️ Powered By

**BookStash** - Modern bookmark management for Chrome & Edge
- GitHub: [garethcheyne/BookmarkManager](https://github.com/garethcheyne/BookmarkManager)
- Features: GitHub sync, tags, search, duplicate detection, multi-select
- Privacy: All tokens stored locally, direct GitHub API access

---

*📅 Last synced: 2026-02-02 • 🔖 Synced with BookStash*
