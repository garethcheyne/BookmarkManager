# Deployment Guide

This guide explains how to set up automated deployment to Chrome Web Store and Edge Add-ons store.

## Prerequisites

### Chrome Web Store

1. **Create a Developer Account**
   - Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
   - Pay the one-time $5 registration fee

2. **Get API Credentials**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable "Chrome Web Store API"
   - Go to "Credentials" → "Create Credentials" → "OAuth client ID"
   - Choose "Desktop app" as application type
   - Download the JSON credentials file
   - Note your `client_id` and `client_secret`

3. **Get Refresh Token**
   - Run this command locally with your credentials:
   ```bash
   npx chrome-webstore-upload-cli login \
     --client-id YOUR_CLIENT_ID \
     --client-secret YOUR_CLIENT_SECRET
   ```
   - Follow the OAuth flow in your browser
   - Copy the refresh token from the output

4. **Get Extension ID**
   - Upload your extension manually once to Chrome Web Store
   - The extension ID will be visible in the URL (32-character string)

### Microsoft Edge Add-ons

1. **Create a Partner Center Account**
   - Go to [Microsoft Partner Center](https://partner.microsoft.com/dashboard/microsoftedge/overview)
   - Register as a developer (free)

2. **Get API Credentials**
   - In Partner Center, go to "Account settings" → "User management"
   - Click "Add Azure AD application"
   - Go to your [Azure Portal](https://portal.azure.com/)
   - Navigate to "Azure Active Directory" → "App registrations"
   - Create a new registration or use existing one
   - Go to "Certificates & secrets" → "New client secret"
   - Note your `client_id`, `client_secret`, and `tenant_id`

3. **Get Product ID**
   - Upload your extension manually once to Edge Add-ons
   - The Product ID will be visible in Partner Center dashboard

4. **Get Access Token URL**
   - Format: `https://login.microsoftonline.com/{TENANT_ID}/oauth2/v2.0/token`
   - Replace `{TENANT_ID}` with your Azure tenant ID

## GitHub Secrets Setup

Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions → New repository secret):

### Chrome Web Store Secrets

- `CHROME_CLIENT_ID` - OAuth client ID from Google Cloud Console
- `CHROME_CLIENT_SECRET` - OAuth client secret from Google Cloud Console
- `CHROME_REFRESH_TOKEN` - Refresh token obtained from CLI login
- `CHROME_EXTENSION_ID` - Extension ID from Chrome Web Store (32 chars)

### Edge Add-ons Secrets

- `EDGE_CLIENT_ID` - Azure AD application client ID
- `EDGE_CLIENT_SECRET` - Azure AD application client secret
- `EDGE_PRODUCT_ID` - Product ID from Partner Center
- `EDGE_ACCESS_TOKEN_URL` - Full OAuth token URL with tenant ID

## Deployment Workflow

### Manual Deployment

1. **Bump version**
   ```bash
   npm run bump-version
   ```

2. **Create and push tag**
   ```bash
   git add .
   git commit -m "Release v26.1.30.XX"
   git tag v26.1.30.XX
   git push && git push --tags
   ```

3. **GitHub Actions will automatically:**
   - Build the extension
   - Create a release package
   - Upload to Chrome Web Store
   - Upload to Edge Add-ons
   - Create a GitHub Release

### Manual Trigger (via GitHub Actions UI)

1. Go to Actions tab in GitHub
2. Select "Release Extension" workflow
3. Click "Run workflow"
4. Enter version number (e.g., `26.1.30.50`)
5. Click "Run workflow"

## Testing Locally

Before deploying, test the release process locally:

```bash
# Build the extension
npm run build

# Prepare release (updates version in dist)
VERSION=26.1.30.99 node scripts/prepare-release.js

# Create zip manually
cd dist
zip -r ../bookstash-extension.zip .
cd ..

# Test the zip file by loading it in Chrome/Edge
```

## Version Numbering

We use date-based versioning: `YY.M.DD.BUILD`

Example: `26.1.30.42`
- `26` = Year (2026)
- `1` = Month (January)
- `30` = Day
- `42` = Build number for that day

The `bump-version.js` script automatically increments the build number.

## Troubleshooting

### Chrome Web Store Upload Fails

- Verify all secrets are correctly set in GitHub
- Check that refresh token hasn't expired (refresh tokens can expire after 6 months of no use)
- Ensure Chrome Web Store API is enabled in Google Cloud Console
- Check manifest.json has all required fields

### Edge Add-ons Upload Fails

- Verify Azure AD application has proper permissions
- Check client secret hasn't expired (Azure secrets expire after 1-2 years)
- Ensure Product ID is correct
- Verify tenant ID in access token URL

### GitHub Actions Fails

- Check workflow logs in GitHub Actions tab
- Verify all required secrets are set
- Ensure npm build completes successfully
- Check that dist/ folder contains all necessary files

## Store Review Times

- **Chrome Web Store**: Usually 1-3 business days, can be up to 7 days
- **Edge Add-ons**: Usually 1-2 business days

Both stores may take longer during holidays or for first submission.

## First-Time Setup Checklist

- [ ] Create Chrome Web Store developer account
- [ ] Create Edge Partner Center account
- [ ] Get Chrome API credentials and refresh token
- [ ] Get Edge API credentials and product ID
- [ ] Add all secrets to GitHub repository
- [ ] Manually upload extension once to each store
- [ ] Test automated deployment with a test version
- [ ] Document any store-specific requirements

## Additional Resources

- [Chrome Web Store Developer Documentation](https://developer.chrome.com/docs/webstore/)
- [Edge Add-ons Developer Documentation](https://docs.microsoft.com/microsoft-edge/extensions-chromium/)
- [chrome-webstore-upload-cli](https://github.com/fregante/chrome-webstore-upload-cli)
- [GitHub Actions Documentation](https://docs.github.com/actions)
