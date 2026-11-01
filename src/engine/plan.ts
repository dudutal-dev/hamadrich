import { type Album, type Asset, type BreathPattern, type Cue, type Mode, type Phase, type PhaseSpan, type SessionPlan, type TextItem, uid } from '../db'

export const PHASE_NAMES: Record<Phase, string> = {
  1: 'הגעה',
  2: 'שחרור',
  3: 'שיא',
  4: 'חזרה',
  5: 'אינטגרציה',
}

/** primary (deep) and secondary (bright) color per phase */
export const PHASE_COLORS: Record<Phase, string> = {
  1: '#2F5FE0', // הגעה – כחול חשמלי
  2: '#19B8A6', // שחרור – טורקיז
  3: '#7B2FD6', // שיא – סגול
  4: '#E8842E', // חזרה – כתום-ענבר
  5: '#E3B341', // אינטגרציה – זהב
}
export const PHASE_COLORS2: Record<Phase, string> = {
  1: '#8FD3FF',
  2: '#9FF5D8',
  3: '#FF5FC8',
  4: '#FFD08A',
  5: '#FFF2B8',
}

export const MODE_META: Record<Mode, { name: string; sub: string; defaultMin: number; minMin: number; maxMin: number }> = {
  breath: { name: 'נשימה', sub: 'פתיחת יום, איפוס, לפני שינה', defaultMin: 15, minMin: 5, maxMin: 30 },
  meditation: { name: 'מדיטציה', sub: 'ישיבה יומית, שתיקות ארוכות', defaultMin: 35, minMin: 20, maxMin: 60 },
  deep: { name: 'מסע עמוק', sub: 'חמישה שלבים מלאים, עיניים עצומות', defaultMin: 90, minMin: 45, maxMin: 120 },
  sleep: { name: 'שינה', sub: 'דעיכה הדרגתית לשקט', defaultMin: 30, minMin: 15, maxMin: 45 },
  album: { name: 'תפילות פסיכדליות', sub: 'האלבום כמסע שלם, 55 רצועות', defaultMin: 93, minMin: 30, maxMin: 93 },
}

export const INTENTIONS = ['שקט', 'שחרור', 'בהירות', 'ריפוי', 'חיבור', 'הודיה']

export const INTENTION_META: Record<string, { icon: string; sub: string; how: string }> = {
  'שקט': { icon: '◯', sub: 'להשקיט את הרעש', how: 'טקסטים על נוכחות והתמקמות; המוזיקה שטוחה ורחבה; יותר שתיקות' },
  'שחרור': { icon: '〰', sub: 'להניח מה שאוחז', how: 'דגש על שלב השחרור; טקסטים על חלוף הדברים והנחה; נשימה קוהרנטית ארוכה' },
  'בהירות': { icon: '◇', sub: 'לראות ברור', how: 'טקסטים שמכוונים שאלה אחת לשיא; פחות דיבור בשיא; שאלת אינטגרציה ממוקדת' },
  'ריפוי': { icon: '✦', sub: 'לתת לגוף לעבוד', how: 'טקסטים על הגוף, חום וכבדות; חזרה איטית ומוארכת עם עוגנים בגוף' },
  'חיבור': { icon: '∞', sub: 'להיות חלק', how: 'טקסטים על אחדות ונשימה משותפת; שיא רחב ופתוח; פחות הנחיה' },
  'הודיה': { icon: '☼', sub: 'לזכור את הטוב', how: 'אינטגרציה ארוכה יותר; סיום בהודיה; צבעי זהב בחזרה' },
}

export const MODE_LONG: Record<Mode, { what: string; when: string; phases: string }> = {
  breath: { what: 'סשן קצר שבנוי כולו סביב הנשימה: שאיפה, החזקה, נשיפה – האורב והרטט מובילים.', when: 'פתיחת יום, איפוס באמצע יום, לפני שינה, לפני פגישה חשובה.', phases: 'הגעה קצרה → שחרור ארוך עם 4-7-8 → נשימה קוהרנטית → חזרה' },
  meditation: { what: 'ישיבה שקטה עם קריינות בתחילת ובסוף כל שלב ושתיקות ארוכות ביניהן.', when: 'תרגול יומי, לפני/אחרי טאי צ\'י, Gateway, ערב שקט.', phases: 'חמישה שלבים, השיא כמעט ללא מילים' },
  deep: { what: 'מסע מלא של שעה עד שעתיים: כל חמשת השלבים, קריינות עברית לפי הכוונה, שיא ארוך ושקט, חזרה הדרגתית, אינטגרציה ויומן.', when: 'סשן עצמאי בעיניים עצומות, בשכיבה, בלי הפרעות. כפתור חירום פעיל.', phases: 'הגעה 10% → שחרור 20% → שיא 35% → חזרה 25% → אינטגרציה 10%' },
  sleep: { what: 'דעיכה הדרגתית לשקט, בלי שלב חזרה ובלי קריינות בסוף – האפליקציה נכבית לבד.', when: 'הירדמות.', phases: 'הגעה → שחרור → שיא שהולך ונעלם' },
  album: { what: 'האלבום Psychedelic Prayers כמסע שלם: 55 הרצועות בסדר המקורי, ממופות לחמשת השלבים, עם נשימה, אורב ויומן.', when: 'כשרוצים את הקול של סוסייה ואת המוזיקה של Desert Dwellers בלי להתעסק בנגן.', phases: 'רצועות 1–4 הגעה · 5–15 שחרור · 16–32 שיא · 33–49 חזרה · 50–55 אינטגרציה' },
}

/** phase shares per mode (sum = 1) */
const SHARES: Record<Exclude<Mode, 'album'>, Record<Phase, number>> = {
  deep: { 1: 0.10, 2: 0.20, 3: 0.35, 4: 0.25, 5: 0.10 },
  meditation: { 1: 0.12, 2: 0.22, 3: 0.32, 4: 0.22, 5: 0.12 },
  breath: { 1: 0.15, 2: 0.35, 3: 0.10, 4: 0.25, 5: 0.15 },
  sleep: { 1: 0.15, 2: 0.35, 3: 0.50, 4: 0, 5: 0 },
}

const BREATH_BY_PHASE: Record<Phase, BreathPattern> = { 1: '478', 2: 'coherent', 3: 'none', 4: 'coherent', 5: 'none' }

export function buildPhases(mode: Mode, durationSec: number): PhaseSpan[] {
  const shares = SHARES[mode as Exclude<Mode, 'album'>] ?? SHARES.deep
  const spans: PhaseSpan[] = []
  let t = 0
  for (const n of [1, 2, 3, 4, 5] as Phase[]) {
    const len = Math.round(durationSec * shares[n])
    if (len <= 0) continue
    spans.push({ n, startSec: t, endSec: t + len })
    t += len
  }
  if (spans.length) spans[spans.length - 1].endSec = durationSec
  return spans
}

interface BuildInput {
  mode: Mode
  durationSec: number
  intention: string
  texts: TextItem[]
  musicAssets: Asset[]
  album?: Album
  albumTracks?: Asset[]
  voiceEnabled: boolean
  breathEnabled: boolean
}

/** Pick texts for a phase, preferring intention match; returns ids in order */
function pickTexts(texts: TextItem[], phase: Phase, intention: string, count: number): TextItem[] {
  const pool = texts.filter((t) => t.phases.includes(phase) && t.voiceAssetId)
  const scored = pool
    .map((t) => ({ t, s: (t.intentions.includes(intention) ? 2 : 0) + Math.random() }))
    .sort((a, b) => b.s - a.s)
  return scored.slice(0, count).map((x) => x.t)
}

export function buildPlan(input: BuildInput): SessionPlan {
  const { mode, intention } = input
  if (mode === 'album' && input.album && input.albumTracks?.length) return buildAlbumPlan(input)

  const durationSec = input.durationSec
  const phases = buildPhases(mode, durationSec)
  const cues: Cue[] = []

  for (const span of phases) {
    cues.push({ t: span.startSec, layer: 'visual', action: 'phase', phase: span.n })
    // music: one asset per phase if available, else drone handled by engine
    const m = input.musicAssets.filter((a) => a.phases.includes(span.n))
    if (m.length) {
      const pick = m[Math.floor(Math.random() * m.length)]
      cues.push({ t: span.startSec, layer: 'music', action: 'play', asset: pick.id })
    } else {
      cues.push({ t: span.startSec, layer: 'music', action: 'play' }) // drone
    }
    // breath
    const bp = input.breathEnabled && mode !== 'sleep' ? BREATH_BY_PHASE[span.n] : 'none'
    cues.push({ t: span.startSec, layer: 'breath', action: 'pattern', pattern: mode === 'breath' && span.n === 3 ? 'coherent' : bp })

    // voice
    if (input.voiceEnabled && span.n !== 5) {
      const len = span.endSec - span.startSec
      const silenceLead = span.n === 3 || span.n === 4 ? 180 : 20
      let n = 1
      if (span.n === 3) n = Math.max(1, Math.floor((len - silenceLead) / 420))
      else if (len > 600) n = 2
      const chosen = pickTexts(input.texts, span.n, intention, n)
      chosen.forEach((tx, i) => {
        const t = span.n === 3
          ? span.startSec + silenceLead + i * 420
          : i === 0 ? span.startSec + silenceLead : span.endSec - tx.estSec - 30
        if (t + tx.estSec < span.endSec) cues.push({ t, layer: 'voice', action: 'play', asset: tx.voiceAssetId, duck: -6 })
      })
    }
    if (span.n === 5 && input.voiceEnabled) {
      const [tx] = pickTexts(input.texts, 5, intention, 1)
      if (tx) cues.push({ t: span.startSec + 10, layer: 'voice', action: 'play', asset: tx.voiceAssetId, duck: -6 })
    }
  }
  cues.sort((a, b) => a.t - b.t)
  return { id: uid(), mode, intention, durationSec, phases, cues, createdAt: new Date().toISOString() }
}

/** Album mode: tracks play in order, phases follow the album's phaseMap; duration can shorten by skipping tracks */
function buildAlbumPlan(input: BuildInput): SessionPlan {
  const album = input.album!
  const tracks = [...input.albumTracks!].sort((a, b) => (a.trackNo ?? 0) - (b.trackNo ?? 0))
  const target = input.durationSec
  const total = tracks.reduce((s, t) => s + t.durationSec, 0)

  // if shortening: keep tracks proportionally per phase
  let selected = tracks
  if (target < total - 30) {
    const ratio = target / total
    const byPhase = new Map<Phase, Asset[]>()
    for (const t of tracks) {
      const p = album.phaseMap[t.trackNo ?? 0] ?? 3
      byPhase.set(p, [...(byPhase.get(p) ?? []), t])
    }
    selected = []
    for (const [, list] of byPhase) {
      const keep = Math.max(1, Math.round(list.length * ratio))
      const step = list.length / keep
      for (let i = 0; i < keep; i++) selected.push(list[Math.min(list.length - 1, Math.floor(i * step))])
    }
    selected.sort((a, b) => (a.trackNo ?? 0) - (b.trackNo ?? 0))
  }

  const cues: Cue[] = []
  const phases: PhaseSpan[] = []
  let t = 0
  let curPhase: Phase | null = null
  for (const tr of selected) {
    const p = album.phaseMap[tr.trackNo ?? 0] ?? 3
    if (p !== curPhase) {
      if (curPhase !== null) phases[phases.length - 1].endSec = t
      phases.push({ n: p, startSec: t, endSec: t })
      cues.push({ t, layer: 'visual', action: 'phase', phase: p })
      cues.push({ t, layer: 'breath', action: 'pattern', pattern: input.breathEnabled && (p === 1 || p === 2 || p === 4) ? (p === 1 ? '478' : 'coherent') : 'none' })
      curPhase = p
    }
    cues.push({ t, layer: 'music', action: 'play', asset: tr.id })
    t += tr.durationSec
  }
  if (phases.length) phases[phases.length - 1].endSec = t
  return { id: uid(), mode: 'album', intention: input.intention, durationSec: Math.round(t), phases, cues, albumId: album.id, createdAt: new Date().toISOString() }
}

/** default phase map for the Psychedelic Prayers album (55 tracks) */
export function defaultAlbumPhaseMap(trackCount: number): Record<number, Phase> {
  const map: Record<number, Phase> = {}
  if (trackCount === 55) {
    for (let i = 1; i <= 55; i++) {
      map[i] = i <= 4 ? 1 : i <= 15 ? 2 : i <= 32 ? 3 : i <= 49 ? 4 : 5
    }
    return map
  }
  const shares = SHARES.deep
  let acc = 0
  const bounds: number[] = []
  for (const n of [1, 2, 3, 4, 5] as Phase[]) { acc += shares[n]; bounds.push(Math.round(acc * trackCount)) }
  for (let i = 1; i <= trackCount; i++) {
    map[i] = i <= bounds[0] ? 1 : i <= bounds[1] ? 2 : i <= bounds[2] ? 3 : i <= bounds[3] ? 4 : 5
  }
  return map
}

export function phaseAt(plan: SessionPlan, t: number): PhaseSpan {
  return plan.phases.find((p) => t >= p.startSec && t < p.endSec) ?? plan.phases[plan.phases.length - 1]
}
