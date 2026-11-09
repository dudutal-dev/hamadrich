/** Built-in media (voice, breath, music, couple illustrations ≈ 53 MB) lives in a permanent cache, filled file by file in the background.
 *  The service-worker update stays tiny (app shell only), so updates install reliably even on 4G;
 *  a failed file is simply retried next time. The same cache serves the files offline (CacheFirst in the SW). */
export const MEDIA_CACHE = 'hamadrich-media'
const url = (p: string) => new URL(`${import.meta.env.BASE_URL}${p}`, location.href).href

export interface MediaProgress { have: number; total: number; running: boolean; failed: number }
let state: MediaProgress = { have: 0, total: __MEDIA__.length, running: false, failed: 0 }
const emit = () => window.dispatchEvent(new CustomEvent('hamadrich:media', { detail: { ...state } }))
export const mediaProgress = () => state

export async function countCachedMedia(): Promise<number> {
  if (!('caches' in window)) return 0
  const c = await caches.open(MEDIA_CACHE)
  let have = 0
  for (const p of __MEDIA__) if (await c.match(url(p))) have++
  state = { ...state, have }; emit()
  return have
}

/** download every missing media file (3 at a time); safe to call repeatedly */
export async function downloadMedia(): Promise<void> {
  if (state.running || !('caches' in window) || !navigator.onLine) return
  const c = await caches.open(MEDIA_CACHE)
  const missing: string[] = []
  for (const p of __MEDIA__) if (!(await c.match(url(p)))) missing.push(p)
  state = { have: __MEDIA__.length - missing.length, total: __MEDIA__.length, running: missing.length > 0, failed: 0 }; emit()
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
