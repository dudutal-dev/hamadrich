import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { type Album, type Mode, type Phase, db } from '../db'
import { Halo } from './Halo'
import { BODY_JOURNEYS, type BodyJourney, bodyJourney, isAdultUnlocked, unlockAdult } from '../engine/body'
import { g, hasChosenAddress, useAddress } from '../address'
import { AddressPicker } from './AddressPicker'
import { INTENTIONS, INTENTION_META, MODE_LONG, MODE_META, PHASE_COLORS, PHASE_COLORS2 } from '../engine/plan'

export interface StartChoice { mode: Mode; minutes: number; intention: string; voice: boolean; breath: boolean; albumId?: string; journey?: string; startTrackNo?: number; onlyPhases?: Phase[] }

const MODE_ICON: Record<Mode, string> = { breath: '◌', meditation: '☾', deep: '✺', sleep: '☽', album: '♫', body: '❋' }
const MODE_GRAD: Record<Mode, [string, string]> = {
  breath: ['#7CCFBE', '#4F6FD6'],
  meditation: ['#B3A4F2', '#5E6AD2'],
  deep: ['#F2C26B', '#EBA17A'],
  sleep: ['#1B2A6B', '#0E0B18'],
  album: ['#EBA17A', '#B3A4F2'],
  body: ['#E39470', '#B3A4F2'],
}

export function StartScreen({ onStart }: { onStart: (c: StartChoice) => void }) {
  const [mode, setMode] = useState<Mode>('breath')
  const [journey, setJourney] = useState<string | null>(null)
  const [adult, setAdult] = useState(isAdultUnlocked)
  const [gate, setGate] = useState(false)
  const [minutes, setMinutes] = useState(MODE_META.breath.defaultMin)
  const [intention, setIntention] = useState('שקט')
  const [custom, setCustom] = useState('')
  const [voice, setVoice] = useState(true)
  const [breath, setBreath] = useState(true)
  const [album, setAlbum] = useState<Album | null>(null)
  const [info, setInfo] = useState<Mode | null>(null)
  const [adv, setAdv] = useState(false)
  const a = useAddress()
  const [askAddress, setAskAddress] = useState(() => !hasChosenAddress())
  const [hour] = useState(() => new Date().getHours())
  const greeting = hour < 5 ? 'לילה טוב' : hour < 12 ? 'בוקר טוב' : hour < 17 ? 'צהריים טובים' : hour < 21 ? 'ערב טוב' : 'לילה טוב'

  useEffect(() => { void db.albums.toCollection().first().then((a) => setAlbum(a ?? null)) }, [])

  const bj = mode === 'body' ? bodyJourney(journey ?? undefined) : undefined
  const meta = bj ? { ...MODE_META.body, minMin: bj.minMin, maxMin: bj.maxMin } : MODE_META[mode]
  const maxMin = mode === 'album' && album ? Math.round(album.totalSec / 60) : meta.maxMin
  const pick = (m: Mode) => { setMode(m); setJourney(null); setMinutes(m === 'album' && album ? Math.round(album.totalSec / 60) : MODE_META[m].defaultMin) }
  const pickBody = (j: BodyJourney) => { setMode('body'); setJourney(j.id); setMinutes(j.defaultMin) }
  const startLabel = bj ? bj.title : MODE_META[mode].name
  const modes: Mode[] = ['deep', 'meditation', 'breath', 'sleep']
  const im = INTENTION_META[intention]

  return (
    <div className="fade-in flex flex-col gap-8 px-5 pt-12 pb-32">
      <header className="relative">
        <Halo size={190} className="absolute -left-10 -top-12 opacity-90 pointer-events-none" />
        <div className="relative text-[16px] muted">{greeting}</div>
        <h1 className="relative text-[44px] title-psy leading-tight">המדריך</h1>
        <p className="opacity-80 text-[15px] mt-1">{g(a, 'בחר', 'בחרי')} מסע, כוונה ומשך. השאר קורה לבד.</p>
      </header>

      {askAddress && (
        <section className="fade-in card rounded-3xl p-5 flex flex-col gap-3">
          <div className="text-[18px] font-semibold">איך לפנות אליך?</div>
          <p className="text-[14px] muted leading-relaxed">המדריכה תדבר אליך בלשון שתבחר/י. אפשר לשנות בכל רגע בספרייה ← הגדרות.</p>
          <AddressPicker />
          <button onClick={() => setAskAddress(false)} className="btn-psy rounded-2xl py-3 text-[16px]">{g(a, 'המשך', 'המשיכי')}</button>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <div className="label">המסע</div>
        {modes.map((m) => {
          const active = mode === m
          const [g1, g2] = MODE_GRAD[m]
          return (
            <div key={m} onClick={() => pick(m)}
              className="relative overflow-hidden rounded-3xl p-5 transition-all duration-700 cursor-pointer"
              style={{
                background: active ? `linear-gradient(135deg, ${g1}30, ${g2}1C)` : 'rgba(255,255,255,0.045)',
                border: `1px solid ${active ? g1 + '99' : 'rgba(246,242,234,0.10)'}`,
                boxShadow: active ? `0 14px 40px -22px ${g1}` : 'none',
              }}>
              <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full" style={{ background: `radial-gradient(circle, ${g1}${active ? '44' : '18'}, transparent 70%)`, filter: 'blur(20px)' }} />
              <div className="relative flex items-start gap-4">
                <div className="text-[28px] leading-none mt-1" style={{ color: active ? '#fff' : g1 }}>{MODE_ICON[m]}</div>
                <div className="flex-1">
                  <div className="flex items-baseline justify-between">
                    <div className="text-[21px] font-semibold">{MODE_META[m].name}</div>
                    <div className="text-[14px] opacity-80">{m === 'album' && album ? `${Math.round(album.totalSec / 60)} דק'` : `${MODE_META[m].minMin}–${MODE_META[m].maxMin} דק'`}</div>
                  </div>
                  <div className="text-[14px] opacity-80 mt-1 leading-relaxed">{m === 'album' && album ? `${album.name} · ${album.trackCount} רצועות` : MODE_META[m].sub}</div>
                  <button onClick={(e) => { e.stopPropagation(); setInfo(m) }} className="text-[14px] mt-2 underline underline-offset-4 opacity-80">מה קורה במסע הזה?</button>
                </div>
              </div>
            </div>
          )
        })}
        <p className="text-[14px] opacity-75 leading-relaxed px-1">{album ? 'מסעות מאלבומים נמצאים בלשונית "אלבומים" – אפשר לייבא שם כמה אלבומים.' : 'יש לך אלבום שבנוי כמסע (למשל Psychedelic Prayers)? ייבא אותו בלשונית "אלבומים".'}</p>
      </section>

      <section className="flex flex-col gap-3">
        <div className="label">גוף ומיניות · 18+</div>
        <p className="text-[14px] muted leading-relaxed px-1 -mt-1">מסעות אישיים לגוף, לתשוקה ולעונג. חושני ולא מפורש, בקצב שלך. מומלץ במקום פרטי ועם אוזניות.</p>
        {BODY_JOURNEYS.filter((j) => j.level === 1).map((j) => <BodyCard key={j.id} j={j} on={mode === 'body' && journey === j.id} onPick={() => pickBody(j)} />)}
        <div className="label mt-2">מתקדם · מגע ועוררות</div>
        {adult
          ? BODY_JOURNEYS.filter((j) => j.level === 2).map((j) => <BodyCard key={j.id} j={j} on={mode === 'body' && journey === j.id} onPick={() => pickBody(j)} />)
          : (
            <button onClick={() => setGate(true)} className="card rounded-3xl p-5 text-right flex items-center gap-4">
              <span className="text-[26px]">🔒</span>
              <span className="flex-1"><span className="block text-[17px] font-semibold">שלושה מסעות מתקדמים</span><span className="block text-[14px] muted mt-0.5">מגע מודע · נשימת אש · עונג בלי יעד</span></span>
              <span className="text-[14px] font-medium">פתיחה</span>
            </button>
          )}
      </section>

      <section className="card rounded-3xl p-5">
        <div className="flex justify-between items-baseline mb-3">
          <div className="label">משך</div>
          <div className="text-[28px] font-semibold tabular-nums">{minutes}<span className="text-[15px] opacity-80 mr-1">דק'</span></div>
        </div>
        <input type="range" min={meta.minMin} max={maxMin} step={5} value={minutes} onChange={(e) => setMinutes(+e.target.value)} className="w-full" />
        <div className="flex justify-between text-[13px] opacity-70 mt-1"><span>{meta.minMin}</span><span>{maxMin}</span></div>
        {mode === 'album' && minutes < maxMin - 5 && <p className="text-[14px] opacity-80 mt-3">קיצור מדלג על רצועות שלמות לפי שלב – לא חותך באמצע.</p>}
      </section>

      {mode !== 'body' && <section>
        <div className="label mb-3">הכוונה</div>
        <div className="grid grid-cols-3 gap-2">
          {INTENTIONS.map((i) => {
            const on = intention === i && !custom
            return (
              <button key={i} onClick={() => { setIntention(i); setCustom('') }}
                className={`rounded-2xl py-3 px-2 flex flex-col items-center gap-1 transition-all duration-300 border ${on ? 'chip-on' : 'chip'}`}>
                <span className="text-[20px] leading-none">{INTENTION_META[i].icon}</span>
                <span className="text-[16px] font-medium">{i}</span>
                <span className="text-[12.5px] opacity-80">{INTENTION_META[i].sub}</span>
              </button>
            )
          })}
        </div>
        {im && !custom && (
          <p className="fade-in text-[14px] opacity-85 leading-relaxed mt-3 px-1"><span className="opacity-75">איך זה משנה את המסע: </span>{im.how}</p>
        )}
        <input value={custom} onChange={(e) => { setCustom(e.target.value); if (e.target.value) setIntention(e.target.value) }} placeholder="או כוונה במילים שלך…"
          className="mt-4 w-full bg-transparent border-b border-ink/15 py-2 text-[15px] outline-none placeholder:opacity-40" />
      </section>}

      <section>
        <button onClick={() => setAdv((v) => !v)} className="text-[14px] opacity-75 underline underline-offset-4">{adv ? 'פחות אפשרויות' : 'אפשרויות נוספות'}</button>
        {adv && (
          <div className="fade-in card rounded-2xl p-4 mt-3 flex flex-col gap-3 text-[15px]">
            {mode !== 'album' && (
              <label className="flex items-center justify-between"><div><div>קריינות עברית</div><div className="text-[13px] opacity-75">קול מדריכה בעברית לפי שלב וכוונה</div></div><input type="checkbox" checked={voice} onChange={(e) => setVoice(e.target.checked)} /></label>
            )}
            <label className="flex items-center justify-between"><div><div>הנחיית נשימה</div><div className="text-[13px] opacity-75">אורב, צלילים ורטט בשלבים 1, 2, 4</div></div><input type="checkbox" checked={breath} onChange={(e) => setBreath(e.target.checked)} /></label>
          </div>
        )}
      </section>

      <button onClick={() => { if (mode === 'body' && !journey) return; onStart({ mode, minutes, intention: bj ? bj.title : intention, voice: mode !== 'album' && voice, breath, albumId: mode === 'album' ? album?.id : undefined, journey: journey ?? undefined }) }}
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+68px)] right-5 left-5 rounded-2xl py-4 text-[18px] btn-psy active:scale-[0.98] transition-transform">
        {g(a, 'התחל', 'התחילי')} {startLabel} · {minutes} דק'
      </button>

      {gate && createPortal(
        <div className="fixed inset-0 flex items-end" style={{ zIndex: 1000, background: 'rgba(7,5,16,0.88)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }} onClick={() => setGate(false)}>
          <div className="fade-in sheet w-full rounded-t-[32px] p-6 pb-[calc(env(safe-area-inset-bottom)+24px)] flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full bg-ink/30 self-center -mt-2" />
            <h2 className="text-[24px] font-semibold">מסעות מתקדמים</h2>
            <p className="text-[15px] leading-relaxed">המסעות האלה כוללים מגע עצמי ועבודה ישירה עם עוררות ועונג. הם מיועדים למבוגרים בלבד, להאזנה לבד, במקום פרטי.</p>
            <p className="text-[14px] muted leading-relaxed">בכל שלב יש הזמנה ולא הוראה. מותר לעצור בכל רגע. {g(a, 'אם עולים זיכרונות קשים – עצור, ושקול ליווי מקצועי.', 'אם עולים זיכרונות קשים – עצרי, ושקלי ליווי מקצועי.')}</p>
            <button onClick={() => { unlockAdult(); setAdult(true); setGate(false) }} className="btn-psy rounded-2xl py-4 text-[16px]">{g(a, 'אני מעל 18 ונמצא במקום פרטי', 'אני מעל 18 ונמצאת במקום פרטי')}</button>
            <button onClick={() => setGate(false)} className="text-[15px] muted py-2">לא עכשיו</button>
          </div>
        </div>,
        document.body,
      )}

      {info && createPortal(
        <div className="fixed inset-0 flex items-end" style={{ zIndex: 1000, background: 'rgba(7,5,16,0.85)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }} onClick={() => setInfo(null)}>
          <div className="fade-in w-full rounded-t-[32px] p-6 pb-[calc(env(safe-area-inset-bottom)+24px)] flex flex-col gap-4" style={{ background: `linear-gradient(180deg, ${MODE_GRAD[info][0]}22, #15112A 35%)`, border: '1px solid rgba(246,242,234,0.14)' }} onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full bg-ink/30 self-center -mt-2" />
            <div className="flex items-center gap-3"><span className="text-[28px]" style={{ color: MODE_GRAD[info][0] }}>{MODE_ICON[info]}</span><h2 className="text-[26px] font-semibold">{MODE_META[info].name}</h2></div>
            <p className="text-[16px] leading-relaxed">{MODE_LONG[info].what}</p>
            <div><div className="label mb-1">מתי</div><p className="text-[15px] opacity-85 leading-relaxed">{MODE_LONG[info].when}</p></div>
            <div><div className="label mb-2">השלבים</div>
              <div className="flex gap-1 h-2 rounded-full overflow-hidden mb-2">
                {([1, 2, 3, 4, 5] as const).map((p) => <div key={p} className="flex-1" style={{ background: `linear-gradient(90deg, ${PHASE_COLORS[p]}, ${PHASE_COLORS2[p]})`, opacity: info === 'sleep' && p > 3 ? 0.15 : 1 }} />)}
              </div>
              <p className="text-[14px] opacity-85 leading-relaxed">{MODE_LONG[info].phases}</p>
            </div>
            <button onClick={() => { pick(info); setInfo(null) }} className="rounded-2xl py-4 btn-psy text-[17px] mt-2">{g(a, 'בחר', 'בחרי')} {MODE_META[info].name}</button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}

function BodyCard({ j, on, onPick }: { j: BodyJourney; on: boolean; onPick: () => void }) {
  return (
    <button onClick={onPick} className={`rounded-3xl p-4 text-right transition-all duration-500 border ${on ? 'chip-on' : 'card'}`}>
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-[18px] font-semibold">{j.title}</div>
        <div className="text-[14px] opacity-80 shrink-0">{j.defaultMin} דק'</div>
      </div>
      <div className="text-[14px] muted mt-1 leading-relaxed">{j.sub}</div>
    </button>
  )
}
