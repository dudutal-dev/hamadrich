import { useEffect, useRef, useState } from 'react'
import type { Settings } from '../db'
import { type EngineState, type SessionEngine, BREATH_PATTERNS } from '../engine/audio'
import { PHASE_COLORS, PHASE_COLORS2 } from '../engine/plan'
import { Orb } from './Orb'

const BREATH_WORD = { inhale: 'שאיפה', hold: 'החזק', exhale: 'נשיפה', hold2: 'החזק', none: '' } as const

export function JourneyScreen({ engine, settings, onEnd }: { engine: SessionEngine; settings: Settings; onEnd: (actualSec: number, completed: boolean) => void }) {
  const [s, setS] = useState<EngineState>(engine.state)
  const [toast, setToast] = useState<string | null>(null)
  const [emergency, setEmergency] = useState(false)
  const [confirmExit, setConfirmExit] = useState(false)
  const [awake, setAwake] = useState(true)
  const [hint, setHint] = useState(true)
  const pressStart = useRef(0)
  const touchY = useRef(0)
  const wakeLock = useRef<WakeLockSentinel | null>(null)
  const endedRef = useRef(false)

  useEffect(() => { const off = engine.on(setS); return () => { off() } }, [engine])
  useEffect(() => { const id = setTimeout(() => setHint(false), 9000); return () => clearTimeout(id) }, [])
  useEffect(() => {
    if (!awake) return
    const id = setTimeout(() => setAwake(false), 10000)
    return () => clearTimeout(id)
  }, [awake])
  useEffect(() => {
    const want = s.phase !== 3 && 'wakeLock' in navigator
    if (want && !wakeLock.current) navigator.wakeLock.request('screen').then((l) => { wakeLock.current = l }).catch(() => {})
    if (!want && wakeLock.current) { void wakeLock.current.release(); wakeLock.current = null }
  }, [s.phase])
  useEffect(() => () => { void wakeLock.current?.release() }, [])
  useEffect(() => {
    if (s.done && !endedRef.current) { endedRef.current = true; setTimeout(() => onEnd(Math.round(s.t), true), 2500) }
  }, [s.done, s.t, onEnd])

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2200) }
  const exit = () => { engine.stop(); onEnd(Math.round(s.t), false) }

  const wasAsleep = useRef(false)
  const onDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    wasAsleep.current = !awake
    setAwake(true); pressStart.current = Date.now(); touchY.current = e.clientY
  }
  const onUp = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    if (!pressStart.current) return
    const held = Date.now() - pressStart.current; pressStart.current = 0
    const dy = touchY.current - e.clientY
    if (emergency || confirmExit) return
    if (wasAsleep.current && held < 700 && Math.abs(dy) < 90) { wasAsleep.current = false; return }
    if (dy > 90) { engine.skipToReturn(); flash('מדלג לחזרה'); return }
    if (held >= 3000) { setEmergency(true); engine.calm(); return }
    if (held >= 700) { engine.extend(600); flash('עוד עשר דקות'); return }
    if (s.paused) { engine.resume(); flash('ממשיכים') } else { engine.pause(); flash('עצירה') }
  }

  const color = PHASE_COLORS[s.phase], color2 = PHASE_COLORS2[s.phase]
  const progress = Math.min(1, s.t / s.durationSec)
  const remaining = Math.max(0, s.durationSec - s.t)
  const mm = Math.floor(remaining / 60), ss = Math.floor(remaining % 60)
  const pat = BREATH_PATTERNS[s.breathPattern]
  const stepSec = s.breath === 'inhale' ? pat.inhale : s.breath === 'exhale' ? pat.exhale : s.breath === 'hold' ? pat.hold : pat.hold2
  const peak = s.phase === 3 && !s.paused
  const dimAll = peak && !awake

  if (emergency) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-8 text-center fade-in" style={{ background: 'radial-gradient(circle at 50% 30%, #4a3416 0%, #1a1208 60%)' }}>
        <div className="w-44 h-44 rounded-full mb-10 aura" style={{ background: 'radial-gradient(circle, #f3e2b3 0%, #d99a3c 55%, transparent 72%)', opacity: 0.7, boxShadow: '0 0 80px #d99a3c88' }} />
        <p className="text-[20px] leading-relaxed mb-10">אתה בסדר. אמור את שמך. איפה אתה נמצא. הרגליים על הרצפה. נשימה איטית.</p>
        <button onClick={() => { setEmergency(false); engine.skipToReturn() }} className="w-full rounded-2xl py-5 text-[18px] bg-ink text-bg mb-3">חזרה הביתה</button>
        {settings.emergencyPhone && (
          <a href={`tel:${settings.emergencyPhone}`} className="w-full rounded-2xl py-5 text-[18px] border border-ink/40 block">התקשר ל{settings.emergencyName ? `-${settings.emergencyName}` : ''}</a>
        )}
        <button onClick={exit} className="mt-6 text-[15px] opacity-70">סיים עכשיו</button>
      </div>
    )
  }

  return (
    <div onPointerDown={onDown} onPointerUp={onUp} onContextMenu={(e) => e.preventDefault()}
      className="h-full relative flex flex-col items-center justify-center select-none touch-none overflow-hidden"
      style={{ background: '#0E0B18', transition: 'background 2000ms' }}>
      {/* aurora layers */}
      <div className="aurora" style={{ ['--c1' as string]: color, ['--c2' as string]: color2, opacity: peak ? 0.55 : 0.9, transition: 'opacity 3000ms' }} />

      {/* top controls */}
      <div className="absolute top-0 right-0 left-0 flex justify-between items-center px-4 pt-[calc(env(safe-area-inset-top)+10px)]" style={{ opacity: awake ? 1 : 0.35, transition: 'opacity 1200ms' }}>
        <button onClick={() => setConfirmExit(true)} className="w-12 h-12 rounded-full border border-ink/30 bg-bg/50 backdrop-blur text-[20px] leading-none">✕</button>
        <div className="text-[13px] tracking-[0.3em]" style={{ color: color2 }}>{s.phaseName}</div>
        <button onClick={() => (s.paused ? engine.resume() : engine.pause())} className="w-12 h-12 rounded-full border border-ink/30 bg-bg/50 backdrop-blur text-[16px] leading-none">{s.paused ? '▶' : '❚❚'}</button>
      </div>

      <Orb color={color} color2={color2} breath={s.breath} stepSec={stepSec} progress={progress} dim={dimAll} />

      <div className="h-20 mt-12 flex flex-col items-center" style={{ opacity: dimAll ? 0 : 1, transition: 'opacity 1200ms' }}>
        {s.breath !== 'none' && !s.paused ? (
          <>
            <div className="text-[26px] font-light tracking-wide" style={{ textShadow: `0 0 24px ${color2}88` }}>{BREATH_WORD[s.breath]}</div>
            <div className="text-[13px] opacity-55 mt-1">{pat.label} · {mm}:{ss.toString().padStart(2, '0')}</div>
          </>
        ) : (
          <div className="text-[17px] opacity-70 tabular-nums">{s.paused ? 'עצירה' : `${mm}:${ss.toString().padStart(2, '0')}`}</div>
        )}
      </div>

      {hint && !s.done && (
        <div className="fade-in absolute bottom-[calc(env(safe-area-inset-bottom)+28px)] text-center text-[13px] opacity-60 leading-relaxed px-8">
          נגיעה – עצירה · לחיצה ארוכה – עוד 10 דקות · החלקה למעלה – לחזרה · 3 שניות – חירום
        </div>
      )}
      {s.done && <div className="fade-in text-[19px] opacity-80 mt-4">המסע נגמר</div>}
      {toast && <div className="fade-in absolute bottom-[calc(env(safe-area-inset-bottom)+70px)] text-[15px] opacity-80">{toast}</div>}

      {confirmExit && (
        <div className="absolute inset-0 bg-bg/85 backdrop-blur flex flex-col items-center justify-center px-8 gap-4 fade-in" onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()}>
          <p className="text-[19px] text-center">לסיים את המסע עכשיו?</p>
          <button onClick={exit} className="w-full rounded-2xl py-4 bg-ink text-bg text-[17px]">סיים ועבור ליומן</button>
          <button onClick={() => { engine.skipToReturn(); setConfirmExit(false) }} className="w-full rounded-2xl py-4 border border-ink/30 text-[17px]">דלג לשלב החזרה</button>
          <button onClick={() => setConfirmExit(false)} className="text-[15px] opacity-70 py-2">המשך במסע</button>
        </div>
      )}
    </div>
  )
}
