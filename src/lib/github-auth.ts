import type { GitHubAuth } from '@/types'
import { storageLocal } from './chrome-api'
import { userApi } from './github-api'

const GITHUB_AUTH_KEY = 'github_auth'
const GITHUB_CLIENT_ID_KEY = 'github_client_id'

// Default OAuth scopes needed for Gists and Repos
const OAUTH_SCOPES = ['gist', 'repo'].join(' ')

/**
 * Get stored GitHub auth
 */
export async function getStoredAuth(): Promise<GitHubAuth | null> {
  const result = await storageLocal.get<{ [GITHUB_AUTH_KEY]: GitHubAuth }>([GITHUB_AUTH_KEY])
  return result[GITHUB_AUTH_KEY] || null
}

/**
 * Save GitHub auth to storage
 */
export async function saveAuth(auth: GitHubAuth): Promise<void> {
  await storageLocal.set({ [GITHUB_AUTH_KEY]: auth })
}

/**
 * Clear stored GitHub auth
 */
export async function clearAuth(): Promise<void> {
  await storageLocal.remove(GITHUB_AUTH_KEY)
}

/**
 * Get stored GitHub Client ID
 */
export async function getClientId(): Promise<string | null> {
  const result = await storageLocal.get<{ [GITHUB_CLIENT_ID_KEY]: string }>([GITHUB_CLIENT_ID_KEY])
  return result[GITHUB_CLIENT_ID_KEY] || null
}

/**
 * Save GitHub Client ID
 */
export async function saveClientId(clientId: string): Promise<void> {
  await storageLocal.set({ [GITHUB_CLIENT_ID_KEY]: clientId })
}

/**
 * Start OAuth flow using chrome.identity
 *
 * Note: For this to work, the user needs to:
 * 1. Create a GitHub OAuth App at https://github.com/settings/developers
 * 2. Set the callback URL to: https://<extension-id>.chromiumapp.org/
 * 3. Enter their Client ID in the extension settings
 */
export async function startOAuthFlow(clientId: string): Promise<GitHubAuth> {
  const redirectUri = chrome.identity.getRedirectURL()

  const authUrl = new URL('https://github.com/login/oauth/authorize')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('scope', OAUTH_SCOPES)
  authUrl.searchParams.set('state', generateState())

  return new Promise((_resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      {
        url: authUrl.toString(),
        interactive: true,
      },
      async (responseUrl) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
          return
        }

        if (!responseUrl) {
          reject(new Error('No response from GitHub'))
          return
        }

        try {
          const url = new URL(responseUrl)
          const code = url.searchParams.get('code')

          if (!code) {
            const error = url.searchParams.get('error_description') || 'Authorization failed'
            reject(new Error(error))
            return
          }

          // Exchange code for token using a proxy or the user's own server
          // Since we can't expose client_secret in the extension, we'll use
          // GitHub's device flow or ask users to create a Personal Access Token

          // For now, we'll prompt users to use a Personal Access Token instead
          reject(new Error('OAuth code flow requires a backend server. Please use a Personal Access Token instead.'))
        } catch (error) {
          reject(error)
        }
      }
    )
  })
}

/**
 * Authenticate with a Personal Access Token
 * This is the simpler approach that doesn't require a backend server
 */
export async function authenticateWithToken(token: string): Promise<GitHubAuth> {
  // Verify the token works by fetching user info
  const user = await userApi.getUser(token)

  const auth: GitHubAuth = {
    accessToken: token,
    tokenType: 'bearer',
    scope: OAUTH_SCOPES,
    username: user.login,
    avatarUrl: user.avatar_url,
  }

  await saveAuth(auth)
  return auth
}

/**
 * Check if current auth is still valid
 */
export async function validateAuth(auth: GitHubAuth): Promise<boolean> {
  try {
    await userApi.getUser(auth.accessToken)
    return true
  } catch {
    return false
  }
}

/**
 * Generate random state for OAuth
 */
function generateState(): string {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Get the extension's redirect URL for OAuth
 */
export function getRedirectUrl(): string {
  return chrome.identity.getRedirectURL()
}
