import { useEffect, useLayoutEffect, useRef } from 'react'

/** Psychedelic couple video for the couple evenings: short clips generated with ElevenLabs (Veo 3.1), one or two per
 *  script step – e.g. "היא נוגעת · הוא מקבל" shows her hands gliding over his chest, then caressing his face.
 *  Each file is a ping-pong loop (forward + reverse), so it repeats seamlessly with natural motion; within a step the
 *  clips alternate after each loop. Clips change through a short dip to dark – never overlapping – so the figures are
 *  never doubled or blurred. The glow breathes softly with the bass of the music. */

interface Props {
  label: string
  paused: boolean
  /** 'fill' – full-screen background (landscape / TV); 'box' – a framed area (portrait phone) */
  mode: 'fill' | 'box'
  size?: { w: number; h: number }
  levels?: () => { bass: number; mid: number; high: number; energy: number }
}

/** script label → clips (keyword based so new evenings work too; the more specific rules first) */
const RULES: [RegExp | string, string[]][] = [
  [/שלכם/, ['mutual', 'merge']],
  [/מגע משותף/, ['mutual', 'dance']],
  [/חיבוק/, ['hug']],
  [/מוביל/, ['dance-lead', 'dance']],
  [/ריקוד/, ['dance', 'dance-lead']],
  [/היא נוגעת/, ['she-touch', 'she-touch-face']],
  [/הוא נוגע/, ['he-touch-waist', 'he-touch-hair']],
  [/היא מקבלת|הוא נותן/, ['her-receives-a', 'her-receives-b']],
  [/הוא מקבל|היא נותנת/, ['him-receives-a', 'him-receives-b']],
  [/הוא · יד על הלב/, ['heart-him']],
  [/היא · יד על הלב/, ['heart-her']],
  [/שתיקה/, ['silence']],
  [/נשימה/, ['breath']],
  [/מבט|מול/, ['gaze']],
  [/בדיקה|להאט/, ['mutual']],
  [/להתרחב/, ['he-touch-waist', 'she-touch']],
  [/הוא מדבר/, ['speak-him']],
  [/היא מדברת/, ['speak-her']],
  [/שיתוף/, ['sit-open', 'hug']],
  [/טקס/, ['ritual']],
  [/החלפה|מילת עצירה|יותר|פתיחה/, ['sit-open']],
  ['שניכם', ['hug']], // closing moment of an evening
]
function clipsFor(label: string): string[] {
  const l = label.trim()
  for (const [r, f] of RULES) if (typeof r === 'string' ? l === r : r.test(l)) return f
  return ['gaze']
}
const src = (name: string) => `${import.meta.env.BASE_URL}couple/${name}.mp4`
const RATE = 0.9 // a touch slower than generated – matches the slow, sensual music
const OUT = 700 // ms fade to dark before switching clip

export function CoupleFigures({ label, paused, mode, size, levels }: Props) {
  const ref = useRef<HTMLVideoElement>(null)
  const st = useRef({ label, paused, levels })
  useLayoutEffect(() => { st.current = { label, paused, levels } })
  const clip = useRef({ set: [] as string[], idx: 0, name: '', timer: 0 })

  // show a clip: fade out, swap, fade in once it actually plays
  const show = (name: string) => {
    const v = ref.current, c = clip.current
    if (!v || c.name === name) return
    c.name = name
    window.clearTimeout(c.timer)
    v.style.opacity = '0'
    c.timer = window.setTimeout(() => {
      v.src = src(name); v.loop = c.set.length < 2; v.playbackRate = RATE
      if (!st.current.paused) v.play().catch(() => {})
    }, v.currentSrc ? OUT : 0)
  }

  // script step changed → its first clip
  useEffect(() => {
    const set = clipsFor(label), c = clip.current
    if (set.join() === c.set.join()) return
    c.set = set; c.idx = 0; show(set[0])
  }, [label]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const v = ref.current
    if (!v) return
    if (paused) v.pause(); else if (v.src) v.play().catch(() => {})
  }, [paused])

  useEffect(() => {
    const v = ref.current!
    const onPlaying = () => { v.playbackRate = RATE; v.style.opacity = '1' }
    // within a step the action continues: after each full (ping-pong) loop, the next clip of the step
    const onEnded = () => {
      const c = clip.current
      if (c.set.length < 2) { v.currentTime = 0; v.play().catch(() => {}); return }
      c.idx = (c.idx + 1) % c.set.length; show(c.set[c.idx])
    }
    v.addEventListener('playing', onPlaying); v.addEventListener('ended', onEnded)
    // bass → soft glow (10 Hz is plenty, and cheap)
    let bassS = 0
    const iv = window.setInterval(() => {
      const lv = st.current.levels?.()
      if (!lv) return
      bassS += (lv.bass - bassS) * 0.35
      v.style.filter = `brightness(${(1 + bassS * 0.22).toFixed(3)}) saturate(${(1.05 + bassS * 0.2).toFixed(3)})`
    }, 100)
    const c = clip.current
    return () => { v.removeEventListener('playing', onPlaying); v.removeEventListener('ended', onEnded); window.clearInterval(iv); window.clearTimeout(c.timer) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // soft edges so the video melts into the cosmos (black background of the clips ≈ the night sky)
  const mask = mode === 'fill'
    ? 'radial-gradient(ellipse 75% 80% at 50% 50%, #000 62%, transparent 100%)'
    : 'radial-gradient(ellipse 62% 56% at 50% 50%, #000 70%, transparent 100%)'
  // landscape: 'contain' never crops heads; portrait: 'cover' crops the empty sides
  return (
    <video ref={ref} muted playsInline preload="auto" disablePictureInPicture aria-hidden
      style={{ display: 'block', objectFit: mode === 'fill' ? 'contain' : 'cover', opacity: 0, transition: `opacity ${OUT}ms ease`,
        ...(mode === 'fill' ? { position: 'absolute', inset: 0, width: '100%', height: '100%' } : { width: size?.w, height: size?.h }),
        WebkitMaskImage: mask, maskImage: mask, pointerEvents: 'none' }} />
  )
}
