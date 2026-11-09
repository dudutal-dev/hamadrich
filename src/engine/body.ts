import type { BreathPattern } from '../db'

/** Body & sexuality journeys: personal (solo), adults only. Level 2 involves self-touch and works directly with arousal. */
export interface BodyJourney {
  id: string
  level: 1 | 2
  title: string
  sub: string
  defaultMin: number
  minMin: number
  maxMin: number
  /** breath pattern for the release + return phases */
  breath: BreathPattern
  question: string
}

export const BODY_JOURNEYS: BodyJourney[] = [
  { id: 'home', level: 1, title: 'בית בגוף', sub: 'סריקת גוף. הגוף כבית, לא כמראה. מקום לעונג קטן.', defaultMin: 20, minMin: 15, maxMin: 40, breath: 'coherent', question: 'איפה בגוף הרגשתי הכי בבית?' },
  { id: 'desire', level: 1, title: 'תשוקה ונוכחות', sub: 'נשימה לאגן. תשוקה כאנרגיה חיה, בלי מטרה.', defaultMin: 25, minMin: 15, maxMin: 40, breath: 'wave', question: 'מה הגוף שלי אוהב, שלא נתתי לו מקום?' },
  { id: 'shame', level: 1, title: 'לשחרר בושה', sub: 'המסרים שקיבלנו על הגוף, והחזרה שלו אליך.', defaultMin: 25, minMin: 20, maxMin: 40, breath: 'coherent', question: 'מה הגוף שלי צריך לשמוע ממני?' },
  { id: 'touch', level: 2, title: 'מגע מודע', sub: 'מגע עצמי איטי: ידיים, מפת הגוף, ובסוף מגע אינטימי – רק אם נכון.', defaultMin: 25, minMin: 20, maxMin: 45, breath: 'wave', question: 'איזה מגע הגוף שלי ביקש, שלא ידעתי?' },
  { id: 'fire', level: 2, title: 'נשימת אש', sub: 'רצפת האגן, גל חום בעמוד השדרה, עוררות כאנרגיה שמתפשטת.', defaultMin: 20, minMin: 15, maxMin: 35, breath: 'wave', question: 'איפה הרגשתי את האנרגיה, ולאן היא רצתה לזרום?' },
  { id: 'pleasure', level: 2, title: 'עונג בלי יעד', sub: 'עונג עצמי מודע: האטה, גלים של עלייה ומנוחה, בלי שיא כמטרה.', defaultMin: 30, minMin: 20, maxMin: 50, breath: 'wave', question: 'מה השתנה כשהאטתי?' },
]
export const bodyJourney = (id?: string) => BODY_JOURNEYS.find((j) => j.id === id)

/** level-2 gate: confirmed adult + private place (kept on this device) */
const ADULT_KEY = 'hamadrich:adult'
export const isAdultUnlocked = () => { try { return localStorage.getItem(ADULT_KEY) === '1' } catch { return false } }
export const unlockAdult = () => { try { localStorage.setItem(ADULT_KEY, '1') } catch { /* private mode */ } }
