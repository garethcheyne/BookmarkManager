# BookStash

<div align="center">

![BookStash Logo](assets/icon128.png)

**Modern bookmark management for Chrome and Edge with GitHub integration**

[![Chrome Web Store](https://img.shields.io/badge/Chrome-Web%20Store-blue?logo=google-chrome)](https://chrome.google.com/webstore)
[![Edge Add-ons](https://img.shields.io/badge/Edge-Add--ons-blue?logo=microsoft-edge)](https://microsoftedge.microsoft.com/addons)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

---

## Overview

BookStash is a powerful bookmark management extension that brings professional-grade organization to your browser. Built with modern web technologies, it provides an intuitive interface for managing thousands of bookmarks with features like tagging, search, GitHub sync, and cross-device backup.

**What makes BookStash special:**
- 🎨 Beautiful, theme-aware UI (popup and side panel)
- 🔄 Sync bookmark folders to GitHub Repositories or Gists
- 🏷️ Add custom tags and notes to any bookmark
- 🔍 Instant search with fuzzy matching
- 📤 Import/Export bookmarks in JSON format
- 🔁 Find and remove duplicate bookmarks
- 🌙 Dark/Light mode support
- ⚡ Lightning-fast performance with React 18
- 🔒 Privacy-first: GitHub tokens stored locally only

## Screenshots

### Popup Interface
The compact popup provides quick access to your bookmarks with the full feature set.

### Side Panel
Work alongside your browsing with the persistent side panel for easy bookmark management.

### GitHub Sync
Backup folders to GitHub and access them from any device or share with your team.

## Installation

### From Chrome Web Store / Edge Add-ons
*Coming soon - automated deployment in progress*

### From Source (Developers)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/garethcheyne/BookmarkManager.git
   cd BookmarkManager
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the extension:**
   ```bash
   npm run build
   ```

4. **Load in Chrome/Edge:**
   - Navigate to `chrome://extensions/` (Chrome) or `edge://extensions/` (Edge)
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

## Features

### 📁 Complete Bookmark Management
- Create, edit, and delete bookmarks and folders
- Drag-and-drop organization
- Nested folder support
- Right-click context menus
- Keyboard shortcuts for power users

### 🔍 Advanced Search
- Instant search as you type
- Fuzzy matching finds bookmarks even with typos
- Search by title, URL, or tags
- Recent searches history

### 🏷️ Tags & Metadata
- Add custom tags to any bookmark
- Add notes and descriptions
- Track access counts and last visit dates
- Color-coded tags for visual organization

### 🐙 GitHub Integration

**Sync to Repositories:**
- Push entire bookmark folders to GitHub repos
- Automatic JSON formatting
- Keeps folder structure organized
- Perfect for team sharing or public bookmark collections

**Sync to Gists:**
- Quick backup to private or public Gists
- Lightweight alternative to repositories
- Easy sharing via Gist URL

**Import from GitHub:**
- Import bookmarks from any Gist or repository
- Restore backups instantly
- Merge bookmarks from multiple sources

### 📊 Smart Features
- **Duplicate Detection:** Find and remove duplicate URLs
- **Import/Export:** Backup to JSON files
- **Folder Badges:** Visual indicators for synced folders
- **Trash Protection:** Confirm before deleting
- **Theme Sync:** Follows system dark/light mode

## Usage Guide

### Basic Operations

**Add a Bookmark:**
1. Click the + icon in the toolbar
2. Enter title and URL
3. Choose a folder and add tags (optional)

**Edit a Bookmark:**
1. Right-click any bookmark
2. Select "Edit"
3. Update fields and save

**Delete Items:**
1. Select bookmarks/folders (Ctrl/Cmd + Click)
2. Press Delete key or click trash icon
3. Confirm if prompted (configurable)

### GitHub Sync Setup

**1. Get a GitHub Token:**
- Go to [GitHub Settings → Personal Access Tokens](https://github.com/settings/tokens)
- Click "Generate new token (classic)"
- Select scopes: `repo` (for repositories) and `gist` (for gists)
- Copy the token

**2. Connect BookStash:**
- Click the GitHub icon in BookStash
- Select "Connect GitHub"
- Paste your token
- Click "Connect"

**3. Sync a Folder:**
- Right-click any bookmark folder
- Choose "Share to GitHub"
- Select "Save to Repository" or "Share as Gist"
- Choose existing or create new
- Folder will show a GitHub badge when synced

**4. Push Updates:**
- Right-click a synced folder
- Select "Push to Repo/Gist"
- Changes are uploaded to GitHub

**5. Pull Updates:**
- Right-click a synced folder
- Select "Pull from Repo/Gist"
- Remote changes are merged locally

### Keyboard Shortcuts

- `Ctrl/Cmd + K` - Focus search
- `Ctrl/Cmd + B` - New bookmark
- `Ctrl/Cmd + N` - New folder
- `Delete` - Delete selected items
- `Esc` - Clear search/selection

### Settings

Access settings via the gear icon:
- **Appearance:** Theme (light/dark/system)
- **Behavior:** Confirm deletes, open links in new tabs
- **GitHub:** Manage connection and sync settings
- **Data:** Export/import all bookmarks

## Development

### Tech Stack

- **React 18** + **TypeScript** - Modern UI with type safety
- **Vite** - Lightning-fast builds and HMR
- **Zustand** - Lightweight state management
- **Tailwind CSS** - Utility-first styling
- **Radix UI** + **shadcn/ui** - Accessible component primitives
- **@crxjs/vite-plugin** - Chrome extension tooling

### Project Structure

```
src/
├── background/         # Service worker for bookmark events
├── components/         # React components
│   ├── ui/            # Reusable UI components (shadcn)
│   ├── BookmarkTree.tsx
│   ├── SearchBar.tsx
│   └── ...            # Feature-specific components
├── lib/               # Utilities and API clients
│   ├── chrome-api.ts  # Chrome APIs wrapper
│   ├── github-api.ts  # GitHub REST API
│   └── utils.ts       # Helper functions
├── options/           # Settings page
├── popup/             # Popup interface
├── sidepanel/         # Side panel interface
├── store/             # State management
│   ├── bookmarkStore.ts
│   ├── githubStore.ts
│   └── settingsStore.ts
└── types/             # TypeScript definitions
```

### Development Commands

```bash
# Start development with hot reload
npm run dev

# Build for production
npm run build

# Type checking
npm run lint

# Format code
npm run format

# Run tests
npm test

# Build and prepare release
npm run release
```

### Building from Source

```bash
# Install dependencies
npm install

# Build the extension
npm run build

# Output is in dist/ folder
```

### Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a pull request

## Deployment

BookStash uses automated deployment to both Chrome Web Store and Edge Add-ons via GitHub Actions.

See [DEPLOYMENT.md](DEPLOYMENT.md) for full setup instructions including:
- Getting API credentials
- Setting up GitHub secrets
- Triggering releases
- Troubleshooting

## Permissions

BookStash requires these Chrome permissions:

- **bookmarks** - Read and modify your bookmarks
- **storage** - Store settings and sync folder connections
- **sidePanel** - Display the side panel interface
- **identity** - (Optional) For future OAuth features

Your privacy is important:
- GitHub tokens are stored locally only
- No data is sent to third parties
- All sync is direct to your GitHub account

## Version Format

Versions use date-based format: `YY.M.DD.BUILD`

Example: `26.1.30.42`
- `26` = Year (2026)
- `1` = Month (January)
- `30` = Day
- `42` = Build number

## Roadmap

- [ ] Chrome Web Store release
- [ ] Edge Add-ons release
- [ ] Firefox support
- [ ] OAuth GitHub authentication
- [ ] Bookmark collection sharing
- [ ] AI-powered bookmark organization
- [ ] Browser history integration
- [ ] Mobile companion app

## Support

- 🐛 [Report bugs](https://github.com/garethcheyne/BookmarkManager/issues)
- 💡 [Request features](https://github.com/garethcheyne/BookmarkManager/issues)
- 📧 [Contact developer](mailto:gareth.cheyne@gmail.com)

## License

MIT License - see [LICENSE](LICENSE) file for details

---

<div align="center">

**Built with ❤️ by [Gareth Cheyne](https://www.err403.com) & Claude**

[Report Bug](https://github.com/garethcheyne/BookmarkManager/issues) · [Request Feature](https://github.com/garethcheyne/BookmarkManager/issues)

</div>
