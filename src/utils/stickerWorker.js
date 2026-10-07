import { preload, removeBackground } from '@imgly/background-removal'

// Runs in a web worker (see makeSticker.js) so the app keeps animating while the model works.
// Turns a drink photo into a die-cut sticker: the background is removed, the drink is centred
// on a square canvas and gets a white outline, like the stickers in src/assets/drinks/.
// The model is downloaded once from the library's CDN and then cached by the browser.

const CONFIG = { model: 'isnet_quint8', output: { format: 'image/png' } }
const SIZE = 500 // same size as the hand-made stickers
const OUTLINE = 9 // white edge around the cut-out, in px
const PAD = OUTLINE + 8
const SOLID = 110 // alpha above this counts as part of the drink

let warm = null
const warmUp = () => (warm ??= preload(CONFIG).catch(() => {}))

self.onmessage = async ({ data: { id, type, photo } }) => {
  try {
    if (type === 'warm') {
      await warmUp()
      return
    }
    await warmUp()
    self.postMessage({ id, sticker: await dieCut(await removeBackground(photo, CONFIG)) })
  } catch (error) {
    self.postMessage({ id, error: String(error?.message ?? error) })
  }
}

async function dieCut(cutoutBlob) {
  const cutout = await createImageBitmap(cutoutBlob)
  const box = solidBounds(cutout)
  if (!box) throw new Error('No drink found in the photo')

  // fit the drink into the square, leaving room for the outline
  const scale = Math.min((SIZE - PAD * 2) / box.width, (SIZE - PAD * 2) / box.height)
  const w = box.width * scale
  const h = box.height * scale
  const x = (SIZE - w) / 2
  const y = (SIZE - h) / 2

  // the drink's silhouette in white, from the solid part only so the edge stays clean
  const shape = new OffscreenCanvas(SIZE, SIZE)
  const sg = shape.getContext('2d')
  sg.drawImage(cutout, box.x, box.y, box.width, box.height, x, y, w, h)
  const pixels = sg.getImageData(0, 0, SIZE, SIZE)
  const d = pixels.data
  for (let i = 0; i < d.length; i += 4) {
    d[i] = d[i + 1] = d[i + 2] = 255
    d[i + 3] = d[i + 3] > SOLID ? 255 : 0
  }
  sg.putImageData(pixels, 0, 0)

  // stamp the silhouette in a ring to grow it into the outline, then put the drink on top
  const out = new OffscreenCanvas(SIZE, SIZE)
  const og = out.getContext('2d')
  for (let a = 0; a < 360; a += 15) {
    const r = (a * Math.PI) / 180
    og.drawImage(shape, Math.cos(r) * OUTLINE, Math.sin(r) * OUTLINE)
  }
  og.drawImage(shape, 0, 0)
  og.drawImage(cutout, box.x, box.y, box.width, box.height, x, y, w, h)
  return out.convertToBlob({ type: 'image/png' })
}

// smallest rectangle that holds every solid pixel of the cut-out
function solidBounds(bitmap) {
  const c = new OffscreenCanvas(bitmap.width, bitmap.height)
  const g = c.getContext('2d', { willReadFrequently: true })
  g.drawImage(bitmap, 0, 0)
  const { data, width, height } = g.getImageData(0, 0, c.width, c.height)
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      if (data[(py * width + px) * 4 + 3] > SOLID) {
        if (px < minX) minX = px
        if (px > maxX) maxX = px
        if (py < minY) minY = py
        if (py > maxY) maxY = py
      }
    }
  }
  if (maxX < 0) return null
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
}
