# How to Reload the Extension and See the Snippets UI

## Steps to Reload

1. **Build the extension** (if not already done):
   ```bash
   npm run build
   ```

2. **Reload the extension in Chrome**:
   - Open Chrome and go to `chrome://extensions/`
   - Find "BookStash" in the list
   - Click the **Reload** button (circular arrow icon)

3. **Open the extension**:
   - Click the BookStash icon in your browser toolbar
   - You should see **two tabs** at the top:
     - **Bookmarks** (default)
     - **Snippets** (with a code icon)

4. **Access the Snippets UI**:
   - Click on the **Snippets** tab
   - You should see the Snippet Catalogue interface

## What You Should See

### Snippets Tab Contains:
- Header with "Snippet Catalogue" title
- "Sync" dropdown button (for GitHub sync)
- "Add Snippet" button
- Search bar
- Category and Language filter dropdowns
- Empty state message: "No snippets yet. Click 'Add Snippet' to create your first one."

### Also Available in Side Panel:
- Open the side panel (click the side panel icon in the header)
- Switch to the Snippets tab there as well

## Troubleshooting

### If you don't see the Snippets tab:

1. **Check the build output**:
   ```bash
   npm run build
   ```
   Make sure it completes successfully.

2. **Hard reload the extension**:
   - Go to `chrome://extensions/`
   - Toggle the extension **OFF** then **ON**
   - OR remove and re-add the extension

3. **Check browser console**:
   - Open the extension popup
   - Right-click and select "Inspect"
   - Check the Console tab for any errors

4. **Clear extension storage** (if needed):
   ```javascript
   // In the extension console
   chrome.storage.local.clear()
   ```

5. **Verify files are built**:
   Check that these files exist in the `dist` folder:
   - `dist/src/popup/index.html`
   - `dist/assets/popup-*.js`
   - `dist/assets/index-*.js`

## Testing the Feature

Once you see the Snippets tab:

1. Click "Add Snippet"
2. Fill in:
   - Title: "Test Snippet"
   - Code: `alert('Hello from snippet!')`
3. Click "Create Snippet"
4. You should see your new snippet in the list
5. Click the ▶ (play) button to execute it on the current page

## Common Issues

**Issue**: "Cannot find module checkbox or alert"
- **Solution**: These are TypeScript linting warnings only. The build still works. Ignore them.

**Issue**: Build fails with actual errors
- **Solution**: Run `npm install` to ensure all dependencies are installed

**Issue**: Extension doesn't update after build
- **Solution**: Make sure you're reloading from `chrome://extensions/`, not just closing/reopening the popup
