import { breathWindowsFor } from './albumBreath'
import { type Address, VOICE_CLIPS, clipDur } from './voice'
import { type Album, type Asset, type BreathPattern, type Cue, type Mode, type Phase, type PhaseSpan, type SessionPlan, uid } from '../db'

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
  3: '#5B4BC4', // שיא – אינדיגו
  4: '#E8842E', // חזרה – כתום-ענבר
  5: '#E3B341', // אינטגרציה – זהב
}
export const PHASE_COLORS2: Record<Phase, string> = {
  1: '#8FD3FF',
  2: '#9FF5D8',
  3: '#C9BBFF',
  4: '#FFD08A',
  5: '#FFF2B8',
}

export const MODE_META: Record<Mode, { name: string; sub: string; defaultMin: number; minMin: number; maxMin: number }> = {
  breath: { name: 'נשימה', sub: 'פתיחת יום, איפוס, לפני שינה', defaultMin: 15, minMin: 5, maxMin: 30 },
  meditation: { name: 'מדיטציה', sub: 'ישיבה יומית, שתיקות ארוכות', defaultMin: 35, minMin: 20, maxMin: 60 },
  deep: { name: 'מסע עמוק', sub: 'חמישה שלבים מלאים, עיניים עצומות', defaultMin: 90, minMin: 45, maxMin: 120 },
  sleep: { name: 'שינה', sub: 'דעיכה הדרגתית לשקט', defaultMin: 30, minMin: 15, maxMin: 45 },
  album: { name: 'אלבום', sub: 'אלבום שלם כמסע', defaultMin: 93, minMin: 30, maxMin: 93 },
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
  album: { what: 'אלבום שלם כמסע: הרצועות בסדר המקורי, ממופות לחמשת השלבים, עם נשימה בקטעים בלי דיבור, אורב ויומן.', when: 'כשרוצים שהמוזיקה והקול של האלבום יובילו, בלי להתעסק בנגן.', phases: 'הפרקים לפי מיפוי האלבום (ניתן לעריכה בלשונית אלבומים)' },
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
  musicAssets: Asset[]
  album?: Album
  albumTracks?: Asset[]
  voiceEnabled: boolean
  breathEnabled: boolean
  /** album: start from this track number (1-based); overrides duration shortening */
  startTrackNo?: number
  /** album: only play these phases (chapters) */
  onlyPhases?: Phase[]
  /** narration address (masculine / feminine) */
  address?: Address
}

const shuffle = <T,>(a: T[]) => a.map((x) => [Math.random(), x] as const).sort((p, q) => p[0] - q[0]).map((p) => p[1])
let address: Address = 'm' // set per buildPlan call
const dur = (id: string) => clipDur(id, address)
const breathFor = (mode: Mode, n: Phase, on: boolean): BreathPattern => (on && mode !== 'sleep' ? (mode === 'breath' && n === 3 ? 'coherent' : BREATH_BY_PHASE[n]) : 'none')

/** Narration schedule for one session: never overlapping, phase-aware, sparse in the peak. */
function scheduleVoice(mode: Mode, phases: PhaseSpan[], intention: string, breathOn: boolean) {
  const voice: { t: number; id: string }[] = []
  const breathStartAfter = new Map<Phase, number>() // phase → when its breath pattern may begin (after the intro that explains it)
  let busy = -Infinity
  const put = (t: number, id: string, limit = Infinity) => {
    const at = Math.max(t, busy + 3)
    if (at + dur(id) > limit) return false
    voice.push({ t: at, id }); busy = at + dur(id); return true
  }
  for (const { n, startSec: s, endSec: e } of phases) {
    const L = e - s
    const bp = breathFor(mode, n, breathOn)
    if (n === 1) {
      put(s + 6, `open-${mode}`)
      const it = VOICE_CLIPS.find((c) => c.group === 'intent' && c.intention === intention)
      if (it) put(0, it.id)
      // explain the exercise only if there is still room to actually do it in this phase
      if ((bp === '478' || bp === 'coherent') && put(0, `intro-${bp}`, e - 40)) breathStartAfter.set(1, busy + 1.5)
      else breathStartAfter.set(1, bp === 'none' ? s : Infinity)
    } else if (n === 2) {
      if (bp === 'coherent' && put(s + 3, 'intro-coherent', e - 30)) breathStartAfter.set(2, busy + 1.5)
      const count = Math.min(5, Math.max(1, Math.floor(L / 240)))
      shuffle(VOICE_CLIPS.filter((c) => c.group === 'release')).slice(0, count)
        .forEach((c, i) => put(s + 60 + ((L - 120) * i) / count, c.id, e - 10))
    } else if (n === 3) {
      if (mode === 'sleep') { put(s + 90, 'close-sleep', e); continue }
      if (mode === 'breath') continue
      const lead = L > 900 ? 180 : 60
      const count = Math.max(1, Math.floor((L - lead) / 420))
      shuffle(VOICE_CLIPS.filter((c) => c.group === 'peak')).slice(0, count).forEach((c, i) => put(s + lead + i * 420, c.id, e - 20))
    } else if (n === 4) {
      const count = Math.min(4, Math.max(1, Math.floor(L / 150)))
      const order = count >= 4 ? [1, 2, 3, 4] : count === 3 ? [1, 2, 4] : count === 2 ? [1, 4] : [1]
      order.forEach((k, i) => put(s + 20 + ((L - 60) * i) / count, `return-${k}`, e - 5))
    } else {
      put(s + 10, 'close-gratitude', e)
      put(Math.max(busy + 4, e - (dur('close-end') + dur('close-journal') + 9)), 'close-end')
      put(0, 'close-journal')
    }
  }
  return { voice, breathStartAfter }
}

/** pause breath guidance while narration speaks, then resume the pattern that was active */
function clearBreathUnderVoice(input: Cue[]): Cue[] {
  let out = [...input].sort((a, b) => a.t - b.t)
  for (const v of out.filter((c) => c.layer === 'voice')) {
    const a = v.t - 1, b = v.t + dur(v.clip ?? '') + 1.5
    const before = out.filter((c) => c.layer === 'breath' && c.t <= a).pop()
    const inside = out.filter((c) => c.layer === 'breath' && c.t > a && c.t < b)
    const resume = inside.length ? inside[inside.length - 1].pattern : before?.pattern
    if ((before?.pattern ?? 'none') === 'none' && inside.every((c) => c.pattern === 'none')) continue
    out = out.filter((c) => !inside.includes(c))
    out.push({ t: a, layer: 'breath', action: 'pattern', pattern: 'none' }, { t: b, layer: 'breath', action: 'pattern', pattern: resume ?? 'none' })
    out.sort((p, q) => p.t - q.t)
  }
  return out
}

export function buildPlan(input: BuildInput): SessionPlan {
  const { mode, intention } = input
  if (mode === 'album' && input.album && input.albumTracks?.length) return buildAlbumPlan(input)

  const durationSec = input.durationSec
  address = input.address ?? 'm'
  const phases = buildPhases(mode, durationSec)
  const sched = input.voiceEnabled ? scheduleVoice(mode, phases, intention, input.breathEnabled) : { voice: [], breathStartAfter: new Map<Phase, number>() }
  let cues: Cue[] = []

  for (const span of phases) {
    cues.push({ t: span.startSec, layer: 'visual', action: 'phase', phase: span.n })
    // music: one asset per phase if available, else drone handled by engine
    const m = input.musicAssets.filter((a) => a.phases.includes(span.n))
    if (m.length) cues.push({ t: span.startSec, layer: 'music', action: 'play', asset: m[Math.floor(Math.random() * m.length)].id })
    else cues.push({ t: span.startSec, layer: 'music', action: 'play' }) // drone
    // breath: starts after the narration that explains it
    const bp = breathFor(mode, span.n, input.breathEnabled)
    const bt = Math.max(span.startSec, sched.breathStartAfter.get(span.n) ?? span.startSec)
    if (bt > span.startSec) cues.push({ t: span.startSec, layer: 'breath', action: 'pattern', pattern: 'none' })
    if (bt < span.endSec - 20) cues.push({ t: bt, layer: 'breath', action: 'pattern', pattern: bp })
  }
  for (const v of sched.voice) if (v.t < durationSec) cues.push({ t: v.t, layer: 'voice', action: 'play', clip: v.id, duck: -7 })
  cues = clearBreathUnderVoice(cues)
  return { id: uid(), mode, intention, durationSec, phases, cues, address, createdAt: new Date().toISOString() }
}

/** Album mode: tracks play in order, phases follow the album's phaseMap; duration can shorten by skipping tracks */
function buildAlbumPlan(input: BuildInput): SessionPlan {
  const album = input.album!
  const tracks = [...input.albumTracks!].sort((a, b) => (a.trackNo ?? 0) - (b.trackNo ?? 0))
  const target = input.durationSec
  const total = tracks.reduce((s, t) => s + t.durationSec, 0)

  // if shortening: keep tracks proportionally per phase
  let selected = tracks
  if (input.onlyPhases?.length) selected = tracks.filter((t) => input.onlyPhases!.includes(album.phaseMap[t.trackNo ?? 0] ?? 3))
  if (input.startTrackNo) selected = selected.filter((t) => (t.trackNo ?? 0) >= input.startTrackNo!)
  if (!input.onlyPhases?.length && !input.startTrackNo && target < total - 30) {
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
      cues.push({ t, layer: 'breath', action: 'pattern', pattern: 'none' })
      curPhase = p
    }
    cues.push({ t, layer: 'music', action: 'play', asset: tr.id })
    // synced breath: only inside this track's instrumental windows (no narration), pattern by phase; never in the peak
    if (input.breathEnabled && p !== 3) {
      const wins = tr.breathWindows ?? breathWindowsFor(tr.trackNo, tr.durationSec) ?? []
      const pattern: BreathPattern = p === 1 ? '478' : 'coherent'
      for (const [a, b] of wins) {
        if (b - a < 11) continue
        cues.push({ t: t + a + 1, layer: 'breath', action: 'pattern', pattern })
        cues.push({ t: t + b - 1, layer: 'breath', action: 'pattern', pattern: 'none' })
      }
    }
    t += tr.durationSec
  }
  if (phases.length) phases[phases.length - 1].endSec = t
  return { id: uid(), mode: 'album', intention: input.intention, durationSec: Math.round(t), phases, cues, albumId: album.id, createdAt: new Date().toISOString() }
}

/** the Psychedelic Prayers album (55 tracks): has its own phase map, breath map and texts */
export const isPsychedelicPrayers = (a: Pick<Album, 'name' | 'trackCount'>) => a.trackCount === 55 && /psychedelic\s*prayers|תפילות/i.test(a.name)

/** default phase map: Psychedelic Prayers' known chapters, otherwise split by cumulative listening time (deep-journey shares) */
export function defaultAlbumPhaseMap(trackCount: number, durations?: number[]): Record<number, Phase> {
  const map: Record<number, Phase> = {}
  if (trackCount === 55) {
    for (let i = 1; i <= 55; i++) map[i] = i <= 4 ? 1 : i <= 15 ? 2 : i <= 32 ? 3 : i <= 49 ? 4 : 5
    return map
  }
  const shares = SHARES.deep
  const bounds: number[] = []
  let acc = 0
  for (const n of [1, 2, 3, 4, 5] as Phase[]) { acc += shares[n]; bounds.push(acc) }
  const total = durations?.reduce((a, b) => a + b, 0) || trackCount
  let t = 0
  for (let i = 1; i <= trackCount; i++) {
    const d = durations?.[i - 1] || total / trackCount
    const mid = (t + d / 2) / total // a track belongs to the phase its midpoint falls in
    map[i] = (mid <= bounds[0] ? 1 : mid <= bounds[1] ? 2 : mid <= bounds[2] ? 3 : mid <= bounds[3] ? 4 : 5) as Phase
    t += d
  }
  // every phase gets at least one track when there are enough tracks
  if (trackCount >= 5) for (const n of [1, 5] as Phase[]) if (!Object.values(map).includes(n)) map[n === 1 ? 1 : trackCount] = n
  return map
}

export function phaseAt(plan: SessionPlan, t: number): PhaseSpan {
  return plan.phases.find((p) => t >= p.startSec && t < p.endSec) ?? plan.phases[plan.phases.length - 1]
}
