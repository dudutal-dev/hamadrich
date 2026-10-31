import { useEffect, useRef, useState } from 'react'
import type { Settings } from '../db'
import { type EngineState, type SessionEngine, BREATH_PATTERNS } from '../engine/audio'
import { PHASE_COLORS } from '../engine/plan'
import { Ring } from './Ring'

const BREATH_WORD = { inhale: 'שאיפה', hold: 'החזק', exhale: 'נשיפה', hold2: 'החזק', none: '' } as const

export function JourneyScreen({ engine, settings, onEnd }: { engine: SessionEngine; settings: Settings; onEnd: (actualSec: number, completed: boolean) => void }) {
  const [s, setS] = useState<EngineState>(engine.state)
  const [toast, setToast] = useState<string | null>(null)
  const [emergency, setEmergency] = useState(false)
  const [awake, setAwake] = useState(true)
  const longPress = useRef<number | null>(null)
  const pressStart = useRef(0)
  const touchY = useRef(0)
  const wakeLock = useRef<WakeLockSentinel | null>(null)
  const endedRef = useRef(false)

  useEffect(() => { const off = engine.on(setS); return () => { off() } }, [engine])

  // hide UI after 8s of no touch (only visual; ring stays)
  useEffect(() => {
    if (!awake) return
    const id = setTimeout(() => setAwake(false), 8000)
    return () => clearTimeout(id)
  }, [awake])

  // wake lock only outside peak
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

  const onDown = (e: React.PointerEvent) => {
    setAwake(true)
    pressStart.current = Date.now()
    touchY.current = e.clientY
    longPress.current = window.setTimeout(() => {
      longPress.current = null
      // 3s hold → emergency (checked on up)
    }, 3000)
  }
  const onUp = (e: React.PointerEvent) => {
    const held = Date.now() - pressStart.current
    const dy = touchY.current - e.clientY
    if (longPress.current) { clearTimeout(longPress.current); longPress.current = null }
    if (emergency) return
    if (dy > 90) { engine.skipToReturn(); flash('מדלג לחזרה'); return }
    if (held >= 3000) { setEmergency(true); engine.calm(); return }
    if (held >= 700) { engine.extend(600); flash('עוד עשר דקות'); return }
    if (s.paused) { engine.resume(); flash('ממשיכים') } else { engine.pause(); flash('עצירה') }
  }

  const color = PHASE_COLORS[s.phase]
  const progress = Math.min(1, s.t / s.durationSec)
  const remaining = Math.max(0, s.durationSec - s.t)
  const mm = Math.floor(remaining / 60), ss = Math.floor(remaining % 60)
  const breathScale = s.breath === 'inhale' ? s.breathProgress : s.breath === 'exhale' ? 1 - s.breathProgress : s.breath === 'hold' ? 1 : 0
  const peak = s.phase === 3 && !s.paused
  const dimAll = peak && !awake

  if (emergency) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-8 text-center fade-in" style={{ background: '#1a1208' }}>
        <div className="w-40 h-40 rounded-full mb-10" style={{ background: 'radial-gradient(circle, #e9d8a6 0%, #c9893a 60%, transparent 70%)', opacity: 0.6 }} />
        <p className="text-[20px] leading-relaxed mb-10">אתה בסדר. אמור את שמך. איפה אתה נמצא. הרגליים על הרצפה. נשימה איטית.</p>
        <button onClick={() => { setEmergency(false); engine.skipToReturn() }} className="w-full rounded-2xl py-5 text-[18px] bg-ink text-bg mb-3">חזרה הביתה</button>
        {settings.emergencyPhone && (
          <a href={`tel:${settings.emergencyPhone}`} className="w-full rounded-2xl py-5 text-[18px] border border-ink/40 block">התקשר ל{settings.emergencyName ? `-${settings.emergencyName}` : ''}</a>
        )}
        <button onClick={() => { engine.stop(); onEnd(Math.round(s.t), false) }} className="mt-6 text-[15px] opacity-60">סיים עכשיו</button>
      </div>
    )
  }

  return (
    <div onPointerDown={onDown} onPointerUp={onUp} onContextMenu={(e) => e.preventDefault()}
      className="h-full flex flex-col items-center justify-center select-none touch-none"
      style={{ background: peak ? '#08070C' : `radial-gradient(60% 45% at 50% 48%, ${color}2E 0%, transparent 70%), #14121D`, transition: 'background 2000ms' }}>
      <div className="text-[13px] tracking-[0.3em] mb-10" style={{ opacity: dimAll ? 0 : 0.85, transition: 'opacity 1200ms', color }}>{s.phaseName}</div>
      <Ring progress={progress} color={color} breathScale={breathScale} dim={dimAll} />
      <div className="h-16 mt-10 flex flex-col items-center" style={{ opacity: dimAll ? 0 : 1, transition: 'opacity 1200ms' }}>
        {s.breath !== 'none' ? (
          <>
            <div className="text-[22px] font-light">{BREATH_WORD[s.breath]}</div>
            <div className="text-[13px] opacity-40 mt-1">{BREATH_PATTERNS[s.breathPattern].label}</div>
          </>
        ) : (
          <div className="text-[15px] opacity-60 tabular-nums">{s.paused ? 'עצירה' : `${mm}:${ss.toString().padStart(2, '0')}`}</div>
        )}
      </div>
      {s.done && <div className="fade-in text-[17px] opacity-70 mt-6">המסע נגמר</div>}
      {toast && <div className="fade-in fixed bottom-16 text-[15px] opacity-70">{toast}</div>}
    </div>
  )
}
