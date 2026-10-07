// Turns a drink photo (Blob) into a die-cut sticker (PNG Blob). The work happens in
// stickerWorker.js so the page stays smooth; this file only talks to that worker.

let worker = null
let nextId = 0
const pending = new Map()

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL('./stickerWorker.js', import.meta.url), { type: 'module' })
    worker.onmessage = ({ data: { id, sticker, error } }) => {
      const job = pending.get(id)
      if (!job) return
      pending.delete(id)
      if (sticker) job.resolve(sticker)
      else job.reject(new Error(error))
    }
    // the worker could not start (old browser, blocked script…): every waiting photo falls back
    worker.onerror = () => {
      pending.forEach((job) => job.reject(new Error('Sticker maker unavailable')))
      pending.clear()
    }
  }
  return worker
}

// start downloading the model early (when the add screen opens) so the cut-out is quick
export function warmUpStickerMaker() {
  getWorker().postMessage({ type: 'warm' })
}

export function makeSticker(photo) {
  const id = ++nextId
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    getWorker().postMessage({ id, type: 'make', photo })
  })
}
