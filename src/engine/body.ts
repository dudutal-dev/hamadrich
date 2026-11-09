import type { BreathPattern } from '../db'

/** Body & sexuality journeys: personal (solo), adults only. Level 2 involves self-touch and works directly with arousal. */
export interface BodyJourney {
  id: string
  level: 1 | 2 | 3
  title: string
  sub: string
  defaultMin: number
  minMin: number
  maxMin: number
  /** breath pattern for the release + return phases */
  breath: BreathPattern
  question: string
  /** level 3 (couples): ordered steps – clip, on-screen label, phase, and relative share of the free (music) time after it */
  steps?: CoupleStep[]
  /** built-in music loop per phase (public/music/<id>.mp3) */
  music: Record<1 | 2 | 3 | 4 | 5, string>
}
export interface CoupleStep { clip: string; label: string; phase: 1 | 2 | 3 | 4 | 5; w: number; breath?: BreathPattern }

export const BODY_JOURNEYS: BodyJourney[] = [
  { id: 'home', music: { 1: 'body-1a', 2: 'body-1a', 3: 'body-1b', 4: 'body-1b', 5: 'body-1b' }, level: 1, title: 'בית בגוף', sub: 'סריקת גוף. הגוף כבית, לא כמראה. מקום לעונג קטן.', defaultMin: 20, minMin: 15, maxMin: 40, breath: 'coherent', question: 'איפה בגוף הרגשתי הכי בבית?' },
  { id: 'desire', music: { 1: 'body-1a', 2: 'body-1a', 3: 'body-1b', 4: 'body-1b', 5: 'body-1b' }, level: 1, title: 'תשוקה ונוכחות', sub: 'נשימה לאגן. תשוקה כאנרגיה חיה, בלי מטרה.', defaultMin: 25, minMin: 15, maxMin: 40, breath: 'wave', question: 'מה הגוף שלי אוהב, שלא נתתי לו מקום?' },
  { id: 'shame', music: { 1: 'body-1a', 2: 'body-1a', 3: 'body-1b', 4: 'body-1b', 5: 'body-1b' }, level: 1, title: 'לשחרר בושה', sub: 'המסרים שקיבלנו על הגוף, והחזרה שלו אליך.', defaultMin: 25, minMin: 20, maxMin: 40, breath: 'coherent', question: 'מה הגוף שלי צריך לשמוע ממני?' },
  { id: 'touch', music: { 1: 'body-2a', 2: 'body-2a', 3: 'body-2b', 4: 'body-2b', 5: 'body-2b' }, level: 2, title: 'מגע מודע', sub: 'מגע עצמי איטי: ידיים, מפת הגוף, ובסוף מגע אינטימי – רק אם נכון.', defaultMin: 25, minMin: 20, maxMin: 45, breath: 'wave', question: 'איזה מגע הגוף שלי ביקש, שלא ידעתי?' },
  { id: 'fire', music: { 1: 'body-2a', 2: 'fire', 3: 'fire', 4: 'body-2b', 5: 'body-2b' }, level: 2, title: 'נשימת אש', sub: 'רצפת האגן, גל חום בעמוד השדרה, עוררות כאנרגיה שמתפשטת.', defaultMin: 20, minMin: 15, maxMin: 35, breath: 'wave', question: 'איפה הרגשתי את האנרגיה, ולאן היא רצתה לזרום?' },
  { id: 'pleasure', music: { 1: 'body-2a', 2: 'body-2a', 3: 'body-2b', 4: 'body-2b', 5: 'body-2b' }, level: 2, title: 'עונג בלי יעד', sub: 'עונג עצמי מודע: האטה, גלים של עלייה ומנוחה, בלי שיא כמטרה.', defaultMin: 30, minMin: 20, maxMin: 50, breath: 'wave', question: 'מה השתנה כשהאטתי?' },
  { id: 'breathe2', music: { 1: 'couple-a', 2: 'couple-a', 3: 'couple-b', 4: 'couple-b', 5: 'couple-b' }, level: 3, title: 'נשימה משותפת', sub: 'מבט בעיניים, נשימה מסונכרנת, יד על הלב, מילים טובות.', defaultMin: 25, minMin: 20, maxMin: 40, breath: 'wave', question: 'מה הרגשנו כשהנשימות נפגשו?', steps: [
    { clip: 'c-b-open', label: 'שניכם · מול זה מול זו', phase: 1, w: 1 },
    { clip: 'c-b-gaze', label: 'שניכם · מבט בעיניים', phase: 1, w: 5 },
    { clip: 'c-b-sync', label: 'שניכם · נשימה משותפת', phase: 2, w: 6, breath: 'wave' },
    { clip: 'c-b-him-heart', label: 'הוא · יד על הלב שלה', phase: 2, w: 4, breath: 'wave' },
    { clip: 'c-b-her-heart', label: 'היא · יד על הלב שלו', phase: 3, w: 4, breath: 'wave' },
    { clip: 'c-b-peak', label: 'שניכם · שתיקה משותפת', phase: 3, w: 9 },
    { clip: 'c-b-him-words', label: 'הוא מדבר', phase: 4, w: 2 },
    { clip: 'c-b-her-words', label: 'היא מדברת', phase: 4, w: 2 },
    { clip: 'c-b-close', label: 'שניכם · חיבוק', phase: 5, w: 2 },
  ] },
  { id: 'listen', music: { 1: 'couple-a', 2: 'couple-a', 3: 'couple-a', 4: 'couple-b', 5: 'couple-b' }, level: 3, title: 'מגע שמקשיב', sub: 'מגע בתורות: היא מקבלת והוא נותן, ואז מחליפים. יותר · פחות · בדיוק.', defaultMin: 45, minMin: 30, maxMin: 70, breath: 'none', question: 'מה למדנו על המגע שכל אחד מאיתנו אוהב?', steps: [
    { clip: 'c-l-open', label: 'שניכם · פתיחה', phase: 1, w: 0.3 },
    { clip: 'c-l-stop', label: 'שניכם · מילת עצירה', phase: 1, w: 0.4 },
    { clip: 'c-l-feedback', label: 'יותר · פחות · בדיוק', phase: 1, w: 0.2 },
    { clip: 'c-l-her-receive', label: 'היא מקבלת · הוא נותן', phase: 2, w: 0.1 },
    { clip: 'c-l-him-give', label: 'היא מקבלת · הוא נותן', phase: 2, w: 5 },
    { clip: 'c-l-check', label: 'היא מקבלת · הוא נותן', phase: 2, w: 3 },
    { clip: 'c-l-swap', label: 'החלפה', phase: 2, w: 0.3 },
    { clip: 'c-l-him-receive', label: 'הוא מקבל · היא נותנת', phase: 3, w: 0.1 },
    { clip: 'c-l-her-give', label: 'הוא מקבל · היא נותנת', phase: 3, w: 5 },
    { clip: 'c-l-check', label: 'הוא מקבל · היא נותנת', phase: 3, w: 3 },
    { clip: 'c-l-round2', label: 'סבב שני · היא מקבלת', phase: 3, w: 5 },
    { clip: 'c-l-swap', label: 'סבב שני · הוא מקבל', phase: 4, w: 5 },
    { clip: 'c-l-share', label: 'שניכם · שיתוף', phase: 5, w: 3 },
    { clip: 'c-l-close', label: 'שניכם', phase: 5, w: 0.5 },
  ] },
  { id: 'desire2', music: { 1: 'groove', 2: 'groove', 3: 'couple-a', 4: 'couple-b', 5: 'couple-b' }, level: 3, title: 'ערב של תשוקה', sub: 'טקס פתיחה, ריקוד איטי, מגע בתורות ומגע משותף – ואז "מכאן זה שלכם".', defaultMin: 60, minMin: 40, maxMin: 90, breath: 'none', question: 'מה נרצה להביא איתנו לערב הבא?', steps: [
    { clip: 'c-d-open', label: 'שניכם · טקס פתיחה', phase: 1, w: 1 },
    { clip: 'c-d-dance', label: 'שניכם · ריקוד איטי', phase: 1, w: 2 },
    { clip: 'c-d-him-lead', label: 'הוא מוביל', phase: 2, w: 2 },
    { clip: 'c-d-her-lead', label: 'היא מובילה', phase: 2, w: 2 },
    { clip: 'c-d-her-touch', label: 'היא נוגעת · הוא מקבל', phase: 2, w: 4 },
    { clip: 'c-d-him-touch', label: 'הוא נוגע · היא מקבלת', phase: 3, w: 4 },
    { clip: 'c-d-check', label: 'שניכם · בדיקה', phase: 3, w: 0.5 },
    { clip: 'c-d-mutual', label: 'שניכם · מגע משותף', phase: 3, w: 4 },
    { clip: 'c-d-him-slow', label: 'הוא · להאט', phase: 4, w: 2 },
    { clip: 'c-d-her-wide', label: 'היא · להתרחב', phase: 4, w: 2 },
    { clip: 'c-d-yours', label: 'מכאן זה שלכם', phase: 5, w: 14 },
  ] },
]
export const bodyJourney = (id?: string) => BODY_JOURNEYS.find((j) => j.id === id)

/** level-2 gate: confirmed adult + private place (kept on this device) */
const ADULT_KEY = 'hamadrich:adult'
export const isAdultUnlocked = () => { try { return localStorage.getItem(ADULT_KEY) === '1' } catch { return false } }
export const unlockAdult = () => { try { localStorage.setItem(ADULT_KEY, '1') } catch { /* private mode */ } }

/** level-3 gate: both partners adult, consenting, private place */
const COUPLE_KEY = 'hamadrich:couple'
export const isCoupleUnlocked = () => { try { return localStorage.getItem(COUPLE_KEY) === '1' } catch { return false } }
export const unlockCouple = () => { try { localStorage.setItem(COUPLE_KEY, '1') } catch { /* private mode */ } }

export const MUSIC_TITLES: Record<string, string> = {
  'body-1a': 'אמביינט חם', 'body-1b': 'מרחב עמוק', 'body-2a': 'חושני · דופק איטי', 'body-2b': 'חושני · עמוק',
  fire: 'תוף טקסי', 'couple-a': 'אינטימי', 'couple-b': 'לילה', groove: 'גרוב איטי',
}
