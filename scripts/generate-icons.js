// Simple script to generate placeholder PNG icons
// Run with: node scripts/generate-icons.js

import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { deflateSync } from 'zlib'

// Simple PNG generator
function createSimplePng(size) {
  // PNG header
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

  // IHDR chunk
  const width = size
  const height = size
  const ihdrData = Buffer.alloc(13)
  ihdrData.writeUInt32BE(width, 0)
  ihdrData.writeUInt32BE(height, 4)
  ihdrData.writeUInt8(8, 8) // bit depth
  ihdrData.writeUInt8(2, 9) // color type (RGB)
  ihdrData.writeUInt8(0, 10) // compression
  ihdrData.writeUInt8(0, 11) // filter
  ihdrData.writeUInt8(0, 12) // interlace

  // Create image data (simple blue bookmark icon)
  const rawData = []
  const centerX = width / 2
  const centerY = height / 2

  for (let y = 0; y < height; y++) {
    rawData.push(0) // filter byte
    for (let x = 0; x < width; x++) {
      // Create a simple bookmark shape (rectangle with triangle bottom)
      const margin = Math.floor(size * 0.15)
      const isInBookmark =
        x >= margin &&
        x < width - margin &&
        y >= margin &&
        (y < height - margin - size * 0.2 ||
         (y < height - margin && Math.abs(x - centerX) > (height - margin - y) * 0.7))

      if (isInBookmark) {
        // Blue color for bookmark
        rawData.push(59)  // R
        rawData.push(130) // G
        rawData.push(246) // B
      } else {
        // Transparent/white background
        rawData.push(255) // R
        rawData.push(255) // G
        rawData.push(255) // B
      }
    }
  }

  // Compress with zlib (deflate)
  const compressed = deflateSync(Buffer.from(rawData))

  // CRC32 implementation
  function crc32(data) {
    let crc = 0xffffffff
    const table = []
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      }
      table[n] = c
    }
    for (let i = 0; i < data.length; i++) {
      crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8)
    }
    return (crc ^ 0xffffffff) >>> 0
  }

  // Build PNG chunks
  function createChunk(type, data) {
    const typeBuffer = Buffer.from(type)
    const length = Buffer.alloc(4)
    length.writeUInt32BE(data.length, 0)
    const crcData = Buffer.concat([typeBuffer, data])
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(crcData), 0)
    return Buffer.concat([length, typeBuffer, data, crc])
  }

  const ihdr = createChunk('IHDR', ihdrData)
  const idat = createChunk('IDAT', compressed)
  const iend = createChunk('IEND', Buffer.alloc(0))

  return Buffer.concat([signature, ihdr, idat, iend])
}

// Create icons directory if needed
const iconsDir = 'icons'
if (!existsSync(iconsDir)) {
  mkdirSync(iconsDir, { recursive: true })
}

// Generate icons
const sizes = [16, 32, 48, 128]
sizes.forEach(size => {
  const png = createSimplePng(size)
  writeFileSync(`${iconsDir}/icon${size}.png`, png)
  console.log(`Created icon${size}.png`)
})

console.log('All icons generated!')
