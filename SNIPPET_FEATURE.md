# Snippet Catalogue Feature

## Overview

The Snippet Catalogue is a powerful new feature that allows you to create, manage, and execute JavaScript snippets on web pages directly from your bookmark manager extension.

## Features

### Core Functionality
- **Create Snippets**: Write and save JavaScript code snippets for reuse
- **Execute on Page**: Run snippets on the current browser tab with one click
- **Organize**: Tag and categorize snippets for easy discovery
- **Search & Filter**: Find snippets by name, description, tags, category, or language
- **Favorites**: Mark frequently used snippets as favorites
- **Usage Tracking**: View how many times each snippet has been executed

### GitHub Sync
- **Share to Gist**: Export your snippets to GitHub Gist (public or private)
- **Import from Gist**: Import snippets from existing Gists
- **Sync Across Devices**: Share snippets between different installations

### Snippet Properties
- **Title**: Descriptive name for the snippet
- **Description**: Optional details about what the snippet does
- **Code**: The JavaScript code to execute
- **Tags**: Custom tags for organization
- **Category**: Assign snippets to categories
- **Language**: JavaScript or TypeScript (for syntax highlighting)

## Usage

### Creating a Snippet

1. Open the extension popup or side panel
2. Switch to the "Snippets" tab
3. Click "Add Snippet"
4. Fill in the details:
   - Title (required)
   - Description (optional)
   - Code (required) - your JavaScript code
   - Language (JavaScript/TypeScript)
   - Category (optional)
   - Tags (optional)
5. Click "Create Snippet"

### Executing a Snippet

1. Navigate to the web page where you want to run the snippet
2. Open the extension
3. Go to the Snippets tab
4. Click the play button (▶) on any snippet
5. The snippet will execute in the context of the current page

### Managing Snippets

**Edit**: Click the menu (⋮) > Edit to modify a snippet
**Duplicate**: Click the menu > Duplicate to create a copy
**Delete**: Click the menu > Delete to remove a snippet
**Favorite**: Click the menu > Add to Favorites (or click the star icon)
**Copy Code**: Click the menu > Copy Code to copy the snippet to clipboard

### Filtering and Search

- **Search Bar**: Type to search across titles, descriptions, code, and tags
- **Category Filter**: Filter by category from the dropdown
- **Language Filter**: Filter by JavaScript or TypeScript
- **Favorites Tab**: View only your favorited snippets
- **Tag Chips**: Click any tag to filter by that tag

### GitHub Sync

#### Share to Gist
1. Click the "Sync" dropdown
2. Select "Share to Gist"
3. Enter a name for the gist
4. Optionally add a description
5. Choose public or private
6. Click "Share to Gist"

The extension will export all your snippets (or just selected ones) to a JSON file in a new GitHub Gist.

#### Import from Gist
1. Click the "Sync" dropdown
2. Select "Import from Gist"
3. Paste the Gist URL
4. Click "Import Snippets"

All snippets from the Gist will be imported into your collection.

## Example Snippets

### Highlight All Links
```javascript
document.querySelectorAll('a').forEach(link => {
  link.style.border = '2px solid red';
});
```

### Dark Mode Toggle
```javascript
document.documentElement.style.filter = 
  document.documentElement.style.filter === 'invert(1)' 
    ? '' 
    : 'invert(1)';
```

### Extract All Images
```javascript
const images = Array.from(document.querySelectorAll('img'));
console.log(images.map(img => img.src));
```

### Copy Page Title
```javascript
navigator.clipboard.writeText(document.title);
alert('Page title copied!');
```

### Remove Sticky Elements
```javascript
document.querySelectorAll('[style*="position: fixed"], [style*="position: sticky"]')
  .forEach(el => el.remove());
```

## Security Notes

- Snippets execute in the "MAIN" world context, meaning they have full access to the page's JavaScript environment
- Be careful when importing snippets from unknown sources
- Always review snippet code before executing
- Snippets can modify page content, make network requests, and access cookies/storage

## Permissions

The snippet feature requires these Chrome extension permissions:
- `scripting`: To execute JavaScript in web pages
- `activeTab`: To access the current tab for execution

## Technical Details

### Storage
- Snippets are stored in `chrome.storage.local` under the key `snippets`
- Categories are stored under `snippet_categories`
- Storage is synced automatically across extension contexts

### Execution
- Uses `chrome.scripting.executeScript` API
- Executes in the page's main world (not isolated)
- Returns execution results and errors
- Tracks execution time and usage statistics

### Data Format
```typescript
interface Snippet {
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
```

## Keyboard Shortcuts

(In future updates)
- `Ctrl/Cmd + E`: Execute selected snippet
- `Ctrl/Cmd + F`: Focus search
- `Ctrl/Cmd + N`: New snippet

## Tips

1. **Use Clear Naming**: Give snippets descriptive titles so you can find them easily
2. **Add Descriptions**: Help yourself remember what complex snippets do
3. **Tag Everything**: Tags make organization and discovery much easier
4. **Test Safely**: Test snippets on non-critical pages first
5. **Backup**: Regularly export your snippets to Gist as a backup
6. **Share Wisely**: Only share snippets you're comfortable making public

## Future Enhancements

Planned features for future releases:
- Snippet templates and library
- Syntax highlighting in editor
- Code validation and linting
- Scheduled/automated snippet execution
- Snippet sharing to GitHub repositories (not just Gists)
- Import/export to local files
- Snippet variables and parameters
- Multi-tab execution
- Keyboard shortcuts for quick execution
