import { useEffect, useRef, useState } from 'react'
import type { Settings } from '../db'
import { type EngineState, type SessionEngine, BREATH_PATTERNS } from '../engine/audio'
import { PHASE_COLORS, PHASE_COLORS2, PHASE_NAMES } from '../engine/plan'
import { Cosmos } from './Cosmos'
import { Orb } from './Orb'
import { CastSheet } from './CastSheet'
import { CoupleFigures } from './CoupleFigures'
import { AlbumVisuals, pickVisual } from './AlbumVisuals'
import { bodyJourney } from '../engine/body'
import { g, useAddress } from '../address'

const BREATH_WORD = { inhale: 'שאיפה', hold: 'החזק', exhale: 'נשיפה', hold2: 'החזק', none: '' } as const
const fmt = (sec: number) => `${Math.floor(sec / 60)}:${Math.floor(sec % 60).toString().padStart(2, '0')}`

export function JourneyScreen({ engine, settings, onEnd }: { engine: SessionEngine; settings: Settings; onEnd: (actualSec: number, completed: boolean) => void }) {
  const [s, setS] = useState<EngineState>(engine.state)
  const [toast, setToast] = useState<string | null>(null)
  const [emergency, setEmergency] = useState(false)
  const [confirmExit, setConfirmExit] = useState(false)
  const [awake, setAwake] = useState(true)
  // couple video in landscape: a tap hides every caption and control (clean view), another tap brings them back
  const [clean, setClean] = useState(false)
  const [scrub, setScrub] = useState<number | null>(null) // 0..1 while dragging the progress bar
  const [hint, setHint] = useState(true)
  const [tv, setTvState] = useState(() => { try { return localStorage.getItem('hamadrich:tv') === '1' } catch { return false } })
  const setTv = (v: boolean) => { setTvState(v); try { localStorage.setItem('hamadrich:tv', v ? '1' : '0') } catch { /* */ } }
  const [castOpen, setCastOpen] = useState(false)
  const [vp, setVp] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))
  const pressStart = useRef(0)
  const touchY = useRef(0)
  const wasAsleep = useRef(false)
  const wakeLock = useRef<WakeLockSentinel | null>(null)
  const orbRef = useRef<HTMLDivElement>(null)
  const orbCenter = () => { const r = orbRef.current?.getBoundingClientRect(); return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null }
  const endedRef = useRef(false)
  const isAlbum = engine.plan.mode === 'album'
  const isCouple = bodyJourney(engine.plan.journey)?.level === 3
  // Psychedelic Prayers: the built-in visual journey fills the screen (only for the known recording of each track)
  const visual = engine.plan.visuals === 'prayers' ? pickVisual(s.albumTrack, s.t - s.trackStart, s.trackDur) : null
  const a = useAddress()

  useEffect(() => { const off = engine.on(setS); return () => { off() } }, [engine])
  useEffect(() => { const on = () => setVp({ w: window.innerWidth, h: window.innerHeight }); window.addEventListener('resize', on); return () => window.removeEventListener('resize', on) }, [])
  useEffect(() => { const id = setTimeout(() => setHint(false), 9000); return () => clearTimeout(id) }, [])
  useEffect(() => {
    if (!awake) return
    const id = setTimeout(() => setAwake(false), 12000)
    return () => clearTimeout(id)
  }, [awake])
  useEffect(() => {
    // TV mode keeps the screen on all the way (it is being watched / mirrored); otherwise the peak lets it sleep
    const want = (tv || s.phase !== 3 || !!visual) && 'wakeLock' in navigator
    if (want && !wakeLock.current) navigator.wakeLock.request('screen').then((l) => { wakeLock.current = l }).catch(() => {})
    if (!want && wakeLock.current) { void wakeLock.current.release(); wakeLock.current = null }
  }, [s.phase, tv, !!visual]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { void wakeLock.current?.release() }, [])
  useEffect(() => {
    if (s.done && !endedRef.current) { endedRef.current = true; setTimeout(() => onEnd(Math.round(s.t), true), 2500) }
  }, [s.done, s.t, onEnd])

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2200) }
  const exit = () => { engine.stop(); onEnd(Math.round(s.t), false) }
  const isUI = (e: React.PointerEvent) => !!(e.target as HTMLElement).closest('button, input, [data-ui]')

  const onDown = (e: React.PointerEvent) => {
    if (isUI(e)) return
    wasAsleep.current = !awake
    setAwake(true); pressStart.current = Date.now(); touchY.current = e.clientY
  }
  const onUp = (e: React.PointerEvent) => {
    if (isUI(e) || !pressStart.current) return
    const held = Date.now() - pressStart.current; pressStart.current = 0
    // the phone stopped the music: any tap brings it back (and the journey with it)
    if (s.blocked && !emergency && !confirmExit) { engine.resume(); flash('ממשיכים'); return }
    const dy = touchY.current - e.clientY
    if (emergency || confirmExit) return
    const cleanable = ((isCouple && vp.w > vp.h) || !!visual) && Math.abs(dy) < 90 && held < 700
    if (cleanable && clean) { setClean(false); return }
    if (wasAsleep.current && held < 700 && Math.abs(dy) < 90) { wasAsleep.current = false; return }
    if (dy > 90) { engine.skipToReturn(); flash('מדלג לחזרה'); return }
    if (held >= 3000) { setEmergency(true); engine.calm(); return }
    if (held >= 700) { engine.extend(600); flash('עוד עשר דקות'); return }
    if (cleanable) { setClean(true); flash('תצוגה נקייה · הקשה מחזירה'); return }
    if (s.paused) { engine.resume(); flash('ממשיכים') } else { engine.pause(); flash('עצירה') }
  }

  const color = PHASE_COLORS[s.phase], color2 = PHASE_COLORS2[s.phase]
  const progress = Math.min(1, s.t / s.durationSec)
  const remaining = Math.max(0, s.durationSec - s.t)
  const spans = engine.phaseSpans()
  const pat = BREATH_PATTERNS[s.breathPattern]
  const stepSec = s.breath === 'inhale' ? pat.inhale : s.breath === 'exhale' ? pat.exhale : s.breath === 'hold' ? pat.hold : pat.hold2
  const breathIntensity = s.breath === 'inhale' ? s.breathProgress : s.breath === 'exhale' ? 1 - s.breathProgress : s.breath === 'hold' ? 1 : s.phase === 3 ? 0.7 : 0.4
  const peak = s.phase === 3 && !s.paused
  const dimAll = peak && !awake && !tv && !isCouple // couples need the turn label even in the quiet peak
  // RTL bar: time runs from right to left
  const scrubFrac = (e: React.PointerEvent<HTMLElement>) => { const r = e.currentTarget.getBoundingClientRect(); return Math.max(0, Math.min(1, (r.right - e.clientX) / r.width)) }
  const shownT = scrub !== null ? scrub * s.durationSec : s.t
  const ui = clean ? { opacity: 0, transition: 'opacity 600ms', pointerEvents: 'none' as React.CSSProperties['pointerEvents'] } : { opacity: awake ? 1 : tv ? 0 : 0.6, transition: 'opacity 1200ms', pointerEvents: (tv && !awake ? 'none' : 'auto') as React.CSSProperties['pointerEvents'] }
  const landscape = vp.w > vp.h
  const compact = landscape && !tv // phone rotated by accident (e.g. lying down): keep everything on screen
  const orbSize = Math.round(tv ? Math.min(vp.w, vp.h) * (landscape ? 0.66 : 0.72) : compact ? Math.min(220, vp.h * 0.45) : Math.min(290, vp.h * 0.38, vp.w * 0.78))

  if (emergency) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-8 text-center fade-in" style={{ background: 'radial-gradient(circle at 50% 30%, #4a3416 0%, #1a1208 60%)' }}>
        <div className="w-44 h-44 rounded-full mb-10 aura" style={{ background: 'radial-gradient(circle, #f3e2b3 0%, #d99a3c 55%, transparent 72%)', opacity: 0.7, boxShadow: '0 0 80px #d99a3c88' }} />
        <p className="text-[20px] leading-relaxed mb-10">{g(a, 'אתה בסדר. אמור את שמך. איפה אתה נמצא. הרגליים על הרצפה. נשימה איטית.', 'את בסדר. אמרי את שמך. איפה את נמצאת. הרגליים על הרצפה. נשימה איטית.')}</p>
        <button onClick={() => { setEmergency(false); engine.skipToReturn() }} className="w-full rounded-2xl py-5 text-[18px] bg-ink text-bg mb-3">חזרה הביתה</button>
        {settings.emergencyPhone && (
          <a href={`tel:${settings.emergencyPhone}`} className="w-full rounded-2xl py-5 text-[18px] border border-ink/40 block">התקשר ל{settings.emergencyName ? `-${settings.emergencyName}` : ''}</a>
        )}
        <button onClick={exit} className="mt-6 text-[15px] opacity-80">סיים עכשיו</button>
      </div>
    )
  }

  return (
    <div onPointerDown={onDown} onPointerUp={onUp} onContextMenu={(e) => e.preventDefault()}
      className="h-full relative flex flex-col items-center select-none touch-none overflow-hidden" style={{ background: '#070510' }}>
      <Cosmos color={color} color2={color2} intensity={breathIntensity} phase={s.phase} paused={s.paused} levels={() => engine.levels()} focus={orbCenter} />
      {visual && <>
        <AlbumVisuals pick={visual} paused={s.paused} levels={() => engine.levels()} />
        {/* soft shades keep the captions and the player readable over the scene */}
        <div className="absolute inset-x-0 top-0 h-[22%] pointer-events-none" style={{ opacity: clean ? 0 : 1, transition: 'opacity 600ms', background: 'linear-gradient(to bottom, rgba(7,5,16,0.7), transparent)' }} />
        <div className="absolute inset-x-0 bottom-0 h-[42%] pointer-events-none" style={{ opacity: clean ? 0 : 1, transition: 'opacity 600ms', background: 'linear-gradient(to top, rgba(7,5,16,0.85), transparent)' }} />
      </>}
      {isCouple && landscape && <>
        {/* landscape / TV: the couple fills the screen; a soft shade at the bottom keeps the turn label readable */}
        <CoupleFigures mode="fill" label={s.label} paused={s.paused} levels={() => engine.levels()} />
        <div className="absolute inset-x-0 bottom-0 h-[38%] pointer-events-none" style={{ opacity: clean ? 0 : 1, transition: 'opacity 600ms', background: 'linear-gradient(to top, rgba(7,5,16,0.85), transparent)' }} />
      </>}

      {/* top bar */}
      <div className="relative w-full flex justify-between items-center px-4 pt-[calc(env(safe-area-inset-top)+10px)]" style={ui}>
        <button onClick={() => setConfirmExit(true)} className="w-12 h-12 rounded-full btn-ghost bg-bg/40 backdrop-blur text-[20px] leading-none">✕</button>
        <div className="text-center">
          <div className="text-[16px] font-semibold tracking-[0.12em]" style={{ color: color2, textShadow: `0 0 12px ${color2}` }}>{s.phaseName}</div>
          <div className="text-[13px] opacity-75 mt-0.5">{engine.plan.intention}</div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setCastOpen(true)} aria-label="שידור למכשיר" className="w-12 h-12 rounded-full btn-ghost bg-bg/40 backdrop-blur flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6" /><path d="M3 12a9 9 0 0 1 9 9" /><path d="M3 16a5 5 0 0 1 5 5" /><path d="M3 20h.01" /></svg>
          </button>
          <button onClick={() => (s.paused ? engine.resume() : engine.pause())} className="w-12 h-12 rounded-full btn-ghost bg-bg/40 backdrop-blur text-[16px] leading-none">{s.paused ? '▶' : '❚❚'}</button>
        </div>
      </div>

      {/* center */}
      <div className={`relative flex-1 flex ${tv && landscape && !isCouple ? 'flex-row gap-[6vw]' : 'flex-col'} items-center ${isCouple && landscape ? 'justify-end pb-[calc(env(safe-area-inset-bottom)+12px)]' : tv ? 'justify-center' : isCouple ? 'justify-start pt-2' : 'justify-start pt-6'}`}>
        <div ref={orbRef}>{isCouple
          ? (landscape ? null : <CoupleFigures mode="box" label={s.label} paused={s.paused} levels={() => engine.levels()} size={{ w: vp.w, h: Math.round(Math.min(vp.h * (tv ? 0.62 : 0.56), vp.w * 1.25)) }} />)
          : visual ? null
          : <Orb color={color} color2={color2} breath={s.breath} stepSec={stepSec} progress={progress} dim={dimAll} size={orbSize} />}</div>
        <div className={`${isCouple ? (landscape ? '' : 'mt-3') : tv ? (landscape ? 'min-w-[24vw]' : 'mt-[4vh]') : 'min-h-20 mt-8'} flex flex-col items-center`} style={{ opacity: (dimAll || clean) && !s.blocked ? 0 : 1, transition: `opacity ${clean ? 600 : 1200}ms` }}>
          {s.label && <div key={s.label} className="fade-in text-[clamp(20px,4.5vmin,44px)] font-semibold mb-3 text-center px-4" style={{ color: color2, textShadow: `0 0 24px ${color}` }}>{s.label}</div>}
          {s.breath !== 'none' && !s.paused ? (
            <>
              <div className={`${tv ? 'text-[clamp(32px,6vmin,72px)]' : 'text-[28px]'} font-semibold tracking-wide`} style={{ textShadow: `0 0 28px ${color2}` }}>{BREATH_WORD[s.breath]}</div>
              <div className="text-[14px] opacity-75 mt-1">{pat.label}</div>
            </>
          ) : (
            s.blocked
              ? <div className="text-[18px] font-semibold text-center px-6" style={{ textShadow: '0 1px 10px #000' }}>הטלפון עצר את המוזיקה · נגיעה להמשך</div>
              : <div className="text-[20px] font-semibold opacity-85 tabular-nums">{s.paused ? 'עצירה' : s.done ? 'המסע נגמר' : fmt(remaining)}</div>
          )}
        </div>
      </div>

      {/* TV mode: quiet corner info instead of the player */}
      {tv && (
        <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+14px)] inset-x-0 flex justify-between px-6 text-[clamp(13px,2vmin,20px)] tabular-nums pointer-events-none" style={{ opacity: 0.55 }}>
          <span style={{ color: color2 }}>{s.phaseName}</span><span>-{fmt(remaining)}</span>
        </div>
      )}

      {/* player */}
      {!tv && <div data-ui className="relative w-full px-5 pb-[calc(env(safe-area-inset-bottom)+16px)] flex flex-col gap-3" style={ui} onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()}>
        {/* progress bar: drag (or tap) anywhere to move forward / back; tall invisible hit area for fingers */}
        <div className="relative py-3 -my-3 cursor-pointer touch-none"
          onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setScrub(scrubFrac(e)) }}
          onPointerMove={(e) => { if (scrub !== null) setScrub(scrubFrac(e)) }}
          onPointerUp={(e) => { if (scrub === null) return; const f = scrubFrac(e); setScrub(null); engine.seekTo(f * s.durationSec) }}
          onPointerCancel={() => setScrub(null)}>
          <div className="flex gap-1 h-2.5 rounded-full overflow-hidden" style={{ transform: scrub !== null ? 'scaleY(1.6)' : 'none', transition: 'transform 150ms' }}>
            {spans.map((p) => {
              const len = (p.endSec - p.startSec) / s.durationSec
              const fill = Math.max(0, Math.min(1, (shownT - p.startSec) / (p.endSec - p.startSec)))
              return (
                <div key={p.n} style={{ flex: len }} className="relative h-full rounded-full overflow-hidden bg-white/10" title={PHASE_NAMES[p.n]}>
                  <div className="absolute inset-y-0 right-0" style={{ width: `${fill * 100}%`, background: `linear-gradient(90deg, ${PHASE_COLORS[p.n]}, ${PHASE_COLORS2[p.n]})` }} />
                </div>
              )
            })}
          </div>
          <div className="absolute top-1/2 w-5 h-5 -mt-2.5 rounded-full bg-ink pointer-events-none" style={{ right: `calc(${(shownT / s.durationSec) * 100}% - 10px)`, boxShadow: `0 0 0 4px ${color}55, 0 2px 8px rgba(0,0,0,0.5)`, opacity: scrub !== null ? 1 : 0.85 }} />
        </div>
        <div className="flex justify-between text-[13px] opacity-80 tabular-nums -mt-1"><span>{fmt(shownT)}</span><span>{spans.map((p) => PHASE_NAMES[p.n]).join(' · ')}</span><span>-{fmt(Math.max(0, s.durationSec - shownT))}</span></div>

        {/* track + transport */}
        {!compact && <><div className="rounded-2xl px-4 py-3 flex items-center gap-3" style={{ background: 'rgba(14,11,24,0.55)', border: '1px solid rgba(242,238,230,0.12)', backdropFilter: 'blur(14px)' }}>
          <div className="flex-1 min-w-0">
            <div className="text-[15px] truncate">{s.trackName || (isAlbum ? '…' : 'דרון מובנה')}</div>
            <div className="text-[13px] opacity-75">{isAlbum && s.trackCount ? `רצועה ${s.trackNo} מתוך ${s.trackCount}` : `${PHASE_NAMES[s.phase]} · ${engine.plan.mode === 'breath' ? 'נשימה' : engine.plan.intention}`}</div>
          </div>
          {isAlbum && <button onClick={() => engine.prevTrack()} className="w-10 h-10 rounded-full text-[18px] opacity-85">⏮</button>}
          <button onClick={() => (s.paused ? engine.resume() : engine.pause())} className="w-12 h-12 rounded-full text-[18px]" style={{ background: `linear-gradient(135deg, ${color2}, ${color})`, color: '#0E0B18' }}>{s.paused ? '▶' : '❚❚'}</button>
          {isAlbum && <button onClick={() => engine.nextTrack()} className="w-10 h-10 rounded-full text-[18px] opacity-85">⏭</button>}
          <button onClick={() => { engine.extend(600); flash('עוד עשר דקות') }} className="text-[13px] px-2 py-1 rounded-full btn-ghost">+10</button>
        </div>
        <div className="flex items-center gap-3 px-1">
          <span className="text-[14px] opacity-75">🔈</span>
          <input type="range" min={0} max={1} step={0.02} value={s.musicGain} onChange={(e) => engine.setMusicGain(+e.target.value)} className="flex-1" />
          <span className="text-[14px] opacity-75">🔊</span>
        </div></>}
      </div>}

      {hint && !s.done && !tv && !compact && (
        <div className="fade-in absolute bottom-[calc(env(safe-area-inset-bottom)+190px)] text-center text-[13px] opacity-80 leading-relaxed px-10" style={{ textShadow: '0 1px 8px #000' }}>
          נגיעה במרכז – עצירה · לחיצה ארוכה – +10 דק' · החלקה למעלה – לחזרה · 3 שניות – חירום
        </div>
      )}
      {toast && <div className="fade-in absolute top-[calc(env(safe-area-inset-top)+70px)] text-[15px] px-4 py-2 rounded-full" style={{ background: 'rgba(14,11,24,0.6)', backdropFilter: 'blur(10px)' }}>{toast}</div>}

      {castOpen && <CastSheet getMedia={() => engine.castMedia()} tv={tv} onTv={setTv} onClose={() => setCastOpen(false)} />}

      {confirmExit && (
        <div className="absolute inset-0 z-20 bg-bg/85 backdrop-blur-xl flex flex-col items-center justify-center px-8 gap-3 fade-in" data-ui onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()}>
          <p className="text-[20px] text-center mb-2">לסיים את המסע עכשיו?</p>
          <button onClick={exit} className="w-full rounded-2xl py-4 btn-psy text-[17px]">סיים ועבור ליומן</button>
          <button onClick={() => { engine.skipToReturn(); setConfirmExit(false) }} className="w-full rounded-2xl py-4 btn-ghost text-[17px]">דלג לשלב החזרה</button>
          <button onClick={() => setConfirmExit(false)} className="text-[15px] opacity-80 py-3">המשך במסע</button>
        </div>
      )}
    </div>
  )
}
