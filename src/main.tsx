import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'
import { checkForUpdate, reloadIntoUpdate } from './version'

// Auto-update: a new deployment installs in the background and activates by itself.
// The page then reloads into it – but never in the middle of a journey (waits until the journey ends).
registerSW({
  immediate: true,
  onNeedReload() {
    if (document.body.dataset.journey === '1') window.addEventListener('hamadrich:idle', reloadIntoUpdate, { once: true })
    else reloadIntoUpdate()
  },
  onRegisteredSW(_url, r) {
    if (!r) return
    setInterval(() => { if (document.visibilityState === 'visible') void r.update() }, 30 * 60 * 1000)
    // tell the UI while a new version downloads (it is large: voice + music), so the listener keeps the app open
    const say = (state: 'downloading' | 'done' | 'failed') => window.dispatchEvent(new CustomEvent('hamadrich:update', { detail: state }))
    const watch = (w: ServiceWorker | null) => {
      if (!w) return
      say('downloading')
      w.addEventListener('statechange', () => { if (w.state === 'installed' || w.state === 'activated') say('done'); if (w.state === 'redundant') say('failed') })
    }
    if (r.installing) watch(r.installing)
    r.addEventListener('updatefound', () => watch(r.installing))
  },
})
// keep the app's files (voice, breath, music) permanently: ask the browser not to evict our storage under pressure
void navigator.storage?.persist?.().catch(() => false)

// look for updates every time the app is opened / comes back to the foreground
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') void checkForUpdate()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
