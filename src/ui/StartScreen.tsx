import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { type Album, type Mode, type Phase, db } from '../db'
import { BODY_JOURNEYS, BODY_LONG, type BodyJourney, bodyJourney, gx, isAdultUnlocked, isCoupleUnlocked, unlockAdult, unlockCouple } from '../engine/body'
import { g, hasChosenAddress, useAddress } from '../address'
import { AddressPicker } from './AddressPicker'
import { INTENTIONS, INTENTION_META, MODE_LONG, MODE_META, PHASE_COLORS, PHASE_COLORS2 } from '../engine/plan'

export interface StartChoice { mode: Mode; minutes: number; intention: string; voice: boolean; breath: boolean; albumId?: string; journey?: string; startTrackNo?: number; onlyPhases?: Phase[] }

const art = (n: string) => `${import.meta.env.BASE_URL}art/${n}.webp`
const MODE_ICON: Record<Mode, string> = { breath: '◌', meditation: '☾', deep: '✺', sleep: '☽', album: '♫', body: '❋' }
const MODE_GRAD: Record<Mode, [string, string]> = {
  breath: ['#7CCFBE', '#4F6FD6'],
  meditation: ['#B3A4F2', '#5E6AD2'],
  deep: ['#F2C26B', '#EBA17A'],
  sleep: ['#1B2A6B', '#0E0B18'],
  album: ['#EBA17A', '#B3A4F2'],
  body: ['#E39470', '#B3A4F2'],
}

export function StartScreen({ onStart, onAlbums }: { onStart: (c: StartChoice) => void; onAlbums?: () => void }) {
  const [mode, setMode] = useState<Mode>('breath')
  const [journey, setJourney] = useState<string | null>(null)
  const [adult, setAdult] = useState(isAdultUnlocked)
  const [gate, setGate] = useState(false)
  const [couple, setCouple] = useState(isCoupleUnlocked)
  const [gate2, setGate2] = useState(false)
  const [minutes, setMinutes] = useState(MODE_META.breath.defaultMin)
  const [intention, setIntention] = useState('שקט')
  const [custom, setCustom] = useState('')
  const [voice, setVoice] = useState(true)
  const [breath, setBreath] = useState(true)
  const [album, setAlbum] = useState<Album | null>(null)
  const [info, setInfo] = useState<Mode | null>(null)
  const [bInfo, setBInfo] = useState<BodyJourney | null>(null)
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
      <header className="relative -mx-5 -mt-12 h-[64vh] min-h-[440px] max-h-[720px] overflow-hidden">
        <div className="absolute inset-0" style={{ WebkitMaskImage: 'linear-gradient(180deg, #000 70%, transparent 100%)', maskImage: 'linear-gradient(180deg, #000 70%, transparent 100%)' }}>
          <img src={art('hero')} alt="" className="absolute inset-0 w-full h-full object-cover object-top kenburns" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(14,12,21,0.5) 0%, rgba(14,12,21,0) 20%, rgba(14,12,21,0) 45%, rgba(14,12,21,0.75) 85%)' }} />
        </div>
        <div className="absolute bottom-5 right-5 left-5 flex flex-col gap-2">
          <div className="text-[16px] opacity-85" style={{ textShadow: '0 1px 12px #000' }}>{greeting}</div>
          <h1 className="text-[58px] title-psy leading-[1.02] drop-shadow-[0_2px_18px_rgba(0,0,0,0.6)]">המדריך</h1>
          <p className="text-[16px] leading-relaxed opacity-95 max-w-[30ch]" style={{ textShadow: '0 1px 12px #000' }}>מסע פנימי עם מוזיקה, נשימה וקול. {g(a, 'בחר', 'בחרי')} את הדרך שלך – השאר קורה לבד.</p>
          <button onClick={() => document.getElementById('journeys')?.scrollIntoView({ behavior: 'smooth' })} className="self-start mt-2 rounded-full px-6 py-3 btn-psy text-[16px]">{g(a, 'בחר מסע', 'בחרי מסע')} ↓</button>
        </div>
      </header>

      {askAddress && (
        <section className="fade-in card rounded-3xl p-5 flex flex-col gap-3">
          <div className="text-[18px] font-semibold">איך לפנות אליך?</div>
          <p className="text-[14px] muted leading-relaxed">המדריכה תדבר אליך בלשון שתבחר/י. אפשר לשנות בכל רגע בספרייה ← הגדרות.</p>
          <AddressPicker />
          <button onClick={() => setAskAddress(false)} className="btn-psy rounded-2xl py-3 text-[16px]">{g(a, 'המשך', 'המשיכי')}</button>
        </section>
      )}

      <section id="journeys" className="flex flex-col gap-3 scroll-mt-6">
        <div className="label">המסע</div>
        <div className="grid grid-cols-2 gap-3">
          {modes.map((m) => {
            const active = mode === m
            const [g1] = MODE_GRAD[m]
            return (
              <div key={m} onClick={() => pick(m)} role="button"
                className="relative aspect-[3/4] rounded-3xl overflow-hidden cursor-pointer transition-all duration-500"
                style={{ boxShadow: active ? `0 0 0 2px ${g1}, 0 18px 44px -18px ${g1}` : '0 0 0 1px rgba(246,242,234,0.10)', transform: active ? 'scale(1.0)' : 'scale(0.985)' }}>
                <img src={art(m)} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1200ms]" style={{ transform: active ? 'scale(1.08)' : 'scale(1)' }} />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(14,12,21,0.15) 0%, rgba(14,12,21,0) 35%, rgba(14,12,21,0.92) 100%)' }} />
                <button onClick={(e) => { e.stopPropagation(); setInfo(m) }} aria-label="מה קורה במסע הזה?" className="absolute top-2.5 left-2.5 w-8 h-8 rounded-full text-[15px] font-semibold" style={{ background: 'rgba(14,12,21,0.55)', backdropFilter: 'blur(8px)', border: '1px solid rgba(246,242,234,0.25)' }}>i</button>
                <div className="absolute bottom-0 inset-x-0 p-3.5">
                  <div className="flex items-center gap-1.5"><span className="text-[16px]" style={{ color: g1 }}>{MODE_ICON[m]}</span><span className="text-[19px] font-semibold">{MODE_META[m].name}</span></div>
                  <div className="text-[13px] opacity-85 mt-0.5 leading-snug">{MODE_META[m].sub}</div>
                  <div className="text-[12.5px] opacity-70 mt-1 tabular-nums">{MODE_META[m].minMin}–{MODE_META[m].maxMin} דק'</div>
                </div>
              </div>
            )
          })}
        </div>
        <button onClick={() => onAlbums?.()} className="relative mt-1 aspect-[16/8] rounded-3xl overflow-hidden text-right" style={{ boxShadow: '0 0 0 1px rgba(246,242,234,0.10)' }}>
          <img src={art('album')} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(14,12,21,0) 20%, rgba(14,12,21,0.9) 100%)' }} />
          <div className="absolute inset-y-0 right-0 w-[62%] p-4 flex flex-col justify-center gap-1">
            <div className="label" style={{ color: '#F2C26B' }}>♫ מסע מאלבום</div>
            <div className="text-[19px] font-semibold leading-tight">{album ? album.name.replace(/^.*Psychedelic Prayers.*$/i, 'תפילות פסיכדליות') : 'תפילות פסיכדליות'}</div>
            <div className="text-[13px] opacity-85 leading-snug">{album ? `${album.trackCount} רצועות · ${Math.round(album.totalSec / 60)} דק' · מסע ויזואלי מלא` : 'מייבאים אלבום, והוא הופך למסע – עם נשימה ועולם ויזואלי'}</div>
          </div>
        </button>
      </section>

      <section className="flex flex-col gap-3">
        <div className="relative aspect-[16/7] rounded-3xl overflow-hidden" style={{ boxShadow: '0 0 0 1px rgba(246,242,234,0.10)' }}>
          <img src={art('solo')} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(14,12,21,0) 30%, rgba(14,12,21,0.92) 100%)' }} />
          <div className="absolute bottom-0 inset-x-0 p-4"><div className="label" style={{ color: '#EBA17A' }}>גוף ומיניות · 18+</div><div className="text-[14px] opacity-90 leading-relaxed mt-1">מסעות אישיים לגוף, לתשוקה ולעונג. חושני ולא מפורש, בקצב שלך. מומלץ במקום פרטי ועם אוזניות.</div></div>
        </div>
        {BODY_JOURNEYS.filter((j) => j.level === 1).map((j) => <BodyCard key={j.id} j={j} on={mode === 'body' && journey === j.id} onPick={() => pickBody(j)} onInfo={() => setBInfo(j)} />)}
        <div className="label mt-2">מתקדם · מגע ועוררות</div>
        {adult
          ? BODY_JOURNEYS.filter((j) => j.level === 2).map((j) => <BodyCard key={j.id} j={j} on={mode === 'body' && journey === j.id} onPick={() => pickBody(j)} onInfo={() => setBInfo(j)} />)
          : (
            <button onClick={() => setGate(true)} className="card rounded-3xl p-5 text-right flex items-center gap-4">
              <span className="text-[26px]">🔒</span>
              <span className="flex-1"><span className="block text-[17px] font-semibold">שלושה מסעות מתקדמים</span><span className="block text-[14px] muted mt-0.5">מגע מודע · נשימת אש · עונג בלי יעד</span></span>
              <span className="text-[14px] font-medium">פתיחה</span>
            </button>
          )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="relative aspect-[16/7] rounded-3xl overflow-hidden" style={{ boxShadow: '0 0 0 1px rgba(246,242,234,0.10)', background: '#000' }}>
          <img src={art('couple')} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-contain" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(14,12,21,0) 30%, rgba(14,12,21,0.92) 100%)' }} />
          <div className="absolute bottom-0 inset-x-0 p-4"><div className="label" style={{ color: '#B3A4F2' }}>ערב זוגי · 18+</div><div className="text-[14px] opacity-90 leading-relaxed mt-1">ערבים לשני בני זוג יחד. ההנחיה פונה לשניכם, ופעם אליו ופעם אליה, ועל המסך כתוב של מי התור.</div></div>
        </div>
        {couple
          ? BODY_JOURNEYS.filter((j) => j.level === 3).map((j) => <BodyCard key={j.id} j={j} on={mode === 'body' && journey === j.id} onPick={() => pickBody(j)} onInfo={() => setBInfo(j)} />)
          : (
            <button onClick={() => setGate2(true)} className="card rounded-3xl p-5 text-right flex items-center gap-4">
              <span className="text-[26px]">🔒</span>
              <span className="flex-1"><span className="block text-[17px] font-semibold">שלושה ערבים זוגיים</span><span className="block text-[14px] muted mt-0.5">נשימה משותפת · מגע שמקשיב · ערב של תשוקה</span></span>
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

      {gate2 && createPortal(
        <div className="fixed inset-0 flex items-end" style={{ zIndex: 1000, background: 'rgba(7,5,16,0.88)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }} onClick={() => setGate2(false)}>
          <div className="fade-in sheet w-full rounded-t-[32px] p-6 pb-[calc(env(safe-area-inset-bottom)+24px)] flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full bg-ink/30 self-center -mt-2" />
            <h2 className="text-[24px] font-semibold">ערב זוגי</h2>
            <p className="text-[15px] leading-relaxed">ערבים של קרבה, מגע ותשוקה לשני בני זוג. ההנחיה עוצרת לפני מין עצמו ומשאירה אתכם עם המוזיקה.</p>
            <p className="text-[14px] muted leading-relaxed">בכל ערב בוחרים מילת עצירה, ויש בדיקות "זה עדיין טוב?". אין חובה להגיע לשום מקום. כל אחד מכם יכול לעצור בכל רגע, בלי הסברים.</p>
            <button onClick={() => { unlockCouple(); setCouple(true); setGate2(false) }} className="btn-psy rounded-2xl py-4 text-[16px]">שנינו מעל 18, בהסכמה, במקום פרטי</button>
            <button onClick={() => setGate2(false)} className="text-[15px] muted py-2">לא עכשיו</button>
          </div>
        </div>,
        document.body,
      )}

      {bInfo && <BodyInfo j={bInfo} onClose={() => setBInfo(null)} onPick={() => { pickBody(bInfo); setBInfo(null) }} />}

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

function BodyCard({ j, on, onPick, onInfo }: { j: BodyJourney; on: boolean; onPick: () => void; onInfo: () => void }) {
  return (
    <div onClick={onPick} role="button" className={`rounded-3xl p-4 text-right transition-all duration-500 border cursor-pointer ${on ? 'chip-on' : 'card'}`}>
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-[18px] font-semibold">{j.title}</div>
        <div className="text-[14px] opacity-80 shrink-0">{j.defaultMin} דק'</div>
      </div>
      <div className="text-[14px] muted mt-1 leading-relaxed">{j.sub}</div>
      <button onClick={(e) => { e.stopPropagation(); onInfo() }} className="text-[14px] mt-2 underline underline-offset-4 opacity-80">מה קורה במסע הזה?</button>
    </div>
  )
}

function BodyInfo({ j, onClose, onPick }: { j: BodyJourney; onClose: () => void; onPick: () => void }) {
  const a = useAddress()
  const L = BODY_LONG[j.id]
  if (!L) return null
  const solo = j.level < 3
  return createPortal(
    <div className="fixed inset-0 flex items-end" style={{ zIndex: 1000, background: 'rgba(7,5,16,0.88)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }} onClick={onClose}>
      <div className="fade-in w-full max-h-[92vh] overflow-y-auto rounded-t-[32px] flex flex-col" style={{ background: '#15112A', border: '1px solid rgba(246,242,234,0.14)' }} onClick={(e) => e.stopPropagation()}>
        <div className="relative h-44 shrink-0 overflow-hidden rounded-t-[32px]" style={{ background: '#000' }}>
          <img src={art(solo ? 'body' : 'couple')} alt="" className={`absolute inset-0 w-full h-full ${solo ? 'object-cover' : 'object-contain'}`} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(21,17,42,0) 30%, #15112A 100%)' }} />
          <div className="absolute bottom-3 right-6 left-6"><div className="label">{j.level === 1 ? 'גוף ומיניות' : j.level === 2 ? 'מתקדם · מגע ועוררות' : 'ערב זוגי'} · {j.minMin}–{j.maxMin} דק'</div><h2 className="text-[26px] font-semibold leading-tight">{j.title}</h2></div>
        </div>
        <div className="px-6 pt-2 pb-[calc(env(safe-area-inset-bottom)+24px)] flex flex-col gap-4">
          <p className="text-[16px] leading-relaxed">{gx(a, L.what)}</p>
          <div><div className="label mb-2">מה קורה, שלב אחרי שלב</div>
            <ol className="flex flex-col gap-1.5">{L.stages.map((st, i) => <li key={i} className="flex gap-2.5 text-[15px] leading-relaxed"><span className="shrink-0 w-6 h-6 rounded-full text-[12px] flex items-center justify-center mt-0.5" style={{ background: 'rgba(242,194,107,0.16)', color: '#F2C26B' }}>{i + 1}</span><span className="opacity-90">{gx(a, st)}</span></li>)}</ol>
          </div>
          <div><div className="label mb-1">למי ומתי</div><p className="text-[15px] opacity-85 leading-relaxed">{gx(a, L.forWhom)}</p></div>
          {(!solo || a === 'f') && <div><div className="label mb-1">מה רואים על המסך</div><p className="text-[15px] opacity-85 leading-relaxed">{gx(a, L.visuals)}</p></div>}
          <div className="rounded-2xl p-3.5 text-[14px] leading-relaxed" style={{ background: 'rgba(124,207,190,0.08)', border: '1px solid rgba(124,207,190,0.25)' }}><span className="font-semibold">בטיחות · </span>{gx(a, L.safety)} לחיצה ארוכה של 3 שניות – דרך הביתה, תמיד.</div>
          <div><div className="label mb-1">שאלה ליומן</div><p className="text-[15px] opacity-90 italic">״{j.question}״</p></div>
          <button onClick={onPick} className="rounded-2xl py-4 btn-psy text-[17px] mt-1">{g(a, 'בחר', 'בחרי')} {j.title}</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
