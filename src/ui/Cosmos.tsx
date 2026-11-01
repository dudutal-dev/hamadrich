import { useEffect, useRef } from 'react'

interface Props {
  color: string
  color2: string
  intensity: number // 0..1 (breath / peak)
  phase: number
  paused: boolean
}

/** Full-screen canvas: star field + drifting nebula clouds + rotating light rays, tinted by phase colors */
export function Cosmos({ color, color2, intensity, phase, paused }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const state = useRef({ color, color2, intensity, phase, paused })
  state.current = { color, color2, intensity, phase, paused }

  useEffect(() => {
    const cv = ref.current!
    const ctx = cv.getContext('2d')!
    let w = 0, h = 0, dpr = Math.min(2, window.devicePixelRatio || 1)
    const resize = () => { w = cv.clientWidth; h = cv.clientHeight; cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0) }
    resize(); window.addEventListener('resize', resize)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const stars = Array.from({ length: 160 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.4 + 0.3, tw: Math.random() * Math.PI * 2, sp: 0.3 + Math.random() * 0.9 }))
    const clouds = Array.from({ length: 7 }, (_, i) => ({ x: Math.random(), y: 0.35 + Math.random() * 0.5, r: 0.35 + Math.random() * 0.35, a: Math.random() * Math.PI * 2, sp: 0.02 + Math.random() * 0.03, k: i % 2 }))
    const rays = 18
    let t0 = performance.now(), t = 0, raf = 0

    const hex = (c: string, a: number) => { const n = parseInt(c.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})` }

    const draw = (now: number) => {
      const s = state.current
      const dt = s.paused ? 0 : (now - t0) / 1000; t0 = now; t += dt
      const cx = w / 2, cy = h * 0.40
      const peak = s.phase === 3
      ctx.clearRect(0, 0, w, h)

      // deep space base
      const g0 = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h))
      g0.addColorStop(0, hex(s.color, 0.28)); g0.addColorStop(0.5, 'rgba(14,11,24,0.6)'); g0.addColorStop(1, '#070510')
      ctx.fillStyle = g0; ctx.fillRect(0, 0, w, h)

      // nebula clouds
      ctx.globalCompositeOperation = 'screen'
      for (const c of clouds) {
        const x = (c.x + Math.sin(t * c.sp + c.a) * 0.08) * w
        const y = (c.y + Math.cos(t * c.sp * 0.8 + c.a) * 0.05) * h
        const r = c.r * Math.max(w, h) * 0.55
        const g = ctx.createRadialGradient(x, y, 0, x, y, r)
        const col = c.k ? s.color2 : s.color
        g.addColorStop(0, hex(col, 0.16 + s.intensity * 0.06)); g.addColorStop(0.6, hex(col, 0.05)); g.addColorStop(1, hex(col, 0))
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
      }

      // light rays from the center
      const rot = reduced ? 0 : t * 0.04
      const rayLen = Math.max(w, h) * (0.55 + s.intensity * 0.25)
      for (let i = 0; i < rays; i++) {
        const a = rot + (i / rays) * Math.PI * 2
        const wob = 0.6 + 0.4 * Math.sin(t * 0.7 + i * 1.7)
        const alpha = (peak ? 0.10 : 0.07) * wob + s.intensity * 0.05
        const g = ctx.createLinearGradient(cx, cy, cx + Math.cos(a) * rayLen, cy + Math.sin(a) * rayLen)
        g.addColorStop(0, hex(i % 2 ? s.color2 : '#FFFFFF', alpha)); g.addColorStop(0.5, hex(s.color2, alpha * 0.45)); g.addColorStop(1, hex(s.color, 0))
        ctx.fillStyle = g
        ctx.beginPath(); ctx.moveTo(cx, cy)
        const spread = 0.018 + 0.01 * wob
        ctx.lineTo(cx + Math.cos(a - spread) * rayLen, cy + Math.sin(a - spread) * rayLen)
        ctx.lineTo(cx + Math.cos(a + spread) * rayLen, cy + Math.sin(a + spread) * rayLen)
        ctx.closePath(); ctx.fill()
      }

      // core glow (white heart)
      const coreR = Math.min(w, h) * (0.22 + s.intensity * 0.08)
      const gc = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR)
      gc.addColorStop(0, `rgba(255,255,255,${0.35 + s.intensity * 0.3})`); gc.addColorStop(0.35, hex(s.color2, 0.35)); gc.addColorStop(1, hex(s.color, 0))
      ctx.fillStyle = gc; ctx.beginPath(); ctx.arc(cx, cy, coreR, 0, Math.PI * 2); ctx.fill()

      // stars
      for (const st of stars) {
        const tw = 0.5 + 0.5 * Math.sin(t * st.sp + st.tw)
        ctx.fillStyle = `rgba(255,255,255,${0.25 + tw * 0.6})`
        ctx.beginPath(); ctx.arc(st.x * w, st.y * h, st.r * (0.8 + tw * 0.5), 0, Math.PI * 2); ctx.fill()
      }
      // sparkle dust drifting up
      for (let i = 0; i < 24; i++) {
        const y = ((i / 24) + (t * 0.012 * (1 + (i % 3)))) % 1
        const x = (Math.sin(i * 12.9898) * 0.5 + 0.5 + Math.sin(t * 0.3 + i) * 0.02) % 1
        ctx.fillStyle = hex(i % 2 ? s.color2 : '#FFD08A', 0.25 + 0.3 * Math.sin(t + i))
        ctx.beginPath(); ctx.arc(x * w, (1 - y) * h, 1.2, 0, Math.PI * 2); ctx.fill()
      }
      ctx.globalCompositeOperation = 'source-over'
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])

  return <canvas ref={ref} className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }} />
}
