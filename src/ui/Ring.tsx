interface Props {
  progress: number // 0..1 of whole session
  color: string
  breathScale?: number // 0..1
  dim?: boolean
  size?: number
}

export function Ring({ progress, color, breathScale = 0, dim, size = 240 }: Props) {
  const r = size / 2 - 6
  const c = 2 * Math.PI * r
  const scale = 1 + breathScale * 0.12
  return (
    <div style={{ width: size, height: size, opacity: dim ? 0.15 : 1, transition: 'opacity 1200ms' }} className="relative">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: `scale(${scale})`, transition: 'transform 900ms ease-in-out' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeOpacity={0.28} strokeWidth={2} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - progress)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 1000ms linear, stroke 1200ms' }}
        />
        <circle cx={size / 2} cy={size / 2} r={r * 0.55} fill={color} fillOpacity={0.14 + breathScale * 0.16} style={{ transition: 'fill-opacity 900ms' }} />
      </svg>
    </div>
  )
}
