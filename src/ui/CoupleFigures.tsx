import { useEffect, useLayoutEffect, useRef } from 'react'

/** Psychedelic illustrated couple for the couple evenings (illustrations generated with ElevenLabs, see public/couple).
 *  Every script step has its own set of frames – e.g. "היא נוגעת · הוא מקבל" shows her touching him on the chest,
 *  the shoulders, the face – and until the next step the frames keep changing at the pace of the music
 *  (every few bars, counted from the bass). Frames crossfade with a light echo, slowly drift and zoom,
 *  breathe with the guided breath and glow with the bass. Images carry alpha (black → transparent), so the
 *  cosmos background shows through without CSS blend modes. */

interface Props {
  label: string
  /** 0..1 – how full the lungs are (guided breath); negative = no guidance → slow natural rhythm */
  breath: number
  paused: boolean
  size: { w: number; h: number }
  levels?: () => { bass: number; mid: number; high: number; energy: number }
}

/** script label → frames (keyword based so new evenings work too; the more specific rules first) */
const RULES: [RegExp | string, string[]][] = [
  [/שלכם/, ['mutual-1', 'merge']],
  [/מגע משותף/, ['mutual-1', 'mutual-2']],
  [/חיבוק/, ['hug-kneel']],
  [/הוא מוביל/, ['he-leads', 'dance']],
  [/היא מובילה/, ['she-leads', 'dance-2']],
  [/ריקוד/, ['dance', 'dance-2']],
  [/היא נוגעת/, ['she-touch-1', 'she-touch-2', 'she-touch-3']],
  [/הוא נוגע/, ['he-touch-1', 'he-touch-2', 'he-touch-3']],
  [/היא מקבלת|הוא נותן/, ['her-receives-1', 'her-receives-2', 'her-receives-3']],
  [/הוא מקבל|היא נותנת/, ['him-receives-1', 'him-receives-2', 'him-receives-3']],
  [/הוא · יד על הלב/, ['heart-him']],
  [/היא · יד על הלב/, ['heart-her', 'heart-both']],
  [/שתיקה/, ['silence']],
  [/נשימה/, ['breath']],
  [/מבט/, ['gaze']],
  [/מול/, ['anchor']],
  [/בדיקה/, ['check']],
  [/להאט/, ['mutual-1', 'check']],
  [/להתרחב/, ['mutual-2', 'he-touch-1']],
  [/הוא מדבר/, ['speak-him']],
  [/היא מדברת/, ['speak-her']],
  [/שיתוף/, ['share']],
  [/החלפה/, ['swap']],
  [/טקס/, ['ritual']],
  [/מילת עצירה/, ['stop-word']],
  [/יותר|פתיחה/, ['sit-open']],
  ['שניכם', ['share', 'hug-kneel']], // closing moment of an evening
]
function framesFor(label: string): string[] {
  const l = label.trim()
  for (const [r, f] of RULES) if (typeof r === 'string' ? l === r : r.test(l)) return f
  return ['anchor']
}

const cache = new Map<string, HTMLImageElement>()
function img(name: string): HTMLImageElement {
  let i = cache.get(name)
  if (!i) { i = new Image(); i.decoding = 'async'; i.src = `${import.meta.env.BASE_URL}couple/${name}.webp`; cache.set(name, i) }
  return i
}
const ready = (i: HTMLImageElement) => i.complete && i.naturalWidth > 0

interface Layer { name: string; born: number; dx: number; dy: number }

export function CoupleFigures({ label, breath, paused, size, levels }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const st = useRef({ label, breath, paused, levels })
  useLayoutEffect(() => { st.current = { label, breath, paused, levels } })

  // preload this step's frames
  useEffect(() => { framesFor(label).forEach(img) }, [label])

  useEffect(() => {
    const cv = ref.current!
    const ctx = cv.getContext('2d')!
    const dpr = Math.min(1.5, window.devicePixelRatio || 1)
    cv.width = size.w * dpr; cv.height = size.h * dpr
    const lerp = (a: number, b: number, k: number) => a + (b - a) * k
    const FADE = 3.2 // crossfade seconds
    let raf = 0, last = 0, t = 0, bassS = 0, beat = 0, lastBass = 0, brS = 0.5, beats = 0, glowS = 0, merged = 0
    let curLabel = st.current.label, set = framesFor(curLabel), idx = 0
    const newLayer = (name: string): Layer => ({ name, born: t, dx: (Math.random() - 0.5) * 0.05, dy: (Math.random() - 0.5) * 0.035 })
    let layers: Layer[] = [newLayer(set[0])]
    let since = 0 // seconds on the current frame

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw)
      if (now - last < 33) return
      const dt = Math.min(0.1, (now - last) / 1000); last = now
      const s = st.current
      const lv = s.levels?.() ?? { bass: 0, mid: 0, high: 0, energy: 0 }
      if (!s.paused) {
        t += dt; since += dt
        bassS = lerp(bassS, lv.bass, 0.2)
        if (lv.bass - lastBass > 0.08 && beat < 0.4) { beat = 1; beats++ }
        lastBass = lv.bass; beat *= 0.88
      }
      glowS = lerp(glowS, bassS, 0.1)

      if (s.label !== curLabel) {
        // script step changed → crossfade into its first frame
        curLabel = s.label; set = framesFor(curLabel); idx = 0
        layers.push(newLayer(set[0])); since = 0; beats = 0
        set.slice(1).forEach(img)
      } else if (set.length > 1 && !s.paused && ((since > 9 && beats >= 16) || since > 20)) {
        // within a step: the action continues – next frame every ~16 beats of the music (a few bars), 9–20 s
        idx = (idx + 1) % set.length
        layers.push(newLayer(set[idx])); since = 0; beats = 0
      }
      // drop layers fully covered by a newer, loaded, faded-in one
      while (layers.length > 1 && t - layers[1].born > FADE && ready(img(layers[1].name))) layers.shift()
      if (layers.length > 3) layers = layers.slice(-3)

      brS = lerp(brS, s.breath < 0 ? 0.5 + 0.5 * Math.sin((t * 2 * Math.PI) / 9) : s.breath, 0.15)
      // after the farewell the couple slowly dissolves into the stars
      merged = /שלכם/.test(curLabel) ? Math.min(1, merged + dt / 120) : Math.max(0, merged - dt / 3)
      const fadeOut = 1 - 0.6 * merged

      const W = size.w, H = size.h
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)
      for (let li = 0; li < layers.length; li++) {
        const L = layers[li], im = img(L.name)
        if (!ready(im)) continue
        const age = t - L.born
        const a = li === 0 ? 1 : Math.min(1, age / FADE)
        const alpha = a * a * (3 - 2 * a) * fadeOut
        if (alpha <= 0.01) continue
        // fit height with a slight zoom; slow drift + zoom over the frame's life; breath and beat pulse
        const life = Math.min(1, age / 24)
        const scale = (H / im.naturalHeight) * (1.04 + life * 0.06 + brS * 0.018 + beat * 0.008)
        const w = im.naturalWidth * scale, h = im.naturalHeight * scale
        const cx = W / 2 + L.dx * life * W, cy = H / 2 + L.dy * life * H
        ctx.save()
        ctx.translate(cx, cy); ctx.rotate(Math.sin(t * 0.21 + li) * 0.008)
        ctx.globalCompositeOperation = 'source-over'
        ctx.globalAlpha = alpha
        ctx.drawImage(im, -w / 2, -h / 2, w, h)
        // luminous echo: a larger additive copy that swells with the bass and during crossfades
        const echo = Math.min(0.6, (0.14 + glowS * 0.45 + beat * 0.15) * alpha * (a < 1 ? 1.5 : 1))
        if (echo > 0.02) {
          const e = 1.035 + glowS * 0.04
          ctx.globalCompositeOperation = 'lighter'
          ctx.globalAlpha = echo
          ctx.drawImage(im, (-w * e) / 2, (-h * e) / 2, w * e, h * e)
        }
        ctx.restore()
      }
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [size.w, size.h])

  return <canvas ref={ref} style={{ width: size.w, height: size.h, display: 'block' }} aria-hidden />
}
