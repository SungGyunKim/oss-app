import { nativeImage, NativeImage } from 'electron'
import { deflateSync } from 'zlib'
import { getWindow } from './window-manager'

let unreadCount = 0

export function incrementUnread(): void {
  unreadCount++
  updateBadgeUI()
}

export function resetUnread(): void {
  if (unreadCount === 0) return
  unreadCount = 0
  updateBadgeUI()
}

function updateBadgeUI(): void {
  const mainWin = getWindow('main')

  if (unreadCount > 0) {
    const overlay = createBadgeOverlay(unreadCount)
    mainWin?.setOverlayIcon(overlay, `${unreadCount}개의 새 메시지`)
  } else {
    mainWin?.setOverlayIcon(null, '')
  }
}

// -- Badge overlay (16x16 red circle + white number) for taskbar --

function createBadgeOverlay(count: number): NativeImage {
  const size = 16
  const pixels = Buffer.alloc(size * size * 4, 0)
  const text = count > 99 ? '99+' : String(count)
  const scale = text.length > 2 ? 1 : 2

  fillCircle(pixels, size, size / 2, size / 2, size / 2 - 0.5, 237, 28, 36)
  drawTextCentered(pixels, size, text, scale)

  return nativeImage.createFromBuffer(encodePNG(size, size, pixels))
}

// -- Pixel drawing --

function fillCircle(
  pixels: Buffer,
  imgSize: number,
  cx: number,
  cy: number,
  r: number,
  red: number,
  green: number,
  blue: number
): void {
  const rSq = r * r
  for (let y = 0; y < imgSize; y++) {
    for (let x = 0; x < imgSize; x++) {
      const dx = x + 0.5 - cx
      const dy = y + 0.5 - cy
      if (dx * dx + dy * dy <= rSq) {
        const idx = (y * imgSize + x) * 4
        pixels[idx] = red
        pixels[idx + 1] = green
        pixels[idx + 2] = blue
        pixels[idx + 3] = 255
      }
    }
  }
}

// 3x5 bitmap font for digits and +
const GLYPH: Record<string, number[]> = {
  '0': [1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1],
  '1': [0, 1, 0, 1, 1, 0, 0, 1, 0, 0, 1, 0, 1, 1, 1],
  '2': [1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1],
  '3': [1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1],
  '4': [1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 0, 1, 0, 0, 1],
  '5': [1, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 1],
  '6': [1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1],
  '7': [1, 1, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0],
  '8': [1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1],
  '9': [1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1],
  '+': [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0]
}
const GLYPH_W = 3
const GLYPH_H = 5

function drawTextCentered(pixels: Buffer, imgSize: number, text: string, scale: number = 1): void {
  const totalW = text.length * (GLYPH_W + 1) * scale - scale
  drawTextAt(pixels, imgSize, text, imgSize / 2, imgSize / 2, scale, totalW)
}

function drawTextAt(
  pixels: Buffer,
  imgSize: number,
  text: string,
  cx: number,
  cy: number,
  scale: number = 1,
  totalW?: number
): void {
  const tw = totalW ?? text.length * (GLYPH_W + 1) * scale - scale
  const startX = Math.round(cx - tw / 2)
  const startY = Math.round(cy - (GLYPH_H * scale) / 2)

  let offsetX = startX
  for (const ch of text) {
    const glyph = GLYPH[ch]
    if (!glyph) continue
    for (let gy = 0; gy < GLYPH_H; gy++) {
      for (let gx = 0; gx < GLYPH_W; gx++) {
        if (glyph[gy * GLYPH_W + gx]) {
          for (let sy = 0; sy < scale; sy++) {
            for (let sx = 0; sx < scale; sx++) {
              const px = offsetX + gx * scale + sx
              const py = startY + gy * scale + sy
              if (px >= 0 && px < imgSize && py >= 0 && py < imgSize) {
                const idx = (py * imgSize + px) * 4
                pixels[idx] = 255
                pixels[idx + 1] = 255
                pixels[idx + 2] = 255
                pixels[idx + 3] = 255
              }
            }
          }
        }
      }
    }
    offsetX += (GLYPH_W + 1) * scale
  }
}

// -- Minimal PNG encoder (no external dependencies) --

const CRC_TABLE = new Uint32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  }
  CRC_TABLE[n] = c
}

function crc32(buf: Buffer): number {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeBytes = Buffer.from(type, 'ascii')
  const body = Buffer.concat([typeBytes, data])
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crcBuf])
}

function encodePNG(width: number, height: number, rgba: Buffer): Buffer {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

  const ihdrData = Buffer.alloc(13)
  ihdrData.writeUInt32BE(width, 0)
  ihdrData.writeUInt32BE(height, 4)
  ihdrData[8] = 8
  ihdrData[9] = 6
  ihdrData[10] = 0
  ihdrData[11] = 0
  ihdrData[12] = 0

  const rowBytes = 1 + width * 4
  const raw = Buffer.alloc(height * rowBytes)
  for (let y = 0; y < height; y++) {
    raw[y * rowBytes] = 0 // None filter
    rgba.copy(raw, y * rowBytes + 1, y * width * 4, (y + 1) * width * 4)
  }

  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdrData),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0))
  ])
}
