import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { type Album, type Mode, type Phase, db } from '../db'
import { INTENTIONS, INTENTION_META, MODE_LONG, MODE_META, PHASE_COLORS, PHASE_COLORS2 } from '../engine/plan'

export interface StartChoice { mode: Mode; minutes: number; intention: string; voice: boolean; breath: boolean; albumId?: string; startTrackNo?: number; onlyPhases?: Phase[] }

const MODE_ICON: Record<Mode, string> = { breath: '◌', meditation: '☾', deep: '✺', sleep: '☽', album: '♫' }
const MODE_GRAD: Record<Mode, [string, string]> = {
  breath: ['#19B8A6', '#2F5FE0'],
  meditation: ['#7B2FD6', '#2F5FE0'],
  deep: ['#FF5FC8', '#7B2FD6'],
  sleep: ['#1B2A6B', '#0E0B18'],
  album: ['#E8842E', '#FF5FC8'],
}

export function StartScreen({ onStart }: { onStart: (c: StartChoice) => void }) {
  const [mode, setMode] = useState<Mode>('breath')
  const [minutes, setMinutes] = useState(MODE_META.breath.defaultMin)
  const [intention, setIntention] = useState('שקט')
  const [custom, setCustom] = useState('')
  const [voice, setVoice] = useState(true)
  const [breath, setBreath] = useState(true)
  const [album, setAlbum] = useState<Album | null>(null)
  const [info, setInfo] = useState<Mode | null>(null)
  const [adv, setAdv] = useState(false)
  const hour = new Date().getHours()
  const greeting = hour < 5 ? 'לילה טוב' : hour < 12 ? 'בוקר טוב' : hour < 17 ? 'צהריים טובים' : hour < 21 ? 'ערב טוב' : 'לילה טוב'

  useEffect(() => { void db.albums.toCollection().first().then((a) => setAlbum(a ?? null)) }, [])

  const meta = MODE_META[mode]
  const maxMin = mode === 'album' && album ? Math.round(album.totalSec / 60) : meta.maxMin
  const pick = (m: Mode) => { setMode(m); setMinutes(m === 'album' && album ? Math.round(album.totalSec / 60) : MODE_META[m].defaultMin) }
  const modes: Mode[] = ['deep', 'meditation', 'breath', 'sleep']
  const im = INTENTION_META[intention]

  return (
    <div className="fade-in flex flex-col gap-8 px-5 pt-12 pb-32">
      <header>
        <div className="text-[15px] opacity-70">{greeting}</div>
        <h1 className="text-[40px] font-normal tracking-wide title-psy leading-tight">המדריך</h1>
        <p className="opacity-70 text-[15px] mt-1">בחר מסע, כוונה ומשך. השאר קורה לבד.</p>
      </header>

      <section className="flex flex-col gap-3">
        <div className="text-[13px] opacity-60 tracking-widest">המסע</div>
        {modes.map((m) => {
          const active = mode === m
          const [g1, g2] = MODE_GRAD[m]
          return (
            <div key={m} onClick={() => pick(m)}
              className="relative overflow-hidden rounded-3xl p-5 transition-all duration-700 cursor-pointer"
              style={{
                background: active ? `linear-gradient(135deg, ${g1}55, ${g2}40)` : 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
                border: `1px solid ${active ? g1 + 'AA' : 'rgba(242,238,230,0.10)'}`,
                boxShadow: active ? `0 0 50px -10px ${g1}99` : 'none',
              }}>
              <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full" style={{ background: `radial-gradient(circle, ${g1}${active ? '66' : '22'}, transparent 70%)`, filter: 'blur(20px)' }} />
              <div className="relative flex items-start gap-4">
                <div className="text-[28px] leading-none mt-1" style={{ color: active ? '#fff' : g1 }}>{MODE_ICON[m]}</div>
                <div className="flex-1">
                  <div className="flex items-baseline justify-between">
                    <div className="text-[20px] font-normal">{MODE_META[m].name}</div>
                    <div className="text-[13px] opacity-70">{m === 'album' && album ? `${Math.round(album.totalSec / 60)} דק'` : `${MODE_META[m].minMin}–${MODE_META[m].maxMin} דק'`}</div>
                  </div>
                  <div className="text-[14px] opacity-80 mt-1 leading-relaxed">{m === 'album' && album ? `${album.name} · ${album.trackCount} רצועות` : MODE_META[m].sub}</div>
                  <button onClick={(e) => { e.stopPropagation(); setInfo(m) }} className="text-[13px] mt-2 underline underline-offset-4 opacity-70">מה קורה במסע הזה?</button>
                </div>
              </div>
            </div>
          )
        })}
        <p className="text-[13px] opacity-60 leading-relaxed px-1">{album ? 'מסע האלבום Psychedelic Prayers נמצא בלשונית "האלבום".' : 'יש לך את האלבום Psychedelic Prayers? ייבא אותו בספרייה ← מוזיקה, והוא יקבל פרק משלו.'}</p>
      </section>

      <section className="card rounded-3xl p-5">
        <div className="flex justify-between items-baseline mb-3">
          <div className="text-[13px] opacity-60 tracking-widest">משך</div>
          <div className="text-[28px] font-light tabular-nums">{minutes}<span className="text-[15px] opacity-70 mr-1">דק'</span></div>
        </div>
        <input type="range" min={meta.minMin} max={maxMin} step={5} value={minutes} onChange={(e) => setMinutes(+e.target.value)} className="w-full" />
        <div className="flex justify-between text-[12px] opacity-50 mt-1"><span>{meta.minMin}</span><span>{maxMin}</span></div>
        {mode === 'album' && minutes < maxMin - 5 && <p className="text-[13px] opacity-70 mt-3">קיצור מדלג על רצועות שלמות לפי שלב – לא חותך באמצע.</p>}
      </section>

      <section>
        <div className="text-[13px] opacity-60 tracking-widest mb-3">הכוונה</div>
        <div className="grid grid-cols-3 gap-2">
          {INTENTIONS.map((i) => {
            const on = intention === i && !custom
            return (
              <button key={i} onClick={() => { setIntention(i); setCustom('') }}
                className="rounded-2xl py-3 px-2 flex flex-col items-center gap-1 transition-all duration-500"
                style={{ background: on ? 'linear-gradient(135deg, #FF5FC866, #7B2FD655)' : 'rgba(255,255,255,0.04)', border: `1px solid ${on ? '#FF5FC8AA' : 'rgba(242,238,230,0.10)'}`, boxShadow: on ? '0 0 30px -8px #FF5FC8' : 'none' }}>
                <span className="text-[20px] leading-none">{INTENTION_META[i].icon}</span>
                <span className="text-[15px]">{i}</span>
                <span className="text-[11px] opacity-70">{INTENTION_META[i].sub}</span>
              </button>
            )
          })}
        </div>
        {im && !custom && (
          <p className="fade-in text-[13px] opacity-75 leading-relaxed mt-3 px-1"><span className="opacity-60">איך זה משנה את המסע: </span>{im.how}</p>
        )}
        <input value={custom} onChange={(e) => { setCustom(e.target.value); if (e.target.value) setIntention(e.target.value) }} placeholder="או כוונה במילים שלך…"
          className="mt-4 w-full bg-transparent border-b border-ink/15 py-2 text-[15px] outline-none placeholder:opacity-40" />
      </section>

      <section>
        <button onClick={() => setAdv((v) => !v)} className="text-[13px] opacity-60 underline underline-offset-4">{adv ? 'פחות אפשרויות' : 'אפשרויות נוספות'}</button>
        {adv && (
          <div className="fade-in card rounded-2xl p-4 mt-3 flex flex-col gap-3 text-[15px]">
            {mode !== 'album' && (
              <label className="flex items-center justify-between"><div><div>קריינות עברית</div><div className="text-[12px] opacity-60">טקסטים מהספרייה לפי שלב וכוונה</div></div><input type="checkbox" checked={voice} onChange={(e) => setVoice(e.target.checked)} /></label>
            )}
            <label className="flex items-center justify-between"><div><div>הנחיית נשימה</div><div className="text-[12px] opacity-60">אורב, צלילים ורטט בשלבים 1, 2, 4</div></div><input type="checkbox" checked={breath} onChange={(e) => setBreath(e.target.checked)} /></label>
          </div>
        )}
      </section>

      <button onClick={() => onStart({ mode, minutes, intention, voice: mode !== 'album' && voice, breath, albumId: mode === 'album' ? album?.id : undefined })}
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+68px)] right-5 left-5 rounded-2xl py-4 text-[18px] btn-psy font-normal active:scale-[0.98] transition-transform">
        התחל {MODE_META[mode].name} · {minutes} דק'
      </button>

      {info && createPortal(
        <div className="fixed inset-0 flex items-end" style={{ zIndex: 1000, background: 'rgba(7,5,16,0.85)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }} onClick={() => setInfo(null)}>
          <div className="fade-in w-full rounded-t-[32px] p-6 pb-[calc(env(safe-area-inset-bottom)+24px)] flex flex-col gap-4" style={{ background: `linear-gradient(180deg, ${MODE_GRAD[info][0]}33, #15112A 40%)`, border: '1px solid rgba(242,238,230,0.12)' }} onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full bg-ink/30 self-center -mt-2" />
            <div className="flex items-center gap-3"><span className="text-[28px]" style={{ color: MODE_GRAD[info][0] }}>{MODE_ICON[info]}</span><h2 className="text-[26px] font-normal">{MODE_META[info].name}</h2></div>
            <p className="text-[16px] leading-relaxed">{MODE_LONG[info].what}</p>
            <div><div className="text-[12px] opacity-60 tracking-widest mb-1">מתי</div><p className="text-[15px] opacity-85 leading-relaxed">{MODE_LONG[info].when}</p></div>
            <div><div className="text-[12px] opacity-60 tracking-widest mb-2">השלבים</div>
              <div className="flex gap-1 h-2 rounded-full overflow-hidden mb-2">
                {([1, 2, 3, 4, 5] as const).map((p) => <div key={p} className="flex-1" style={{ background: `linear-gradient(90deg, ${PHASE_COLORS[p]}, ${PHASE_COLORS2[p]})`, opacity: info === 'sleep' && p > 3 ? 0.15 : 1 }} />)}
              </div>
              <p className="text-[14px] opacity-85 leading-relaxed">{MODE_LONG[info].phases}</p>
            </div>
            <button onClick={() => { pick(info); setInfo(null) }} className="rounded-2xl py-4 btn-psy text-[17px] mt-2">בחר {MODE_META[info].name}</button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
