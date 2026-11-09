/** Signature ornament: thin concentric rings, slow counter-rotating orbits and a breathing warm core.
 *  Calm-psychedelic (line + light), not saturated color. Pure SVG + CSS, cheap on battery. */
export function Halo({ size = 180, className = '' }: { size?: number; className?: string }) {
  const spin = (sec: number, reverse = false) => ({ transformBox: 'view-box' as const, transformOrigin: '100px 100px', animation: `spin ${sec}s linear infinite${reverse ? ' reverse' : ''}` })
  const dots = [0, 50, 110, 170, 235, 300]
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" className={className} aria-hidden>
      <defs>
        <radialGradient id="halo-core">
          <stop offset="0%" stopColor="#FFF4D6" stopOpacity="0.95" />
          <stop offset="35%" stopColor="#F2C26B" stopOpacity="0.55" />
          <stop offset="70%" stopColor="#EBA17A" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#B3A4F2" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="halo-line" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F6D58E" />
          <stop offset="50%" stopColor="#B3A4F2" />
          <stop offset="100%" stopColor="#7CCFBE" />
        </linearGradient>
      </defs>
      <circle cx="100" cy="100" r="46" fill="url(#halo-core)" className="breathe" style={{ transformBox: 'view-box', transformOrigin: '100px 100px' }} />
      {[30, 48, 66, 84, 98].map((r, i) => (
        <circle key={r} cx="100" cy="100" r={r} fill="none" stroke="#F6F2EA" strokeOpacity={0.16 - i * 0.022} strokeWidth="0.7" />
      ))}
      <g style={spin(70)}>
        <circle cx="100" cy="100" r="66" fill="none" stroke="url(#halo-line)" strokeWidth="1.3" strokeDasharray="1.5 7" strokeLinecap="round" />
        {dots.map((a) => <circle key={a} cx={100 + 84 * Math.cos((a * Math.PI) / 180)} cy={100 + 84 * Math.sin((a * Math.PI) / 180)} r={a % 100 === 0 ? 2.2 : 1.4} fill="#F6F2EA" opacity={0.75} />)}
      </g>
      <g style={spin(110, true)}>
        <ellipse cx="100" cy="100" rx="96" ry="36" fill="none" stroke="#B3A4F2" strokeOpacity="0.3" strokeWidth="0.8" />
        <ellipse cx="100" cy="100" rx="36" ry="96" fill="none" stroke="#7CCFBE" strokeOpacity="0.22" strokeWidth="0.8" />
        <circle cx="196" cy="100" r="2.4" fill="#F2C26B" />
      </g>
    </svg>
  )
}
