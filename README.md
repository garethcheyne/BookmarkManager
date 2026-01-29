
# Chromium BookmarkManager

Chromium BookmarkManager is a modern, feature-rich Chrome extension designed to make managing, organizing, and syncing your bookmarks effortless. It provides a clean, intuitive interface accessible from Chrome’s side panel, allowing you to create, edit, organize, and search bookmarks with advanced features like tagging, notes, and duplicate detection. 

What sets this extension apart is its seamless integration with GitHub: you can sync selected bookmark folders to GitHub repositories or Gists, enabling cloud backup, sharing, and cross-device access. The extension supports importing/exporting bookmarks in JSON, offers a robust search with fuzzy matching, and provides a dark mode for comfortable browsing. All settings and folder sync connections are stored securely, with GitHub tokens kept only on your device for privacy.

Whether you’re a power user with thousands of bookmarks or just want a better way to organize and back up your favorites, Chromium BookmarkManager brings professional-grade bookmark management to your browser, with open-source transparency and modern web technologies.


## Key Features

- **Full Bookmark Management**: Create, edit, delete, and organize bookmarks and folders
- **Modern Side Panel UI**: Access all features from a responsive, user-friendly interface
- **GitHub Sync**: Backup and share bookmark folders to GitHub repositories or Gists
- **Advanced Search**: Quickly find bookmarks with instant and fuzzy search
- **Tags & Notes**: Add custom tags and notes for better organization
- **Import/Export**: Move bookmarks in and out using JSON
- **Duplicate Detection**: Identify and clean up duplicate bookmarks
- **Cross-Device Sync**: Sync folder connections across Chrome browsers
- **Dark/Light Mode**: Adapts to your system theme

## Installation

### From Source

1. Clone the repository:
   ```bash
   git clone https://github.com/garethcheyne/Chromium-BookmarkManager.git
   cd Chromium-BookmarkManager
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

4. Load in Chrome:
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

## Development

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Type checking
npm run lint
```

### Project Structure

```
src/
├── background/        # Service worker for bookmark events
├── components/        # React components
│   ├── ui/           # shadcn/ui base components
│   └── ...           # Feature components
├── lib/              # Utilities and API wrappers
│   ├── chrome-api.ts # Chrome APIs wrapper
│   ├── github-api.ts # GitHub REST API client
│   └── github-auth.ts# GitHub authentication
├── options/          # Settings page
├── popup/            # Popup UI
├── sidepanel/        # Side panel UI
├── store/            # Zustand state management
│   ├── bookmarkStore.ts
│   ├── settingsStore.ts
│   └── githubStore.ts
└── types/            # TypeScript type definitions
```

## GitHub Integration

### Connecting to GitHub

1. Create a GitHub Personal Access Token at [github.com/settings/tokens](https://github.com/settings/tokens)
2. Required scopes: `repo`, `gist`
3. Enter the token in Settings > GitHub Sync > Connect GitHub

### Syncing Folders

1. Right-click any bookmark folder
2. Select "Share to GitHub" > "Save to Repository" or "Share as Gist"
3. Choose an existing repo/gist or create a new one
4. The folder will show a green badge indicating it's synced

### Sync Behavior

- **Folder connections** sync across Chrome browsers automatically
- **GitHub tokens** are stored locally only (for security)
- Each folder saves to a **separate JSON file** (`bookmarks/{folder-name}.json`)
- Use "Sync to Repo/Gist" from the context menu to push changes

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **@crxjs/vite-plugin** - Chrome extension development
- **Zustand** - State management
- **Radix UI / shadcn/ui** - UI components
- **Tailwind CSS** - Styling

## Permissions

The extension requires the following Chrome permissions:

- `bookmarks` - Read and modify bookmarks
- `storage` - Store settings and sync data
- `sidePanel` - Display the side panel interface
- `identity` - (Future) OAuth authentication

## Version Format

Versions follow the format `YYYY-MM-DD-XX` where:
- `YYYY-MM-DD` is the build date
- `XX` is the build number for that day

The manifest version uses `YY.M.DD.XX` format for Chrome compatibility.

## License

MIT
