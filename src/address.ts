import { useEffect, useState } from 'react'
import { db, getSettings } from './db'

/** How the app speaks to the listener: masculine or feminine Hebrew forms (narration + UI). Voice is always the same woman. */
export type Address = 'm' | 'f'
const KEY = 'hamadrich:address'
let current: Address = (() => { try { return localStorage.getItem(KEY) === 'f' ? 'f' : 'm' } catch { return 'm' } })()
const listeners = new Set<(a: Address) => void>()

export const getAddress = () => current
export async function setAddress(a: Address) {
  current = a
  try { localStorage.setItem(KEY, a) } catch { /* private mode */ }
  listeners.forEach((l) => l(a))
  const s = await getSettings(); await db.settings.put({ ...s, address: a })
}
export function useAddress(): Address {
  const [a, setA] = useState(current)
  useEffect(() => { listeners.add(setA); return () => { listeners.delete(setA) } }, [])
  return a
}
/** pick the masculine or feminine form */
export const g = (a: Address, m: string, f: string) => (a === 'f' ? f : m)

/** true once the listener picked an address (first-run question on the start screen) */
export const hasChosenAddress = () => { try { return localStorage.getItem(KEY) !== null } catch { return true } }
