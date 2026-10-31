import type { BreathStep } from '../engine/audio'

interface Props {
  color: string
  color2: string
  breath: BreathStep
  stepSec: number
  progress: number
  dim?: boolean
  size?: number
}

/** Breathing orb: scale is driven by CSS transitions whose duration equals the breath step, so motion is smooth even at low frame rates */
export function Orb({ color, color2, breath, stepSec, progress, dim, size = 300 }: Props) {
  const target = breath === 'inhale' || breath === 'hold' ? 1 : breath === 'exhale' || breath === 'hold2' ? 0.58 : 0.8
  const dur = breath === 'inhale' || breath === 'exhale' ? stepSec : 0.9
  const r = size / 2 - 4
  const c = 2 * Math.PI * r
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size, opacity: dim ? 0.2 : 1, transition: 'opacity 1500ms' }}>
      {/* rotating sacred geometry */}
      <svg className="absolute inset-0 spin-slow" viewBox="0 0 300 300" style={{ opacity: 0.55 }}>
        <defs>
          <radialGradient id="og" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={color2} stopOpacity="0.9" />
            <stop offset="60%" stopColor={color} stopOpacity="0.55" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </radialGradient>
        </defs>
        <g fill="none" stroke={color2} strokeWidth="0.6" strokeOpacity="0.7">
          {Array.from({ length: 6 }, (_, i) => {
            const a = (i * Math.PI) / 3
            return <circle key={i} cx={150 + 48 * Math.cos(a)} cy={150 + 48 * Math.sin(a)} r="48" />
          })}
          <circle cx="150" cy="150" r="48" />
          <circle cx="150" cy="150" r="96" strokeOpacity="0.45" />
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i * Math.PI) / 6
            return <line key={i} x1={150 + 96 * Math.cos(a)} y1={150 + 96 * Math.sin(a)} x2={150 + 140 * Math.cos(a)} y2={150 + 140 * Math.sin(a)} strokeOpacity="0.35" />
          })}
        </g>
      </svg>
      {/* progress ring */}
      <svg className="absolute inset-0" viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeOpacity="0.25" strokeWidth="1.5" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color2} strokeWidth="2.5" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - progress)} transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 1000ms linear, stroke 1500ms', filter: `drop-shadow(0 0 6px ${color2})` }} />
      </svg>
      {/* breathing orb */}
      <div style={{
        width: size * 0.56, height: size * 0.56, borderRadius: '50%',
        background: `radial-gradient(circle at 40% 35%, ${color2} 0%, ${color} 45%, ${color}00 72%)`,
        boxShadow: `0 0 ${size * 0.25}px ${color}AA, 0 0 ${size * 0.6}px ${color}55, inset 0 0 ${size * 0.15}px ${color2}66`,
        transform: `scale(${target})`,
        transition: `transform ${dur}s cubic-bezier(0.45, 0, 0.55, 1), background 1500ms, box-shadow 1500ms`,
      }} />
      <div className="absolute inset-0 rounded-full aura" style={{ background: `radial-gradient(circle, ${color}00 40%, ${color}30 60%, ${color}00 75%)` }} />
    </div>
  )
}
