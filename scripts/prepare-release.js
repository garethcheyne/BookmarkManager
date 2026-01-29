#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const version = process.env.VERSION || process.argv[2]

if (!version) {
  console.error('❌ Version is required. Set VERSION env var or pass as argument.')
  process.exit(1)
}

// Remove 'v' prefix if present
const cleanVersion = version.replace(/^v/, '')

console.log(`📦 Preparing release for version ${cleanVersion}`)

try {
  // Update manifest.json
  const manifestPath = resolve(__dirname, '../dist/manifest.json')
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  
  manifest.version = cleanVersion
  manifest.version_name = cleanVersion
  
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
  console.log('✅ Updated dist/manifest.json')

  // Update package.json
  const packagePath = resolve(__dirname, '../package.json')
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'))
  
  packageJson.version = cleanVersion
  
  writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n')
  console.log('✅ Updated package.json')

  // Update version.json in dist
  const versionJsonPath = resolve(__dirname, '../dist/src/version.json')
  const versionJson = {
    version: cleanVersion,
    buildDate: new Date().toISOString()
  }
  
  writeFileSync(versionJsonPath, JSON.stringify(versionJson, null, 2) + '\n')
  console.log('✅ Updated dist/src/version.json')

  console.log(`\n✨ Release ${cleanVersion} prepared successfully!`)
} catch (error) {
  console.error('❌ Error preparing release:', error.message)
  process.exit(1)
}
