import { useEffect, useLayoutEffect, useRef } from 'react'

/** Psychedelic line-art couple for the couple evenings: two profiles (him on the left, her on the right) drawn as
 *  glowing neon strokes with colour-shifted echo trails. The pose follows the on-screen turn label (the script),
 *  the chests breathe with the guided breath, and the bass of the music adds sway and glow. */

interface Props {
  label: string
  /** 0..1 – how full the lungs are (guided breath); negative = no guidance → slow natural rhythm */
  breath: number
  paused: boolean
  size: { w: number; h: number }
  levels?: () => { bass: number; mid: number; high: number; energy: number }
}

type Arm = 'rest' | 'heart' | 'trace' | 'embrace'
interface Pose {
  dist: number // half-gap between the two figures, in head units
  tiltHim: number; tiltHer: number // head tilt (radians, + = towards partner / forward)
  leanHim: number; leanHer: number // whole-body lean towards partner
  armHim: Arm; armHer: Arm
  sway: number // dance sway amplitude
  glow: number // overall brightness
  merge: number // 0..1 – dissolve into one light
  speak: 'him' | 'her' | null
}

const BASE: Pose = { dist: 1.25, tiltHim: 0, tiltHer: 0, leanHim: 0, leanHer: 0, armHim: 'rest', armHer: 'rest', sway: 0, glow: 0.8, merge: 0, speak: null }

/** script label → target pose (keyword based, so new evenings work too) */
function poseFor(label: string): Pose {
  const l = label
  const p: Pose = { ...BASE }
  if (/שלכם/.test(l)) return { ...p, dist: 0.08, tiltHim: 0.25, tiltHer: 0.25, leanHim: 0.12, leanHer: 0.12, armHim: 'embrace', armHer: 'embrace', glow: 1.3, merge: 1 }
  if (/חיבוק|מגע משותף/.test(l)) return { ...p, dist: 0.3, tiltHim: 0.18, tiltHer: 0.22, leanHim: 0.1, leanHer: 0.1, armHim: 'embrace', armHer: 'embrace', glow: 1.15, sway: /משותף/.test(l) ? 0.04 : 0 }
  if (/ריקוד|מוביל/.test(l)) return { ...p, dist: 0.55, tiltHim: 0.1, tiltHer: 0.1, armHim: 'embrace', armHer: /היא מובילה/.test(l) ? 'trace' : 'rest', sway: /מוביל/.test(l) ? 0.11 : 0.08, glow: 1 }
  if (/הוא נוגע|הוא נותן|היא מקבלת/.test(l)) return { ...p, dist: 0.62, tiltHim: 0.15, tiltHer: -0.12, leanHim: 0.08, armHim: 'trace', glow: 1.05 }
  if (/היא נוגעת|היא נותנת|הוא מקבל/.test(l)) return { ...p, dist: 0.62, tiltHer: 0.15, tiltHim: -0.12, leanHer: 0.08, armHer: 'trace', glow: 1.05 }
  if (/הוא · יד על הלב/.test(l)) return { ...p, dist: 0.7, tiltHim: 0.08, armHim: 'heart', glow: 1 }
  if (/היא · יד על הלב/.test(l)) return { ...p, dist: 0.7, tiltHer: 0.08, armHim: 'heart', armHer: 'heart', glow: 1.05 }
  if (/שתיקה/.test(l)) return { ...p, dist: 0.32, tiltHim: 0.22, tiltHer: 0.22, leanHim: 0.06, leanHer: 0.06, glow: 1.1 }
  if (/נשימה/.test(l)) return { ...p, dist: 0.85, glow: 0.95 }
  if (/מבט/.test(l)) return { ...p, dist: 1.0, glow: 0.95 }
  if (/להאט|להתרחב|בדיקה/.test(l)) return { ...p, dist: 0.45, tiltHim: 0.12, tiltHer: 0.12, armHim: 'embrace', glow: 1 }
  if (/הוא מדבר/.test(l)) return { ...p, dist: 0.8, speak: 'him' }
  if (/היא מדברת/.test(l)) return { ...p, dist: 0.8, speak: 'her' }
  if (/שיתוף/.test(l)) return { ...p, dist: 0.7, glow: 0.9 }
  // switching turns mid-evening: stay close (don't jump back to the opening distance)
  if (/החלפה/.test(l)) return { ...p, dist: 0.62, tiltHim: 0.08, tiltHer: 0.08, glow: 0.95 }
  // closing moment of an evening ("שניכם" alone): lying close, glowing
  if (l.trim() === 'שניכם') return { ...p, dist: 0.4, tiltHim: 0.15, tiltHer: 0.15, leanHim: 0.05, leanHer: 0.05, glow: 1.1 }
  return p
}

type V = [number, number]
// profile facing +x, unit = head height; y down. Chest centre ≈ (0.15, 1.85)
const HEAD: V[] = [[-0.34, 1.22], [-0.4, 0.95], [-0.55, 0.5], [-0.42, 0.08], [-0.05, -0.08], [0.28, 0.06], [0.4, 0.34], [0.42, 0.44], [0.54, 0.6], [0.42, 0.67], [0.46, 0.76], [0.4, 0.82], [0.39, 0.95], [0.2, 1.03], [0.16, 1.24]]
const FRONT_HIM: V[] = [[0.16, 1.24], [0.32, 1.55], [0.36, 1.95], [0.3, 2.35], [0.26, 2.7]]
const FRONT_HER: V[] = [[0.16, 1.24], [0.26, 1.55], [0.46, 1.9], [0.32, 2.12], [0.26, 2.4], [0.3, 2.7]]
const BACK: V[] = [[-0.34, 1.22], [-0.58, 1.5], [-0.62, 1.95], [-0.5, 2.4], [-0.46, 2.7]]
const HAIR: V[] = [[-0.05, -0.08], [-0.5, 0.1], [-0.78, 0.6], [-0.85, 1.2], [-0.72, 1.7], [-0.78, 2.05]]
const SHOULDER: V = [-0.08, 1.45]
const HEART: V = [0.3, 1.8]
const NECK: V = [0, 1.15]
const BASEPT: V = [0, 2.7]

const rot = ([x, y]: V, [cx, cy]: V, a: number): V => { const c = Math.cos(a), s = Math.sin(a); return [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c] }

/** smooth open curve through points (Catmull-Rom → Bézier) */
function curve(ctx: CanvasRenderingContext2D, pts: V[]) {
  if (pts.length < 2) return
  ctx.moveTo(pts[0][0], pts[0][1])
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)]
    ctx.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1])
  }
}

/** two-bone arm from shoulder to target (lengths 0.8 + 0.8), elbow bent downwards */
function arm(s: V, t: V): V[] {
  const L = 0.8, dx = t[0] - s[0], dy = t[1] - s[1]
  const d = Math.min(2 * L - 0.01, Math.hypot(dx, dy))
  const a = Math.atan2(dy, dx), b = Math.acos(Math.min(1, d / (2 * L)))
  const e: V = [s[0] + L * Math.cos(a + b), s[1] + L * Math.sin(a + b)]
  const h: V = [s[0] + d * Math.cos(a), s[1] + d * Math.sin(a)]
  return [s, e, h]
}

export function CoupleFigures({ label, breath, paused, size, levels }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const st = useRef({ label, breath, paused, levels })
  useLayoutEffect(() => { st.current = { label, breath, paused, levels } })

  useEffect(() => {
    const cv = ref.current!
    const ctx = cv.getContext('2d')!
    const dpr = Math.min(1.5, window.devicePixelRatio || 1)
    cv.width = size.w * dpr; cv.height = size.h * dpr
    const lerp = (a: number, b: number, k: number) => a + (b - a) * k
    let cur: Pose = poseFor(st.current.label)
    const armOf = (a: Arm) => (a === 'rest' ? 0 : a === 'heart' ? 1 : a === 'trace' ? 2 : 3)
    let armHimW = [1, 0, 0, 0], armHerW = [1, 0, 0, 0] // blend weights per arm mode
    const history: { pose: Pose; br: number; arms: number[][] }[] = []
    let raf = 0, last = 0, t = 0, bassS = 0, beat = 0, lastBass = 0, fade = 1, brS = 0.5

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw)
      if (now - last < 33) return
      const dt = Math.min(0.1, (now - last) / 1000); last = now
      const s = st.current
      if (!s.paused) t += dt
      const lv = s.levels?.() ?? { bass: 0, mid: 0, high: 0, energy: 0 }
      bassS = lerp(bassS, lv.bass, 0.2); if (lv.bass - lastBass > 0.08) beat = 1; lastBass = lv.bass; beat *= 0.9
      // ease towards the script pose (~4 s)
      const tgt = poseFor(s.label), k = 1 - Math.pow(0.5, dt / 1.2)
      cur = { ...cur, dist: lerp(cur.dist, tgt.dist, k), tiltHim: lerp(cur.tiltHim, tgt.tiltHim, k), tiltHer: lerp(cur.tiltHer, tgt.tiltHer, k),
        leanHim: lerp(cur.leanHim, tgt.leanHim, k), leanHer: lerp(cur.leanHer, tgt.leanHer, k), sway: lerp(cur.sway, tgt.sway, k), glow: lerp(cur.glow, tgt.glow, k),
        merge: lerp(cur.merge, tgt.merge, k * 0.5), armHim: tgt.armHim, armHer: tgt.armHer, speak: tgt.speak }
      armHimW = armHimW.map((w, i) => lerp(w, i === armOf(tgt.armHim) ? 1 : 0, k))
      armHerW = armHerW.map((w, i) => lerp(w, i === armOf(tgt.armHer) ? 1 : 0, k))
      // after the farewell, slowly fade the couple into the stars
      fade = cur.merge > 0.9 ? Math.max(0.15, fade - dt / 90) : Math.min(1, fade + dt / 3)
      brS = lerp(brS, s.breath < 0 ? 0.5 + 0.5 * Math.sin((t * 2 * Math.PI) / 9) : s.breath, 0.15)
      const br = brS
      history.unshift({ pose: cur, br, arms: [armHimW, armHerW] }); if (history.length > 40) history.pop()

      const W = size.w, H = size.h
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)
      ctx.globalCompositeOperation = 'lighter'
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'
      const U = Math.min(H / 3.3, W / 6.4) // head unit in px – leaves room for the widest pose + hair + echoes
      const cx = W / 2, top = H / 2 - 1.35 * U

      const ECHOES = 5
      for (let e = ECHOES - 1; e >= 0; e--) {
        const h = history[Math.min(history.length - 1, e * 5)]
        const P = h.pose
        const spread = 1 + e * (0.035 + bassS * 0.03)
        const alpha = (e === 0 ? 0.95 : 0.34 * (1 - e / ECHOES)) * P.glow * fade
        for (const who of ['him', 'her'] as const) {
          const sign = who === 'him' ? -1 : 1
          const sway = Math.sin(t * 0.9) * P.sway * (who === 'him' ? 1 : -0.85)
          const gap = P.dist * (1 - P.merge * 0.9) + 0.62
          const ox = cx + sign * gap * U * spread + sway * U, oy = top
          const tilt = who === 'him' ? P.tiltHim : P.tiltHer
          const lean = (who === 'him' ? P.leanHim : P.leanHer) + sway * 0.6
          const b = h.br, chest = 0.06 * b
          const toWorld = (v: V): V => {
            let p = rot(v, BASEPT, lean)
            p = [p[0], p[1]]
            return [ox + -sign * p[0] * U * spread, oy + p[1] * U * spread]
          }
          const headPts = HEAD.map((v) => rot(v, NECK, tilt)).map(toWorld)
          const front = (who === 'him' ? FRONT_HIM : FRONT_HER).map(([x, y], i) => [x + chest * Math.sin((i / 4) * Math.PI), y - chest * 0.4] as V).map(toWorld)
          const back = BACK.map(([x, y]) => [x - chest * 0.3, y - chest * 0.3] as V).map(toWorld)
          const hue = (who === 'him' ? 250 : 335) + e * 26 + Math.sin(t * 0.07 + (who === 'him' ? 0 : 2)) * 30
          const col = (a: number, l = 72) => `hsla(${hue},95%,${l}%,${a})`
          // glow underlay + line
          for (const [lw, a] of [[7 + bassS * 6, alpha * 0.12], [e === 0 ? 2.2 : 1.4, alpha]] as const) {
            ctx.strokeStyle = col(a); ctx.lineWidth = lw
            ctx.beginPath(); curve(ctx, headPts); curve(ctx, front); curve(ctx, back); ctx.stroke()
            if (who === 'her') { ctx.beginPath(); curve(ctx, HAIR.map(([x, y], i) => rot([x - Math.sin(t * 0.6 + i) * 0.03 * i, y] as V, NECK, tilt)).map(toWorld)); ctx.stroke() }
          }
          // eye – a small glowing dot (brighter during gaze / speaking)
          const eye = toWorld(rot([0.22, 0.36], NECK, tilt))
          ctx.fillStyle = col(alpha * (P.speak === who ? 0.9 + 0.3 * Math.sin(t * 8) : 0.7), 85)
          ctx.beginPath(); ctx.arc(eye[0], eye[1], 1.6 + bassS * 1.5, 0, Math.PI * 2); ctx.fill()
          // arm: blend of rest / heart / trace / embrace targets (targets in partner's local space → world)
          const wts = h.arms[who === 'him' ? 0 : 1]
          const partnerToWorld = (v: V): V => { const pox = cx - sign * gap * U * spread - sway * U; return [pox + sign * v[0] * U * spread, oy + v[1] * U * spread] }
          const sh = toWorld(SHOULDER)
          const targets: V[] = [
            toWorld([0.2, 2.45]), // rest – hand on own belly
            partnerToWorld(HEART), // heart
            partnerToWorld([-0.35 + 0.25 * Math.sin(t * 0.5), 1.5 + 0.55 * (0.5 + 0.5 * Math.sin(t * 0.35))]), // trace shoulder → back, slowly
            partnerToWorld([-0.55, 1.95]), // embrace – around the back
          ]
          const tx = targets.reduce((a, p, i) => a + p[0] * wts[i], 0), ty = targets.reduce((a, p, i) => a + p[1] * wts[i], 0)
          const ik = arm([0, 0], [(tx - sh[0]) / (U * spread) * -sign, (ty - sh[1]) / (U * spread)]).map(([x, y]) => [sh[0] + -sign * x * U * spread, sh[1] + y * U * spread] as V)
          ctx.strokeStyle = col(alpha * 0.9); ctx.lineWidth = e === 0 ? 1.8 : 1.2
          ctx.beginPath(); curve(ctx, ik); ctx.stroke()
          // touch glow where the hand meets the partner (heart / trace / embrace)
          const touch = wts[1] + wts[2] * 0.7 + wts[3] * 0.5
          if (e === 0 && touch > 0.2) {
            const [hx, hy] = ik[2], r = U * (0.35 + 0.15 * Math.sin(t * 2) + bassS * 0.3)
            const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, r)
            g.addColorStop(0, `hsla(${hue},100%,85%,${0.55 * touch * fade})`); g.addColorStop(1, `hsla(${hue},100%,60%,0)`)
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(hx, hy, r, 0, Math.PI * 2); ctx.fill()
          }
        }
      }
      // shared light between the hearts – grows as they come closer, blooms on merge
      const near = Math.max(0, 1 - cur.dist / 1.1)
      const lr = U * (0.25 + near * 0.6 + cur.merge * 1.2 + beat * 0.15)
      const ly = top + 1.75 * U
      const lg = ctx.createRadialGradient(cx, ly, 0, cx, ly, lr)
      lg.addColorStop(0, `rgba(255,236,210,${(0.18 + near * 0.35 + cur.merge * 0.4) * fade})`); lg.addColorStop(0.4, `rgba(240,160,200,${(0.08 + near * 0.15) * fade})`); lg.addColorStop(1, 'rgba(150,120,255,0)')
      ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(cx, ly, lr, 0, Math.PI * 2); ctx.fill()
      ctx.globalCompositeOperation = 'source-over'
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [size.w, size.h])

  return <canvas ref={ref} style={{ width: size.w, height: size.h, pointerEvents: 'none' }} />
}
