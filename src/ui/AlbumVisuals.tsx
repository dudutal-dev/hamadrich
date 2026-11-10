import { useEffect, useLayoutEffect, useRef } from 'react'
import { ALBUM_BREATH_MAP } from '../engine/albumBreath'

/** Visual journey for Psychedelic Prayers: 35 psychedelic scenes (ElevenLabs · Veo 3.1) of one goddess travelling
 *  through the whole album, each cued to the exact track and second where the narration describes it
 *  (from a word-level transcript of all 55 tracks). Every file is a ping-pong loop, so it repeats seamlessly.
 *  Free extras keep long scenes alive: a slow drift/zoom that never repeats with the loop, a glow that breathes with
 *  the bass, a mirrored view when a scene returns on a later track, and a white flash at the "solar shutters". */

/** [album track, second within the track, clip] – sorted */
const CUES: [number, number, string][] = [
  [1, 0, 'p01-arrive'], [2, 0, 'p02-harmony-lost'], [3, 0, 'p03-seed-gift'], [4, 0, 'p04-simple-things'],
  [5, 0, 'p05-all-pass'], [6, 0, 'p06-body-mandala'], [7, 0, 'p07-gate'], [8, 0, 'p08-pool'],
  [9, 0, 'p09-diamond-eye'], [9, 110, 'p10-fusion'], [10, 0, 'p11-falling-free'], [11, 0, 'p11-falling-free'],
  [12, 0, 'p08-pool'], [13, 0, 'p12-gossamer'], [14, 0, 'p13-letgo'], [15, 0, 'p13-letgo'],
  [16, 0, 'p14-helix'], [17, 0, 'p14-helix'], [18, 0, 'p15-clear-water'], [19, 0, 'p16-source'],
  [20, 0, 'p16-source'], [21, 0, 'p17-transfig'], [22, 0, 'p18-tree'], [23, 0, 'p19-mother'],
  [24, 0, 'p20-seed-light'], [25, 0, 'p21-garden'], [26, 0, 'p21-garden'], [27, 0, 'p20-seed-light'],
  [28, 0, 'p22-seeing'], [29, 0, 'p23-senses'], [30, 0, 'p23-senses'], [31, 0, 'p23-senses'],
  [32, 0, 'p23-senses'], [33, 0, 'p24-root'], [34, 0, 'p25-sacral'], [35, 0, 'p26-heart'],
  [36, 0, 'p27-throat'], [37, 0, 'p28-crown'], [38, 0, 'p28-crown'], [39, 0, 'p29-fullness'],
  [40, 0, 'p30-coin'], [41, 0, 'p30-coin'], [42, 0, 'p31-water'], [43, 0, 'p31-water'],
  [44, 0, 'p31-water'], [45, 0, 'p31-water'], [46, 0, 'p31-water'], [47, 0, 'p32-imprint'],
  [47, 84, 'p15-clear-water'], [48, 0, 'p32-imprint'], [49, 0, 'p32-imprint'], [50, 0, 'p33-bloom'],
  [51, 0, 'p33-bloom'], [52, 0, 'p33-bloom'], [53, 0, 'p33-bloom'], [54, 0, 'p33-bloom'],
  [55, 0, 'p34-village'], [55, 205, 'p35-earth'],
]
/** cue moments that open with a white flash ("WARNING! Solar shutters opening") */
const FLASH = new Set(['9:110'])

export interface VisualPick { /** media folder under public/ */ dir: 'journey' | 'body'; clip: string; key: string; mirror: boolean; flash: boolean; zone: number }

/** the scene for an album track at a second within it; null when the track isn't the known recording */
export function pickVisual(track: number, sec: number, trackDur: number): VisualPick | null {
  const m = ALBUM_BREATH_MAP[track]
  if (!m || Math.abs(m.dur - trackDur) > 3) return null
  let i = -1
  for (let k = 0; k < CUES.length; k++) { const [t, s] = CUES[k]; if (t < track || (t === track && s <= sec)) i = k; else break }
  if (i < 0) return null
  const [t, s, clip] = CUES[i]
  const first = CUES.findIndex((c) => c[2] === clip)
  // a scene that returns on a later track is mirrored on every other track, so it reads as a new view
  const mirror = i !== first && t !== CUES[first][0] && (t - CUES[first][0]) % 2 === 1
  const zone = track <= 6 ? 1 : track <= 23 ? 2 : track <= 27 ? 3 : track <= 38 ? 4 : 5
  return { dir: 'journey', clip, key: `${t}:${s}`, mirror, flash: FLASH.has(`${t}:${s}`), zone }
}

const src = (dir: string, name: string) => `${import.meta.env.BASE_URL}${dir}/${name}.mp4`
const RATE = 0.85 // a little slower than generated – the album is slow and spacious
const XFADE = 1600 // ms crossfade between scenes

interface Props {
  pick: VisualPick | null
  paused: boolean
  levels?: () => { bass: number; mid: number; high: number; energy: number }
}

export function AlbumVisuals({ pick, paused, levels }: Props) {
  const a = useRef<HTMLVideoElement>(null), b = useRef<HTMLVideoElement>(null)
  const wrap = useRef<HTMLDivElement>(null), flashEl = useRef<HTMLDivElement>(null)
  const st = useRef({ paused, levels, zone: pick?.zone ?? 1 })
  useLayoutEffect(() => { st.current = { paused, levels, zone: pick?.zone ?? 1 } })
  const cur = useRef({ front: 0, key: '', clip: '', mirror: false })

  // scene changed → load it on the back layer, crossfade once it plays
  useEffect(() => {
    const c = cur.current
    if (!pick) { for (const v of [a.current, b.current]) if (v) v.style.opacity = '0'; c.key = ''; c.clip = ''; return }
    if (pick.clip === c.clip && pick.mirror === c.mirror) { c.key = pick.key; return }
    c.key = pick.key; c.clip = pick.clip; c.mirror = pick.mirror
    const front = [a.current, b.current][c.front]!, back = [a.current, b.current][1 - c.front]!
    if (pick.flash && flashEl.current) {
      const f = flashEl.current
      f.style.transition = 'opacity 250ms ease-in'; f.style.opacity = '1'
      setTimeout(() => { f.style.transition = 'opacity 3500ms ease-out'; f.style.opacity = '0' }, 900)
    }
    back.src = src(pick.dir, pick.clip); back.loop = true; back.playbackRate = RATE
    back.style.transform = pick.mirror ? 'scaleX(-1)' : 'none'
    const want = pick.clip
    const go = () => {
      back.removeEventListener('playing', go)
      if (cur.current.clip !== want) return // a newer scene took over meanwhile
      back.playbackRate = RATE
      back.style.opacity = '1'; front.style.opacity = '0'
      c.front = 1 - c.front
      setTimeout(() => { if (front.style.opacity === '0') { front.pause(); front.removeAttribute('src'); front.load() } }, XFADE + 100)
    }
    back.addEventListener('playing', go)
    if (!st.current.paused) back.play().catch(() => {})
  }, [pick?.clip, pick?.mirror, pick?.key]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const v = [a.current, b.current][cur.current.front]
    if (!v || !v.getAttribute('src')) return
    if (paused) v.pause(); else v.play().catch(() => {})
  }, [paused])

  // a slow drift and zoom that never lines up with the 16 s loop, plus a glow that breathes with the bass (10 Hz)
  useEffect(() => {
    let bassS = 0
    const t0 = performance.now()
    const iv = window.setInterval(() => {
      const w = wrap.current
      if (!w) return
      const t = (performance.now() - t0) / 1000
      const z = st.current.zone
      const lv = st.current.levels?.()
      if (lv) bassS += (lv.bass - bassS) * 0.35
      const amp = z === 2 ? 1 : z === 4 ? 0.8 : 0.55 // the deep-bass hyperspace tracks breathe the most
      const scale = 1.08 + 0.045 * Math.sin(t / 23) + bassS * 0.02 * amp
      const x = 2.2 * Math.sin(t / 37), y = 1.6 * Math.sin(t / 29 + 1)
      w.style.transform = `translate(${x.toFixed(2)}%, ${y.toFixed(2)}%) scale(${scale.toFixed(4)})`
      const hue = z === 2 ? 14 * Math.sin(t / 19) : 0
      w.style.filter = `brightness(${(0.92 + bassS * 0.28 * amp).toFixed(3)}) saturate(${(1.05 + bassS * 0.3 * amp).toFixed(3)}) hue-rotate(${hue.toFixed(1)}deg)`
    }, 100)
    return () => window.clearInterval(iv)
  }, [])

  const vStyle: React.CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0, transition: `opacity ${XFADE}ms ease` }
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      <div ref={wrap} className="absolute inset-0" style={{ willChange: 'transform, filter' }}>
        <video ref={a} muted playsInline preload="auto" disablePictureInPicture style={vStyle} />
        <video ref={b} muted playsInline preload="auto" disablePictureInPicture style={vStyle} />
      </div>
      <div ref={flashEl} className="absolute inset-0" style={{ background: 'radial-gradient(circle at 50% 35%, #fff 0%, #fff8e0 45%, #ffe3a0 100%)', opacity: 0 }} />
    </div>
  )
}
