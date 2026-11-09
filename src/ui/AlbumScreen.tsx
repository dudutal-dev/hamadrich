import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { type Album, type Asset, type Phase, db } from '../db'
import { INTENTIONS, INTENTION_META, PHASE_COLORS, PHASE_COLORS2, PHASE_NAMES, isPsychedelicPrayers } from '../engine/plan'
import { analyzeAlbumBreath, importAlbum } from '../engine/library'
import type { StartChoice } from './StartScreen'
import { g, useAddress } from '../address'

const SEL_KEY = 'hamadrich:album'
const readSel = () => { try { return localStorage.getItem(SEL_KEY) } catch { return null } }
async function fetchAlbums(sel: string | null): Promise<{ albums: Album[]; album: Album | null; tracks: Asset[] }> {
  const albums = (await db.albums.toArray()).sort((x, y) => x.createdAt.localeCompare(y.createdAt))
  const album = albums.find((x) => x.id === sel) ?? albums[0] ?? null
  const tracks = album ? (await db.assets.where('albumId').equals(album.id).toArray()).sort((x, y) => (x.trackNo ?? 0) - (y.trackNo ?? 0)) : []
  return { albums, album, tracks }
}

/** chapter subtitles for albums other than Psychedelic Prayers */
const GENERIC_SUB: Record<Phase, string> = {
  1: 'כניסה והתמקמות. הרצועות הראשונות מניחות את הגוף.',
  2: 'שחרור והרפיה. האלבום מתחיל לפתוח.',
  3: 'הליבה. רחב ושקט, בלי הנחיית נשימה.',
  4: 'חזרה הדרגתית אל הגוף.',
  5: 'סגירה, ומה שנשאר אחרי.',
}

const CHAPTER_TEXT: Record<Phase, { title: string; sub: string }> = {
  1: { title: 'הגעה', sub: 'המדריך, התנוחה, הכניסה. ארבע רצועות קצרות שמניחות את הגוף.' },
  2: { title: 'שחרור', sub: 'כל הדברים חולפים. ההרמוניה, הנשימה, הפשטות. הכי הרבה מילים.' },
  3: { title: 'שיא', sub: 'הטאו, הצ׳אקרות, התודעה האחת. הליבה של האלבום – רחבה ושקטה.' },
  4: { title: 'חזרה', sub: 'חיים, זרע, מוות. הצבר איטי חזרה אל הגוף ואל השם.' },
  5: { title: 'אינטגרציה', sub: 'הודיה וסגירה. מה שנשאר אחרי.' },
}

const fmt = (sec: number) => `${Math.floor(sec / 60)}:${Math.floor(sec % 60).toString().padStart(2, '0')}`

export function AlbumScreen({ onStart }: { onStart: (c: StartChoice) => void }) {
  const a = useAddress()
  const [albums, setAlbums] = useState<Album[]>([])
  const [album, setAlbum] = useState<Album | null>(null)
  const [tracks, setTracks] = useState<Asset[]>([])
  const [importing, setImporting] = useState(false)
  const [busy, setBusy] = useState('')
  const [intention, setIntention] = useState('שקט')
  const [breath, setBreath] = useState(true)
  const [openPhase, setOpenPhase] = useState<Phase | null>(null)
  const [editing, setEditing] = useState(false)
  const [preview, setPreview] = useState<{ id: string; el: HTMLAudioElement } | null>(null)
  const [intro, setIntro] = useState(false)

  const load = (sel = readSel()) => fetchAlbums(sel).then((r) => { setAlbums(r.albums); setAlbum(r.album); setTracks(r.tracks) })
  const select = (id: string) => { try { localStorage.setItem(SEL_KEY, id) } catch { /* */ } preview?.el.pause(); setPreview(null); setOpenPhase(null); setEditing(false); void load(id) }
  const pp = !!album && isPsychedelicPrayers(album)
  const needsAnalysis = !!album && !pp && tracks.some((t) => t.breathWindows === undefined)
  const breathSec = tracks.reduce((s, t) => s + (t.breathWindows ?? []).reduce((q, [x, y]) => q + y - x, 0), 0)
  const analyze = async () => { if (!album) return; setBusy('מתחיל…'); await analyzeAlbumBreath(album.id, setBusy); setBusy(''); await load(album.id) }
  const chapterSub = (p: Phase) => (pp ? CHAPTER_TEXT[p].sub : GENERIC_SUB[p])
  useEffect(() => { void load() }, [])
  useEffect(() => () => { preview?.el.pause() }, [preview])

  const chapters = useMemo(() => {
    if (!album) return []
    return ([1, 2, 3, 4, 5] as Phase[]).map((p) => {
      const list = tracks.filter((t) => (album.phaseMap[t.trackNo ?? 0] ?? 3) === p)
      return { phase: p, tracks: list, sec: list.reduce((s, t) => s + t.durationSec, 0) }
    }).filter((c) => c.tracks.length)
  }, [album, tracks])

  const start = (opts: Partial<StartChoice> = {}) => {
    if (!album) return
    onStart({ mode: 'album', minutes: Math.round(album.totalSec / 60), intention, voice: false, breath, albumId: album.id, ...opts })
  }

  const togglePreview = async (t: Asset) => {
    if (preview?.id === t.id) { preview.el.pause(); setPreview(null); return }
    preview?.el.pause()
    const url = URL.createObjectURL(t.blob)
    const el = new Audio(url); el.volume = 0.8
    el.onended = () => { URL.revokeObjectURL(url); setPreview(null) }
    await el.play().catch(() => {})
    setPreview({ id: t.id, el })
  }

  const setPhase = async (t: Asset, p: Phase) => {
    if (!album) return
    const phaseMap = { ...album.phaseMap, [t.trackNo ?? 0]: p }
    await db.albums.update(album.id, { phaseMap })
    await db.assets.update(t.id, { phases: [p] })
    await load()
  }

  const importer = <AlbumImporter onDone={(id) => { setImporting(false); select(id) }} onCancel={albums.length ? () => setImporting(false) : undefined} />

  if (!album) {
    return (
      <div className="fade-in flex flex-col gap-6 px-5 pt-12 pb-32">
        <h1 className="text-[34px] title-psy">אלבומים</h1>
        <p className="text-[15px] muted leading-relaxed">כל אלבום שבנוי כמסע יכול להפוך לסשן: האפליקציה מחלקת אותו לחמישה פרקים, מזהה איפה אין דיבור ומוסיפה שם נשימה, ומציירת לפי המוזיקה.</p>
        {importer}
        <div className="card rounded-3xl p-6 flex flex-col gap-3">
          <div className="text-[21px] font-semibold">Psychedelic Prayers</div>
          <p className="text-[15px] opacity-80 leading-relaxed">הקריינות של Blakely Saucier על המוזיקה של Desert Dwellers ו-Liquid Bloom – 55 רצועות, 93 דקות, בנויות כמסע לפי הספר של טימותי לירי. זה האלבום שהאפליקציה נבנתה סביבו.</p>
          <a href="https://desertdwellersmusic.bandcamp.com/album/psychedelic-prayers" target="_blank" rel="noreferrer" className="rounded-2xl py-3 text-center btn-ghost text-[15px]">לדף האלבום ב-Bandcamp</a>
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in flex flex-col gap-6 px-5 pt-12 pb-32">
      <div className="flex gap-2 overflow-x-auto -mx-5 px-5 pb-1" style={{ scrollbarWidth: 'none' }}>
        {albums.map((x) => (
          <button key={x.id} onClick={() => select(x.id)} className={`shrink-0 px-4 py-2 rounded-full text-[14px] border transition-all ${x.id === album.id ? 'chip-on font-semibold' : 'chip'}`}>{x.name}</button>
        ))}
        <button onClick={() => setImporting((v) => !v)} className="shrink-0 px-4 py-2 rounded-full text-[14px] btn-ghost">+ {g(a, 'ייבא', 'ייבאי')} אלבום</button>
      </div>
      {importing && importer}
      <header className="relative overflow-hidden rounded-3xl p-6" style={{ background: 'linear-gradient(135deg, #E8842E26, #EBA17A1F 50%, #B3A4F226)', border: '1px solid rgba(242,194,107,0.35)', boxShadow: '0 18px 50px -28px #EBA17A' }}>
        <div className="absolute -top-16 -left-16 w-56 h-56 rounded-full" style={{ background: 'radial-gradient(circle, #FFD08A44, transparent 70%)', filter: 'blur(24px)' }} />
        <div className="relative">
          <div className="text-[13px] tracking-[0.3em] opacity-80">{pp ? 'פרק מיוחד · מסע מודרך בקול' : 'מסע מאלבום'}</div>
          <h1 className="text-[32px] font-bold leading-tight mt-1">{album.name}</h1>
          <p className="text-[14px] opacity-85 mt-2 leading-relaxed">{pp && <>Blakely Saucier · Desert Dwellers · Liquid Bloom<br /></>}{album.trackCount} רצועות · {Math.round(album.totalSec / 60)} דקות · {chapters.length} פרקים</p>
          <p className="text-[14px] opacity-80 mt-3 leading-relaxed"><span className="opacity-80">סוג המסע: </span>{pp
            ? 'מודרך – המדריך הוא האלבום. האפליקציה לא מדברת ולא מנגנת דרון; היא מזהה פרק, מוסיפה נשימה בשקטים, מציירת לפי המוזיקה, ושומרת ביומן.'
            : 'האלבום מוביל. הפרקים חולקו לפי זמן ההאזנה (אפשר לשנות ב"ערוך מיפוי"), הנשימה נכנסת רק בקטעים בלי דיבור, והחלל מגיב למוזיקה.'}</p>
          {needsAnalysis && <button onClick={() => void analyze()} disabled={!!busy} className="mt-4 rounded-full px-4 py-2 text-[14px] btn-ghost">{busy || 'זיהוי קטעי דיבור (לנשימה)'}</button>}
          {!pp && !needsAnalysis && <p className="text-[13px] muted mt-3">נמצאו {Math.round(breathSec / 60)} דקות בלי דיבור להנחיית נשימה.</p>}
          {pp && <button onClick={() => setIntro(true)} className="mt-4 rounded-full px-4 py-2 text-[14px]" style={{ background: 'rgba(12,10,23,0.5)', border: '1px solid rgba(246,242,234,0.3)', fontWeight: 500 }}>✦ מה המסע הזה ומה המשמעות</button>}
        </div>
      </header>
      {intro && createPortal(<IntroSheet onClose={() => setIntro(false)} />, document.body)}

      <section>
        <div className="label mb-3">הכוונה</div>
        <div className="flex flex-wrap gap-2">
          {INTENTIONS.map((i) => (
            <button key={i} onClick={() => setIntention(i)} className={`px-4 py-2 rounded-full text-[15px] transition-all border ${intention === i ? 'chip-on' : 'chip'}`}>{INTENTION_META[i].icon} {i}</button>
          ))}
        </div>
        <label className="flex items-center justify-between mt-4 text-[15px]"><div><div>הנחיית נשימה</div><div className="text-[13px] opacity-75">{pp ? 'מסונכרנת לאלבום: נותחו 55 הרצועות, והנשימה מונחית רק בקטעים האינסטרומנטליים (פתיחות וסיומים) – לעולם לא מעל הקריינות, ולא בפרק השיא.' : 'מסונכרנת לאלבום: הנשימה מונחית רק בקטעים שזוהו כבלי דיבור – לעולם לא מעל קול, ולא בפרק השיא.'}</div></div><input type="checkbox" checked={breath} onChange={(e) => setBreath(e.target.checked)} /></label>
      </section>

      <button onClick={() => start()} className="rounded-2xl py-4 text-[18px] btn-psy">המסע המלא · {Math.round(album.totalSec / 60)} דק'</button>

      <section className="flex flex-col gap-3">
        <div className="flex justify-between items-baseline">
          <div className="label">הפרקים</div>
          <button onClick={() => setEditing((v) => !v)} className="text-[14px] opacity-80 underline underline-offset-4">{editing ? 'סיום עריכה' : 'ערוך מיפוי'}</button>
        </div>
        {chapters.map((c) => {
          const col = PHASE_COLORS[c.phase], col2 = PHASE_COLORS2[c.phase]
          const open = openPhase === c.phase
          return (
            <div key={c.phase} className="rounded-3xl overflow-hidden" style={{ background: `linear-gradient(135deg, ${col}1F, rgba(255,255,255,0.035))`, border: `1px solid ${col}44` }}>
              <div className="p-4 flex items-center gap-3 cursor-pointer" onClick={() => setOpenPhase(open ? null : c.phase)}>
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-[17px] shrink-0" style={{ background: `linear-gradient(135deg, ${col2}, ${col})`, color: '#0E0B18' }}>{c.phase}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline"><div className="text-[18px] font-medium">{CHAPTER_TEXT[c.phase].title}</div><div className="text-[13px] opacity-80">{c.tracks.length} רצועות · {fmt(c.sec)}</div></div>
                  <div className="text-[14px] opacity-85 leading-snug mt-0.5">{chapterSub(c.phase)}</div>
                </div>
              </div>
              {open && (
                <div className="fade-in px-4 pb-4 flex flex-col gap-2">
                  <div className="flex gap-2 mb-1">
                    <button onClick={() => start({ onlyPhases: [c.phase], minutes: Math.round(c.sec / 60) })} className="flex-1 rounded-xl py-2.5 text-[14px]" style={{ background: `linear-gradient(135deg, ${col2}, ${col})`, color: '#0E0B18' }}>רק הפרק הזה</button>
                    <button onClick={() => start({ startTrackNo: c.tracks[0].trackNo })} className="flex-1 rounded-xl py-2.5 text-[14px] btn-ghost">מכאן עד הסוף</button>
                  </div>
                  {c.tracks.map((t) => (
                    <div key={t.id} className="flex items-center gap-3 py-1.5 border-t border-ink/8">
                      <button onClick={() => togglePreview(t)} className="w-8 h-8 rounded-full text-[13px] shrink-0" style={{ background: preview?.id === t.id ? col2 : 'rgba(255,255,255,0.08)', color: preview?.id === t.id ? '#0E0B18' : undefined }}>{preview?.id === t.id ? '■' : '▶'}</button>
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] truncate">{t.trackNo}. {t.name}</div>
                        <div className="text-[12.5px] opacity-75">{fmt(t.durationSec)}</div>
                      </div>
                      {editing ? (
                        <select value={album.phaseMap[t.trackNo ?? 0] ?? 3} onChange={(e) => setPhase(t, +e.target.value as Phase)} className="bg-bg border border-ink/20 rounded-lg text-[13px] px-2 py-1">
                          {([1, 2, 3, 4, 5] as Phase[]).map((p) => <option key={p} value={p}>{PHASE_NAMES[p]}</option>)}
                        </select>
                      ) : (
                        <button onClick={() => start({ startTrackNo: t.trackNo })} className="text-[13px] opacity-85 underline underline-offset-4 shrink-0">{g(a, 'התחל מכאן', 'התחילי מכאן')}</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </section>

      <p className="text-[13px] opacity-70 leading-relaxed px-1">במסע האלבום הקריינות העברית כבויה (יש כבר קול). +10 דקות מוסיף לופ בין רצועות, לא חותך. החלקה למעלה מדלגת לפרק החזרה.</p>
    </div>
  )
}


function IntroSheet({ onClose }: { onClose: () => void }) {
  const a = useAddress()
  return (
    <div className="fixed inset-0 flex items-end" style={{ zIndex: 1000, background: 'rgba(7,5,16,0.88)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }} onClick={onClose}>
      <div className="fade-in w-full max-h-[92vh] overflow-y-auto rounded-t-[32px] px-6 pt-5 pb-[calc(env(safe-area-inset-bottom)+24px)] flex flex-col gap-5" style={{ background: 'linear-gradient(180deg, #E8842E33, #15112A 25%)', border: '1px solid rgba(242,238,230,0.12)' }} onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 rounded-full bg-ink/30 self-center" />
        <h2 className="text-[28px] title-psy leading-tight">תפילות פסיכדליות – המסע</h2>

        <Section title="מאיפה זה בא">
          ב-1966, אחרי שכתב עם ריצ׳רד אלפרט ורלף מצנר מדריך למסע על בסיס הספר הטיבטי של המתים, טימותי לירי פנה מזרחה יותר – אל הטאו טה צ׳ינג. הוא לקח תשעה תרגומים אנגליים של לאו דזה ו"תרגם אותם לפסיכדלית": שירים קצרים, כל אחד מיועד להיקרא בנקודה מסוימת ברצף המסע. זה ספר השירה היחיד שלו, והוא ראה בטאו טקסט מתקדם יותר מהטיבטי – פחות על מוות ולידה מחדש, יותר על זרימה, רכות ואי-אחיזה.
        </Section>
        <Section title="מה שומעים">
          בלייקלי סוסייה הקליטה את הקריאה שלה במהלך שני מסעות משלה – לכן הקול לא "מקריא" אלא נמצא בתוך מה שהוא מתאר. הקצב איטי, יש הרבה אוויר בין המשפטים. מתחת: אמביינט של Desert Dwellers ו-Liquid Bloom (אמאני פרנד), עם סנטור, צ׳לו, נגוני, חליל ודיג׳רידו – מוזיקה שנכתבה ממילא לסשנים של סאונד-הילינג. 55 רצועות, 93 דקות, בנויות כרצף אחד.
        </Section>
        <Section title="המשמעות של הסדר">
          האלבום הוא מפה, לא פלייליסט. הוא מתחיל ב"המדריך" ו"מסר התנוחה" – הכנה והתמקמות; עובר דרך "כל הדברים חולפים" ו"הניחו לרשת הקורים" – שחרור של אחיזה; מגיע ל"מה שנקרא הטאו", "הסליל של ה-DNA", "חמשת החושים" – הליבה, שבה המילים מצביעות על מה שאי אפשר לומר; ואז הצ׳אקרות, "רגע המלאות", "השיעור של המים" – חזרה הדרגתית אל הגוף; ומסתיים ב"מי שמכיר את המרכז מחזיק מעמד" ו"לך בזהירות כשאתה בין…" – הוראות לחיים שאחרי. לירי כתב ששיר שנקרא בזמן הלא נכון הוא רעש; בזמן הנכון – דלת.
        </Section>
        <Section title="איך לעבור את זה">
          <ul className="list-disc pr-5 flex flex-col gap-1.5">
            <li>בשכיבה, עיניים עצומות, אוזניות אם אפשר. בלי טלפון ביד – האפליקציה יודעת לבד.</li>
            <li>{g(a, 'אל תנסה להבין את המילים. תן להן לעבור כמו מים.', 'אל תנסי להבין את המילים. תני להן לעבור כמו מים.')} מה שרלוונטי יישאר.</li>
            <li>בפרק השיא (רצועות 16–32) האפליקציה שותקת לגמרי – בלי נשימה, בלי אור. זה מכוון.</li>
            <li>הנשימה המונחית נכנסת רק בפתיחות ובסיומים האינסטרומנטליים, לעולם לא מעל הקול.</li>
            <li>אם משהו נהיה כבד – לחיצה ארוכה של שלוש שניות. יש דרך הביתה תמיד.</li>
            <li>{g(a, 'בסוף, לפני שאתה קם:', 'בסוף, לפני שאת קמה:')} שאלה אחת ליומן. זה החלק שבו המסע הופך לשלך.</li>
          </ul>
        </Section>
        <p className="text-[13px] opacity-70 leading-relaxed">המדריך מלווה האזנה, נשימה ומדיטציה. הוא אינו מדריך לחומרים ואינו תחליף לליווי אנושי.</p>
        <button onClick={onClose} className="rounded-2xl py-4 btn-psy text-[17px]">הבנתי</button>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="label mb-1.5">{title}</div>
      <div className="text-[15px] leading-relaxed opacity-90">{children}</div>
    </div>
  )
}

/** import an album (ZIP or files) right from the album tab */
function AlbumImporter({ onDone, onCancel }: { onDone: (id: string) => void; onCancel?: () => void }) {
  const a = useAddress()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const run = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy('מתחיל…')
    try { const al = await importAlbum([...files], name.trim() || files[0].name.replace(/\.[^.]+$/, ''), setBusy); setBusy(''); onDone(al.id) } catch (e) { setBusy('שגיאה: ' + String(e)) }
  }
  return (
    <section className="card rounded-3xl p-5 flex flex-col gap-3">
      <div className="text-[18px] font-semibold">{g(a, 'ייבא', 'ייבאי')} אלבום</div>
      <p className="text-[14px] muted leading-relaxed">ZIP מ-Bandcamp או כל קובצי ה-MP3 יחד. הסדר נקבע לפי מספר הרצועה בשם הקובץ. אחרי הייבוא האפליקציה מזהה אוטומטית איפה יש דיבור.</p>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="שם האלבום" className="bg-transparent border-b border-ink/15 py-2 text-[15px] outline-none" />
      <input ref={input} type="file" accept="audio/*,.zip,application/zip" multiple hidden onChange={(e) => void run(e.target.files)} />
      <button onClick={() => input.current?.click()} disabled={!!busy && !busy.startsWith('שגיאה')} className="btn-psy rounded-2xl py-3 text-[16px]">{busy || g(a, 'בחר ZIP או קבצים', 'בחרי ZIP או קבצים')}</button>
      {onCancel && !busy && <button onClick={onCancel} className="text-[14px] muted">ביטול</button>}
    </section>
  )
}
