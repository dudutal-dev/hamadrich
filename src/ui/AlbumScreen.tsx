import { useEffect, useMemo, useState } from 'react'
import { type Album, type Asset, type Phase, db } from '../db'
import { INTENTIONS, INTENTION_META, PHASE_COLORS, PHASE_COLORS2, PHASE_NAMES } from '../engine/plan'
import type { StartChoice } from './StartScreen'

const CHAPTER_TEXT: Record<Phase, { title: string; sub: string }> = {
  1: { title: 'הגעה', sub: 'המדריך, התנוחה, הכניסה. ארבע רצועות קצרות שמניחות את הגוף.' },
  2: { title: 'שחרור', sub: 'כל הדברים חולפים. ההרמוניה, הנשימה, הפשטות. הכי הרבה מילים.' },
  3: { title: 'שיא', sub: 'הטאו, הצ׳אקרות, התודעה האחת. הליבה של האלבום – רחבה ושקטה.' },
  4: { title: 'חזרה', sub: 'חיים, זרע, מוות. הצבר איטי חזרה אל הגוף ואל השם.' },
  5: { title: 'אינטגרציה', sub: 'הודיה וסגירה. מה שנשאר אחרי.' },
}

const fmt = (sec: number) => `${Math.floor(sec / 60)}:${Math.floor(sec % 60).toString().padStart(2, '0')}`

export function AlbumScreen({ onStart }: { onStart: (c: StartChoice) => void }) {
  const [album, setAlbum] = useState<Album | null>(null)
  const [tracks, setTracks] = useState<Asset[]>([])
  const [intention, setIntention] = useState('שקט')
  const [breath, setBreath] = useState(true)
  const [openPhase, setOpenPhase] = useState<Phase | null>(null)
  const [editing, setEditing] = useState(false)
  const [preview, setPreview] = useState<{ id: string; el: HTMLAudioElement } | null>(null)

  const load = async () => {
    const a = await db.albums.toCollection().first()
    setAlbum(a ?? null)
    if (a) setTracks((await db.assets.where('albumId').equals(a.id).toArray()).sort((x, y) => (x.trackNo ?? 0) - (y.trackNo ?? 0)))
  }
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

  if (!album) {
    return (
      <div className="fade-in flex flex-col gap-6 px-5 pt-12 pb-32">
        <h1 className="text-[34px] font-normal title-psy">האלבום</h1>
        <div className="card rounded-3xl p-6 flex flex-col gap-3">
          <div className="text-[20px]">Psychedelic Prayers</div>
          <p className="text-[15px] opacity-80 leading-relaxed">הקריינות של Blakely Saucier על המוזיקה של Desert Dwellers ו-Liquid Bloom – 55 רצועות, 93 דקות, בנויות כמסע לפי הספר של טימותי לירי.</p>
          <p className="text-[14px] opacity-70 leading-relaxed">כדי שהפרק הזה יעבוד: רכוש את האלבום ב-Bandcamp, הורד MP3 320, ואז ספרייה ← מוזיקה ← "בחר ZIP או קבצים".</p>
          <a href="https://desertdwellersmusic.bandcamp.com/album/psychedelic-prayers" target="_blank" rel="noreferrer" className="rounded-2xl py-3 text-center border border-ink/30 text-[15px]">לדף האלבום ב-Bandcamp</a>
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in flex flex-col gap-6 px-5 pt-12 pb-32">
      <header className="relative overflow-hidden rounded-3xl p-6" style={{ background: 'linear-gradient(135deg, #E8842E55, #FF5FC844 50%, #7B2FD655)', border: '1px solid #FF5FC866', boxShadow: '0 0 60px -15px #FF5FC8' }}>
        <div className="absolute -top-16 -left-16 w-56 h-56 rounded-full" style={{ background: 'radial-gradient(circle, #FFD08A88, transparent 70%)', filter: 'blur(24px)' }} />
        <div className="relative">
          <div className="text-[12px] tracking-[0.3em] opacity-80">פרק מיוחד</div>
          <h1 className="text-[32px] font-normal leading-tight mt-1">{album.name}</h1>
          <p className="text-[14px] opacity-85 mt-2 leading-relaxed">Blakely Saucier · Desert Dwellers · Liquid Bloom<br />{album.trackCount} רצועות · {Math.round(album.totalSec / 60)} דקות · 5 פרקים</p>
        </div>
      </header>

      <section>
        <div className="text-[13px] opacity-60 tracking-widest mb-3">הכוונה</div>
        <div className="flex flex-wrap gap-2">
          {INTENTIONS.map((i) => (
            <button key={i} onClick={() => setIntention(i)} className="px-4 py-2 rounded-full text-[14px] transition-all" style={{ background: intention === i ? '#FF5FC833' : 'rgba(255,255,255,0.05)', border: `1px solid ${intention === i ? '#FF5FC8AA' : 'rgba(242,238,230,0.12)'}` }}>{INTENTION_META[i].icon} {i}</button>
          ))}
        </div>
        <label className="flex items-center justify-between mt-4 text-[15px]"><div><div>הנחיית נשימה</div><div className="text-[12px] opacity-60">מסונכרנת לאלבום: נותחו 55 הרצועות, והנשימה מונחית רק בקטעים האינסטרומנטליים (פתיחות וסיומים) – לעולם לא מעל הקריינות, ולא בפרק השיא.</div></div><input type="checkbox" checked={breath} onChange={(e) => setBreath(e.target.checked)} /></label>
      </section>

      <button onClick={() => start()} className="rounded-2xl py-4 text-[18px] btn-psy">המסע המלא · {Math.round(album.totalSec / 60)} דק'</button>

      <section className="flex flex-col gap-3">
        <div className="flex justify-between items-baseline">
          <div className="text-[13px] opacity-60 tracking-widest">הפרקים</div>
          <button onClick={() => setEditing((v) => !v)} className="text-[13px] opacity-70 underline underline-offset-4">{editing ? 'סיום עריכה' : 'ערוך מיפוי'}</button>
        </div>
        {chapters.map((c) => {
          const col = PHASE_COLORS[c.phase], col2 = PHASE_COLORS2[c.phase]
          const open = openPhase === c.phase
          return (
            <div key={c.phase} className="rounded-3xl overflow-hidden" style={{ background: `linear-gradient(135deg, ${col}2A, rgba(255,255,255,0.03))`, border: `1px solid ${col}55` }}>
              <div className="p-4 flex items-center gap-3 cursor-pointer" onClick={() => setOpenPhase(open ? null : c.phase)}>
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-[17px] shrink-0" style={{ background: `linear-gradient(135deg, ${col2}, ${col})`, color: '#0E0B18' }}>{c.phase}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline"><div className="text-[18px]">{CHAPTER_TEXT[c.phase].title}</div><div className="text-[12px] opacity-70">{c.tracks.length} רצועות · {fmt(c.sec)}</div></div>
                  <div className="text-[13px] opacity-75 leading-snug mt-0.5">{CHAPTER_TEXT[c.phase].sub}</div>
                </div>
              </div>
              {open && (
                <div className="fade-in px-4 pb-4 flex flex-col gap-2">
                  <div className="flex gap-2 mb-1">
                    <button onClick={() => start({ onlyPhases: [c.phase], minutes: Math.round(c.sec / 60) })} className="flex-1 rounded-xl py-2.5 text-[14px]" style={{ background: `linear-gradient(135deg, ${col2}, ${col})`, color: '#0E0B18' }}>רק הפרק הזה</button>
                    <button onClick={() => start({ startTrackNo: c.tracks[0].trackNo })} className="flex-1 rounded-xl py-2.5 text-[14px] border border-ink/30">מכאן עד הסוף</button>
                  </div>
                  {c.tracks.map((t) => (
                    <div key={t.id} className="flex items-center gap-3 py-1.5 border-t border-ink/8">
                      <button onClick={() => togglePreview(t)} className="w-8 h-8 rounded-full text-[12px] shrink-0" style={{ background: preview?.id === t.id ? col2 : 'rgba(255,255,255,0.08)', color: preview?.id === t.id ? '#0E0B18' : undefined }}>{preview?.id === t.id ? '■' : '▶'}</button>
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] truncate">{t.trackNo}. {t.name}</div>
                        <div className="text-[11px] opacity-60">{fmt(t.durationSec)}</div>
                      </div>
                      {editing ? (
                        <select value={album.phaseMap[t.trackNo ?? 0] ?? 3} onChange={(e) => setPhase(t, +e.target.value as Phase)} className="bg-bg border border-ink/20 rounded-lg text-[12px] px-2 py-1">
                          {([1, 2, 3, 4, 5] as Phase[]).map((p) => <option key={p} value={p}>{PHASE_NAMES[p]}</option>)}
                        </select>
                      ) : (
                        <button onClick={() => start({ startTrackNo: t.trackNo })} className="text-[12px] opacity-75 underline underline-offset-4 shrink-0">התחל מכאן</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </section>

      <p className="text-[12px] opacity-55 leading-relaxed px-1">במסע האלבום הקריינות העברית כבויה (יש כבר קול). +10 דקות מוסיף לופ בין רצועות, לא חותך. החלקה למעלה מדלגת לפרק החזרה.</p>
    </div>
  )
}
