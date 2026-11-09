export const APP_VERSION = __APP_VERSION__
export const BUILD_TIME = __BUILD_TIME__
const PREV_KEY = 'hamadrich:prevVersion'

export function versionLabel() {
  const d = new Date(BUILD_TIME)
  return `${APP_VERSION} · ${d.toLocaleDateString('he-IL')} ${d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`
}

/** reload into the new version, remembering which one we came from (for the "updated" toast) */
export function reloadIntoUpdate() {
  try { localStorage.setItem(PREV_KEY, APP_VERSION) } catch { /* private mode */ }
  location.reload()
}

/** after an auto-update reload: returns the new version once, else null */
export function takeJustUpdated(): string | null {
  try {
    const prev = localStorage.getItem(PREV_KEY)
    localStorage.removeItem(PREV_KEY)
    return prev && prev !== APP_VERSION ? APP_VERSION : null
  } catch { return null }
}

/** ask the browser to look for a newer deployment now */
export async function checkForUpdate(): Promise<void> {
  const r = await navigator.serviceWorker?.getRegistration()
  await r?.update()
}
