import { useEffect, useLayoutEffect, useRef } from 'react'

interface Props {
  color: string
  color2: string
  intensity: number // breath 0..1
  phase: number
  paused: boolean
  ambient?: boolean
  /** live audio levels; when provided the visual moves with the music */
  levels?: () => { bass: number; mid: number; high: number; energy: number }
}

const hexToRgb = (c: string) => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const }
const rgba = (c: string, a: number) => { const [r, g, b] = hexToRgb(c); return `rgba(${r},${g},${b},${a})` }
const mix = (a: string, b: string, t: number) => { const A = hexToRgb(a), B = hexToRgb(b); return `#${[0, 1, 2].map((i) => Math.round(A[i] + (B[i] - A[i]) * t).toString(16).padStart(2, '0')).join('')}` }

/** Nebula palette like the reference: salmon/peach clouds, magenta, cyan streaks, hot white core — tinted toward the phase colors */
const NEB = { peach: '#FF9A6B', rose: '#FF5FA8', magenta: '#F04CFF', cyan: '#39E6FF', violet: '#8A5CFF', gold: '#FFC857', coral: '#FF6F59' }

export function Cosmos({ color, color2, intensity, phase, paused, ambient = false, levels }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const st = useRef({ color, color2, intensity, phase, paused, ambient, levels })
  useLayoutEffect(() => { st.current = { color, color2, intensity, phase, paused, ambient, levels } })

  useEffect(() => {
    const cv = ref.current!
    const ctx = cv.getContext('2d', { alpha: false })!
    let w = 0, h = 0
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const resize = () => { w = cv.clientWidth; h = cv.clientHeight; cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0) }
    resize(); window.addEventListener('resize', resize)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // offscreen nebula sprite (soft blob) for cheap blurred clouds on iOS
    const sprite = document.createElement('canvas'); sprite.width = sprite.height = 256
    const sc = sprite.getContext('2d')!
    const sg = sc.createRadialGradient(128, 128, 0, 128, 128, 128)
    sg.addColorStop(0, 'rgba(255,255,255,1)'); sg.addColorStop(0.35, 'rgba(255,255,255,0.55)'); sg.addColorStop(0.7, 'rgba(255,255,255,0.12)'); sg.addColorStop(1, 'rgba(255,255,255,0)')
    sc.fillStyle = sg; sc.fillRect(0, 0, 256, 256)

    const stars = Array.from({ length: 220 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.3 + 0.3, tw: Math.random() * Math.PI * 2, sp: 0.4 + Math.random() * 1.2, c: Math.random() }))
    // cloud bank: lower half is denser (like the reference), colors cycle through the nebula palette
    const palette = [NEB.coral, NEB.peach, NEB.rose, NEB.magenta, NEB.cyan, NEB.violet, NEB.peach, NEB.gold, NEB.cyan, NEB.coral]
    const clouds = Array.from({ length: 34 }, (_, i) => ({
      x: Math.random(), y: i < 10 ? Math.random() * 0.5 : 0.4 + Math.random() * 0.6, r: 0.16 + Math.random() * 0.3,
      a: Math.random() * Math.PI * 2, sp: 0.015 + Math.random() * 0.03, c: palette[i % palette.length], k: Math.random(),
    }))
    const RAYS = 28
    const rayPhase = Array.from({ length: RAYS }, () => Math.random() * Math.PI * 2)
    const dust = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), s: 0.4 + Math.random() * 1.2, p: Math.random() * Math.PI * 2 }))

    let t0 = performance.now(), t = 0, raf = 0
    // smoothed audio
    let bass = 0, mid = 0, high = 0, energy = 0, beat = 0, lastBass = 0
    const lerp = (a: number, b: number, k: number) => a + (b - a) * k

    const draw = (now: number) => {
      const s = st.current
      const dt = s.paused ? 0 : Math.min(0.05, (now - t0) / 1000); t0 = now; t += dt
      const lv = s.levels?.() ?? { bass: 0, mid: 0, high: 0, energy: 0 }
      bass = lerp(bass, lv.bass, 0.25); mid = lerp(mid, lv.mid, 0.2); high = lerp(high, lv.high, 0.3); energy = lerp(energy, lv.energy, 0.15)
      // onset detector → beat pulse
      if (lv.bass - lastBass > 0.08) beat = 1
      lastBass = lv.bass
      beat *= 0.9
      const drive = s.ambient ? 0.5 : 1
      const pulse = Math.min(1, s.intensity * 0.35 + bass * 0.45 + beat * 0.35)

      const cx = w / 2, cy = s.ambient ? h * 0.2 : h * 0.31
      const peak = s.phase === 3
      const c1 = s.color, c2 = s.color2

      // --- deep space ---
      const g0 = ctx.createLinearGradient(0, 0, 0, h)
      g0.addColorStop(0, '#03020A'); g0.addColorStop(0.45, mix('#0A0614', c1, 0.12)); g0.addColorStop(1, mix('#140A1E', NEB.violet, 0.14))
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = g0; ctx.fillRect(0, 0, w, h)

      // --- stars (far, twinkle with highs) ---
      for (const sx of stars) {
        const tw = 0.5 + 0.5 * Math.sin(t * sx.sp + sx.tw)
        const a = (0.25 + tw * 0.55) * (0.7 + high * 0.8)
        ctx.fillStyle = sx.c < 0.15 ? rgba(NEB.cyan, a) : sx.c < 0.3 ? rgba(NEB.peach, a) : `rgba(255,255,255,${a})`
        ctx.beginPath(); ctx.arc(sx.x * w, sx.y * h, sx.r * (0.8 + tw * 0.5 + high * 0.6), 0, Math.PI * 2); ctx.fill()
      }

      // --- nebula clouds (additive sprites) ---
      ctx.globalCompositeOperation = 'lighter'
      const big = Math.max(w, h)
      for (const c of clouds) {
        const x = (c.x + Math.sin(t * c.sp + c.a) * 0.06) * w
        const y = (c.y + Math.cos(t * c.sp * 0.7 + c.a) * 0.04) * h
        const r = c.r * big * 0.95 * (1 + mid * 0.18 + s.intensity * 0.08)
        // tint: 60% nebula palette, 40% phase color
        const col = mix(c.c, c.k < 0.5 ? c1 : c2, 0.15)
        const dxn = (x - cx) / w, dyn = (y - cy) / h
        const dist = Math.min(1, Math.sqrt(dxn * dxn + dyn * dyn) * 1.6)
        const ceiling = s.ambient ? 0.3 : 0.12
        ctx.globalAlpha = Math.min(ceiling, (s.ambient ? 0.14 : 0.045) + mid * (s.ambient ? 0.12 : 0.06) + energy * 0.05) * (0.35 + 0.65 * dist) * (peak ? 0.85 : 1)
        ctx.filter = 'none'
        // colorize the white sprite via composite trick: draw tinted rect through sprite mask
        ctx.save(); ctx.translate(x - r, y - r); ctx.scale(r * 2 / 256, r * 2 / 256)
        ctx.drawImage(tinted(sprite, col), 0, 0); ctx.restore()
      }
      ctx.globalAlpha = 1

      // --- prismatic rays (chromatic: cyan edge / white core / rose edge) ---
      const rot = reduced ? 0 : t * 0.025
      const rayLen = big * (0.7 + pulse * 0.25)
      for (let i = 0; i < RAYS; i++) {
        const a = rot + (i / RAYS) * Math.PI * 2
        const wob = 0.55 + 0.45 * Math.sin(t * 0.9 + rayPhase[i] + mid * 4)
        const base = ((peak ? 0.06 : 0.045) * wob + pulse * 0.035) * (s.ambient ? 0.8 : 1)
        const spread = 0.012 + 0.012 * wob + bass * 0.01
        const edge = i % 3 === 0 ? NEB.cyan : i % 3 === 1 ? NEB.rose : NEB.gold
        const ex = Math.cos(a) * rayLen, ey = Math.sin(a) * rayLen
        const g = ctx.createLinearGradient(cx, cy, cx + ex, cy + ey)
        g.addColorStop(0, `rgba(255,255,255,${base * 1.3})`); g.addColorStop(0.18, rgba(edge, base * 1.1)); g.addColorStop(0.5, rgba(edge, base * 0.45)); g.addColorStop(1, rgba(c2, 0))
        ctx.fillStyle = g
        ctx.beginPath(); ctx.moveTo(cx, cy)
        ctx.lineTo(cx + Math.cos(a - spread) * rayLen, cy + Math.sin(a - spread) * rayLen)
        ctx.lineTo(cx + Math.cos(a + spread) * rayLen, cy + Math.sin(a + spread) * rayLen)
        ctx.closePath(); ctx.fill()
      }

      // --- hot core (white → peach → phase) ---
      const coreR = Math.min(w, h) * (s.ambient ? 0.11 : 0.16 + pulse * 0.06)
      const gc = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR)
      gc.addColorStop(0, `rgba(255,255,255,${0.55 * drive})`); gc.addColorStop(0.15, rgba('#FFE9D6', 0.5 * drive)); gc.addColorStop(0.35, rgba(NEB.peach, 0.45 * drive)); gc.addColorStop(0.6, rgba(NEB.rose, 0.22)); gc.addColorStop(1, rgba(c1, 0))
      ctx.fillStyle = gc; ctx.beginPath(); ctx.arc(cx, cy, coreR, 0, Math.PI * 2); ctx.fill()
      // lens flare streak (horizontal)
      const fl = ctx.createLinearGradient(cx - coreR * 2.2, cy, cx + coreR * 2.2, cy)
      fl.addColorStop(0, 'rgba(255,255,255,0)'); fl.addColorStop(0.5, `rgba(255,255,255,${0.18 * drive + beat * 0.25})`); fl.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = fl; ctx.fillRect(cx - coreR * 2.2, cy - 1.2, coreR * 4.4, 2.4)

      // --- rising dust sparks (react to highs) ---
      for (const d of dust) {
        const y = (d.y + (t * 0.02 * d.s)) % 1
        const x = (d.x + Math.sin(t * 0.4 + d.p) * 0.015 + 1) % 1
        const a = (0.15 + 0.35 * Math.abs(Math.sin(t * 2 + d.p))) * (0.6 + high * 1.2)
        ctx.fillStyle = d.p % 2 < 1 ? rgba(NEB.gold, a) : rgba(NEB.cyan, a)
        ctx.beginPath(); ctx.arc(x * w, (1 - y) * h, 0.8 + d.s * (0.6 + high), 0, Math.PI * 2); ctx.fill()
      }
      // tone cap: darken edges + lower half so the composite never washes to white
      ctx.globalCompositeOperation = 'multiply'
      const vg = ctx.createRadialGradient(cx, cy, Math.min(w, h) * 0.25, cx, cy, Math.max(w, h) * 0.85)
      vg.addColorStop(0, 'rgba(255,255,255,1)'); vg.addColorStop(1, s.ambient ? 'rgba(120,105,150,1)' : 'rgba(78,66,108,1)')
      ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h)
      ctx.globalCompositeOperation = 'source-over'
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])

  return <canvas ref={ref} className={`${ambient ? 'fixed' : 'absolute'} inset-0 w-full h-full`} style={{ pointerEvents: 'none', zIndex: ambient ? 0 : undefined }} />
}

/** cache of tinted sprite copies (one per color) */
const tintCache = new Map<string, HTMLCanvasElement>()
function tinted(sprite: HTMLCanvasElement, color: string): HTMLCanvasElement {
  let c = tintCache.get(color)
  if (c) return c
  c = document.createElement('canvas'); c.width = c.height = 256
  const x = c.getContext('2d')!
  x.drawImage(sprite, 0, 0)
  x.globalCompositeOperation = 'source-in'
  x.fillStyle = color; x.fillRect(0, 0, 256, 256)
  tintCache.set(color, c)
  return c
}
