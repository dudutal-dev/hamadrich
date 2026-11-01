import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'

// auto-update: when a new version is deployed, activate it and reload (never during a running journey)
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    const inJourney = document.body.dataset.journey === '1'
    if (inJourney) { window.addEventListener('hamadrich:idle', () => updateSW(true), { once: true }) } else { void updateSW(true) }
  },
})
// also check for updates whenever the app comes back to the foreground
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') navigator.serviceWorker?.getRegistration().then((r) => r?.update())
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
