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
    if (r) setInterval(() => { if (document.visibilityState === 'visible') void r.update() }, 30 * 60 * 1000)
  },
})
// look for updates every time the app is opened / comes back to the foreground
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') void checkForUpdate()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
