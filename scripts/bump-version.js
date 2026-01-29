import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const versionFile = path.join(__dirname, '..', 'src', 'version.json')
const manifestFile = path.join(__dirname, '..', 'manifest.json')

// Get current date in yyyy-mm-dd format
const now = new Date()
const year = now.getFullYear()
const month = String(now.getMonth() + 1).padStart(2, '0')
const day = String(now.getDate()).padStart(2, '0')
const dateStr = `${year}-${month}-${day}`

// Read current version
let currentVersion = { date: '', build: 0 }
try {
  const content = fs.readFileSync(versionFile, 'utf-8')
  currentVersion = JSON.parse(content)
} catch (e) {
  // File doesn't exist yet, will create
}

// Calculate new build number
let buildNumber = 1
if (currentVersion.date === dateStr) {
  buildNumber = currentVersion.build + 1
}

// Create version string (for display: yyyy-mm-dd-xx)
const buildStr = String(buildNumber).padStart(2, '0')
const version = `${dateStr}-${buildStr}`

// Create Chrome manifest compatible version (x.y.z.w format)
// Convert date to version: year.month.day.build
const manifestVersion = `${year - 2000}.${parseInt(month)}.${parseInt(day)}.${buildNumber}`

// Save new version JSON
const newVersion = { date: dateStr, build: buildNumber, version }
fs.writeFileSync(versionFile, JSON.stringify(newVersion, null, 2))

// Update manifest.json version
try {
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf-8'))
  manifest.version = manifestVersion
  manifest.version_name = version
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2))
} catch (e) {
  console.error('Failed to update manifest.json:', e.message)
}

console.log(`Version bumped to: ${version} (manifest: ${manifestVersion})`)
