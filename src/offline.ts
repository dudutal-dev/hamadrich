/** Built-in media (voice, breath, music, couple videos) lives in a permanent cache, filled file by file in the background.
 *  The service-worker update stays tiny (app shell only), so updates install reliably even on 4G;
 *  a failed file is simply retried next time. The same cache serves the files offline (CacheFirst in the SW). */
import { db } from './db'
import { isPsychedelicPrayers } from './engine/plan'

export const MEDIA_CACHE = 'hamadrich-media'
const url = (p: string) => new URL(`${import.meta.env.BASE_URL}${p}`, location.href).href

/** the Psychedelic Prayers visual journey (public/journey, ~85 MB) is only downloaded when that album is in the library */
async function mediaList(): Promise<string[]> {
  try {
    if ((await db.albums.toArray()).some(isPsychedelicPrayers)) return [...__MEDIA__, ...__JOURNEY__]
  } catch { /* no db yet */ }
  return __MEDIA__
}

export interface MediaProgress { have: number; total: number; running: boolean; failed: number }
let state: MediaProgress = { have: 0, total: __MEDIA__.length, running: false, failed: 0 }
const emit = () => window.dispatchEvent(new CustomEvent('hamadrich:media', { detail: { ...state } }))
export const mediaProgress = () => state

export async function countCachedMedia(): Promise<number> {
  if (!('caches' in window)) return 0
  const c = await caches.open(MEDIA_CACHE)
  const list = await mediaList()
  let have = 0
  for (const p of list) if (await c.match(url(p))) have++
  state = { ...state, have, total: list.length }; emit()
  return have
}

/** download every missing media file (3 at a time); safe to call repeatedly */
export async function downloadMedia(): Promise<void> {
  if (state.running || !('caches' in window) || !navigator.onLine) return
  const c = await caches.open(MEDIA_CACHE)
  const list = await mediaList()
  const missing: string[] = []
  for (const p of list) if (!(await c.match(url(p)))) missing.push(p)
  state = { have: list.length - missing.length, total: list.length, running: missing.length > 0, failed: 0 }; emit()
  let i = 0
  const worker = async () => {
    while (i < missing.length) {
      const p = missing[i++]
      try {
        const r = await fetch(url(p), { cache: 'no-store' })
        if (!r.ok) throw new Error(String(r.status))
        await c.put(url(p), r)
        state = { ...state, have: state.have + 1 }
      } catch { state = { ...state, failed: state.failed + 1 } }
      emit()
    }
  }
  await Promise.all([worker(), worker(), worker()])
  state = { ...state, running: false }; emit()
}
