import { type Asset, type BreathPattern, type Cue, type Phase, type SessionPlan, db } from '../db'
import { PHASE_NAMES } from './plan'
import { voiceUrl } from './voice'
import { MUSIC_TITLES } from './body'

const XFADE = 30 // seconds

/** Drone chord per phase: root Hz, intervals (semitones), filter cutoff, gain */
const DRONE: Record<Phase, { f: number; iv: number[]; cut: number; gain: number; shimmer: number }> = {
  1: { f: 220, iv: [0, 7, 12, 19], cut: 1800, gain: 0.9, shimmer: 0.06 },     // A – open fifths
  2: { f: 196, iv: [0, 7, 12, 16, 19], cut: 2200, gain: 1.0, shimmer: 0.09 },  // G major – warm
  3: { f: 164.8, iv: [0, 7, 14, 19, 24], cut: 2800, gain: 1.05, shimmer: 0.14 }, // E sus2 – wide
  4: { f: 220, iv: [0, 5, 12, 16], cut: 2000, gain: 0.95, shimmer: 0.07 },    // A add4 – coming home
  5: { f: 261.6, iv: [0, 7, 12], cut: 1500, gain: 0.7, shimmer: 0.04 },       // C – rest
}

export const BREATH_PATTERNS: Record<BreathPattern, { inhale: number; hold: number; exhale: number; hold2: number; label: string }> = {
  none: { inhale: 0, hold: 0, exhale: 0, hold2: 0, label: '' },
  '478': { inhale: 4, hold: 7, exhale: 8, hold2: 0, label: '4-7-8' },
  coherent: { inhale: 5.5, hold: 0, exhale: 5.5, hold2: 0, label: 'קוהרנטית' },
  box: { inhale: 4, hold: 4, exhale: 4, hold2: 4, label: 'קופסה' },
  wave: { inhale: 6, hold: 0, exhale: 8, hold2: 0, label: 'נשימת גל' },
  fire: { inhale: 1, hold: 0, exhale: 1, hold2: 0, label: 'נשימת אש' },
}

export type BreathStep = 'inhale' | 'hold' | 'exhale' | 'hold2' | 'none'

export interface EngineState {
  t: number
  phase: Phase
  phaseName: string
  running: boolean
  paused: boolean
  done: boolean
  breath: BreathStep
  breathProgress: number
  breathPattern: BreathPattern
  durationSec: number
  trackName: string
  trackNo: number
  trackCount: number
  musicGain: number
  /** on-screen instruction (couple evenings) */
  label: string
}

type Listener = (s: EngineState) => void

/** shared reverb impulse (built once per context) */
const reverbCache = new WeakMap<BaseAudioContext, ConvolverNode>()
function reverb(ctx: BaseAudioContext): ConvolverNode {
  let c = reverbCache.get(ctx)
  if (c) return c
  const sec = ctx instanceof OfflineAudioContext ? 3.5 : 7, len = Math.floor(ctx.sampleRate * sec)
  const buf = ctx.createBuffer(2, len, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2)
  }
  c = ctx.createConvolver(); c.buffer = buf
  reverbCache.set(ctx, c)
  return c
}

class Drone {
  private nodes: AudioScheduledSourceNode[] = []
  private gain: GainNode
  constructor(private ctx: BaseAudioContext, out: AudioNode, phase: Phase, output: 'speakers' | 'headphones' = 'speakers', binaural = false, fadeIn = XFADE) {
    const p = DRONE[phase]
    this.gain = ctx.createGain(); this.gain.gain.value = 0; this.gain.connect(out)
    const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = p.cut; filter.Q.value = 0.3
    // dry + wet
    const dry = ctx.createGain(); dry.gain.value = 0.7
    const wet = ctx.createGain(); wet.gain.value = 0.6
    const rv = reverb(ctx)
    filter.connect(dry); dry.connect(this.gain)
    filter.connect(rv); rv.connect(wet); wet.connect(this.gain)
    // slow filter sweep
    const fl = ctx.createOscillator(); fl.frequency.value = 0.02
    const flg = ctx.createGain(); flg.gain.value = p.cut * 0.25
    fl.connect(flg); flg.connect(filter.frequency); fl.start(); this.nodes.push(fl)

    p.iv.forEach((semi, i) => {
      const freq = p.f * Math.pow(2, semi / 12)
      const level = (i === 0 ? 0.5 : 0.28) / Math.sqrt(p.iv.length)
      // two slightly detuned voices per note, panned apart
      for (const [det, pan] of [[-5, -0.4], [5, 0.4]] as const) {
        const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = freq; o.detune.value = det
        const o2 = ctx.createOscillator(); o2.type = 'sawtooth'; o2.frequency.value = freq; o2.detune.value = det * 1.4
        const og = ctx.createGain(); og.gain.value = level
        const og2 = ctx.createGain(); og2.gain.value = level * (output === 'speakers' ? 0.22 : 0.14)
        const pn = ctx.createStereoPanner(); pn.pan.value = pan
        // breathing amplitude, very slow, never below 55%
        const lfo = ctx.createOscillator(); lfo.frequency.value = 0.015 + Math.random() * 0.03
        const lg = ctx.createGain(); lg.gain.value = level * 0.45
        lfo.connect(lg); lg.connect(og.gain)
        // slow drift in pitch
        const dr = ctx.createOscillator(); dr.frequency.value = 0.05 + Math.random() * 0.05
        const drg = ctx.createGain(); drg.gain.value = 2.5
        dr.connect(drg); drg.connect(o.detune)
        o.connect(og); o2.connect(og2); og.connect(pn); og2.connect(pn); pn.connect(filter)
        o.start(); o2.start(); lfo.start(); dr.start()
        this.nodes.push(o, o2, lfo, dr)
      }
    })
    // sub-octave root: only worth it on headphones (phone speakers can't reproduce it)
    if (output === 'headphones') {
      const sub = ctx.createOscillator(); sub.type = 'sine'; sub.frequency.value = p.f / 2
      const sg = ctx.createGain(); sg.gain.value = 0.35
      sub.connect(sg); sg.connect(filter); sub.start(); this.nodes.push(sub)
    }
    // binaural beat (headphones): carrier on the root, L/R differ by a theta/alpha offset per phase
    if (output === 'headphones' && binaural) {
      const beat = phase === 3 ? 4.5 : phase === 2 || phase === 4 ? 7 : 10 // theta at peak, alpha-ish elsewhere
      const car = p.f
      const merger = ctx.createChannelMerger(2)
      const bg = ctx.createGain(); bg.gain.value = 0.18
      for (const [ch, f] of [[0, car - beat / 2], [1, car + beat / 2]] as const) {
        const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f
        const g = ctx.createGain(); g.gain.value = 1
        o.connect(g); g.connect(merger, 0, ch); o.start(); this.nodes.push(o)
      }
      merger.connect(bg); bg.connect(this.gain)
    }
    // shimmer: filtered noise, barely there, through reverb only
    if (p.shimmer > 0) {
      const buf = ctx.createBuffer(1, ctx.sampleRate * 6, ctx.sampleRate)
      const d = buf.getChannelData(0)
      let b0 = 0, b1 = 0, b2 = 0
      for (let i = 0; i < d.length; i++) {
        const w = Math.random() * 2 - 1
        b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913
        d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.05
      }
      const n = ctx.createBufferSource(); n.buffer = buf; n.loop = true
      const nf = ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 1800; nf.Q.value = 0.8
      const ng = ctx.createGain(); ng.gain.value = p.shimmer
      n.connect(nf); nf.connect(ng); ng.connect(rv); n.start(); this.nodes.push(n)
    }
    this.gain.gain.linearRampToValueAtTime(p.gain, ctx.currentTime + fadeIn)
  }
  stop(fade = XFADE) {
    const t = this.ctx.currentTime
    this.gain.gain.cancelScheduledValues(t)
    this.gain.gain.setValueAtTime(this.gain.gain.value, t)
    this.gain.gain.linearRampToValueAtTime(0, t + fade)
    setTimeout(() => { this.nodes.forEach((n) => { try { n.stop() } catch { /* */ } }); this.gain.disconnect() }, fade * 1000 + 200)
  }
}

/** Streaming track via HTMLAudioElement.
 *  direct=true: NOT routed through the AudioContext – iOS keeps playing it in the background like a music app.
 *  Volume/fades are then done on the element itself. */
class Track {
  private el: HTMLAudioElement
  private shadow: HTMLAudioElement | null = null
  private shadowSrc: MediaElementAudioSourceNode | null = null
  private src: MediaElementAudioSourceNode | null = null
  private gain: GainNode | null = null
  private url: string
  private target: number
  private fadeTimer = 0
  constructor(private ctx: AudioContext, out: AudioNode, blob: Blob, loop: boolean, gainDb: number, fadeIn: number, private direct = false, private busGain = 1, analyser: AnalyserNode | null = null) {
    this.url = URL.createObjectURL(blob)
    this.el = new Audio()
    this.el.setAttribute('x-webkit-airplay', 'allow') // AirPlay picker can target this element
    this.el.src = this.url
    this.el.loop = loop
    this.el.preload = 'auto'
    this.target = Math.pow(10, gainDb / 20)
    if (direct) {
      this.el.volume = 0
      void this.el.play().catch((e) => console.warn('track play failed', e))
      this.fadeTo(this.target * this.busGain, fadeIn)
      // visual tap: a second element, silent, feeding the analyser (only works while the page is visible)
      if (analyser) {
        try {
          this.shadow = new Audio(); this.shadow.src = this.url; this.shadow.loop = loop; this.shadow.preload = 'auto'; this.shadow.crossOrigin = 'anonymous'
          this.shadowSrc = ctx.createMediaElementSource(this.shadow)
          const mute = ctx.createGain(); mute.gain.value = 0
          this.shadowSrc.connect(analyser); analyser.connect(mute); mute.connect(ctx.destination)
          void this.shadow.play().catch(() => {})
        } catch { this.shadow = null }
      }
    } else {
      this.el.crossOrigin = 'anonymous'
      this.gain = ctx.createGain(); this.gain.gain.value = 0; this.gain.connect(out)
      this.src = ctx.createMediaElementSource(this.el)
      this.src.connect(this.gain)
      if (analyser) this.src.connect(analyser)
      void this.el.play().catch((e) => console.warn('track play failed', e))
      this.gain.gain.linearRampToValueAtTime(this.target, ctx.currentTime + fadeIn)
    }
  }
  /** element-level fade (direct mode) */
  private fadeTo(v: number, sec: number) {
    clearInterval(this.fadeTimer)
    const from = this.el.volume, steps = Math.max(1, Math.round(sec * 20)); let i = 0
    this.fadeTimer = window.setInterval(() => { i++; this.el.volume = Math.max(0, Math.min(1, from + (v - from) * (i / steps))); if (i >= steps) clearInterval(this.fadeTimer) }, 50)
  }
  setBus(v: number) { this.busGain = v; if (this.direct) this.fadeTo(this.target * v, 0.3) }
  duck(factor: number, sec: number) { if (this.direct) this.fadeTo(this.target * this.busGain * factor, sec) }
  pause() { this.el.pause(); this.shadow?.pause() }
  resume() { void this.el.play().catch(() => {}); if (this.shadow) { this.shadow.currentTime = this.el.currentTime; void this.shadow.play().catch(() => {}) } }
  /** keep the silent visual copy aligned with the audible one */
  syncShadow() { if (!this.shadow) return; if (Math.abs(this.shadow.currentTime - this.el.currentTime) > 0.35) this.shadow.currentTime = this.el.currentTime; if (this.shadow.paused && !this.el.paused) void this.shadow.play().catch(() => {}) }
  /** iOS may have paused the element while backgrounded; if we are supposed to be playing, play again */
  kick() { if (this.el.paused && !this.el.ended && this.el.src) void this.el.play().catch(() => {}) }
  get ended() { return this.el.ended }
  /** the audible media element (for AirPlay / Remote Playback) */
  get media() { return this.el }
  stop(fade: number) {
    if (this.direct) { this.fadeTo(0, fade) } else if (this.gain) {
      const t = this.ctx.currentTime
      this.gain.gain.cancelScheduledValues(t); this.gain.gain.setValueAtTime(this.gain.gain.value, t); this.gain.gain.linearRampToValueAtTime(0, t + fade)
    }
    setTimeout(() => { this.el.pause(); this.el.src = ''; this.src?.disconnect(); this.gain?.disconnect(); if (this.shadow) { this.shadow.pause(); this.shadow.src = ''; this.shadowSrc?.disconnect() } URL.revokeObjectURL(this.url) }, fade * 1000 + 100)
  }
}

/** Render a phase drone to a looping WAV blob (offline), so it can play as a media element and survive iOS backgrounding */
const LOOP_SEC = 30
const droneCache = new Map<string, Blob>()
const droneKey = (phase: Phase, output: 'speakers' | 'headphones', binaural: boolean) => `${phase}-${output}-${binaural}`
export async function renderDroneBlob(phase: Phase, output: 'speakers' | 'headphones', binaural: boolean): Promise<Blob> {
  const key = droneKey(phase, output, binaural)
  const cached = droneCache.get(key); if (cached) return cached
  const sr = 22050
  const off = new OfflineAudioContext(2, sr * LOOP_SEC, sr)
  const out = off.createGain(); out.gain.value = 1; out.connect(off.destination)
  new Drone(off, out, phase, output, binaural, 0.05)
  const buf = await off.startRendering()
  // make it loop seamlessly: crossfade last 3s into first 3s
  const xf = Math.floor(sr * 3), n = buf.length
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    const d = buf.getChannelData(ch)
    for (let i = 0; i < xf; i++) {
      const a = i / xf
      d[n - xf + i] = d[n - xf + i] * (1 - a) + d[i] * a
    }
  }
  const blob = encodeWav(buf, n)
  droneCache.set(key, blob)
  return blob
}
function encodeWav(buf: AudioBuffer, length: number): Blob {
  const ch = buf.numberOfChannels, sr = buf.sampleRate
  const bytes = 44 + length * ch * 2
  const ab = new ArrayBuffer(bytes); const v = new DataView(ab)
  const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)) }
  str(0, 'RIFF'); v.setUint32(4, bytes - 8, true); str(8, 'WAVE'); str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true)
  v.setUint16(22, ch, true); v.setUint32(24, sr, true); v.setUint32(28, sr * ch * 2, true); v.setUint16(32, ch * 2, true); v.setUint16(34, 16, true)
  str(36, 'data'); v.setUint32(40, length * ch * 2, true)
  let o = 44
  const chans = Array.from({ length: ch }, (_, i) => buf.getChannelData(i))
  for (let i = 0; i < length; i++) for (let c = 0; c < ch; c++) { const x = Math.max(-1, Math.min(1, chans[c][i])); v.setInt16(o, x < 0 ? x * 0x8000 : x * 0x7fff, true); o += 2 }
  return new Blob([ab], { type: 'audio/wav' })
}

export class SessionEngine {
  private ctx: AudioContext | null = null
  private master!: GainNode
  private musicBus!: GainNode
  private voiceBus!: GainNode
  private breathBus!: GainNode
  analyser: AnalyserNode | null = null
  private freq = new Uint8Array(0)
  private current: Drone | Track | null = null
  private cueIdx = 0
  /** session clock is wall-clock based: the AudioContext may be suspended by iOS in the background while media elements keep playing */
  private startWall = 0
  private pausedAt = 0
  /** "+10 min" insertions, in plan time: at plan time `at` the session holds for `sec` seconds; later cues shift */
  private ins: { at: number; sec: number }[] = []
  /** music cue chosen while paused (seek/next/prev) – started on resume */
  private pendingMusic: Cue | null = null
  /** emergency: quiet anchor drone, timeline frozen until seek/stop */
  private calmMode = false
  private musicCues: Cue[]
  private raf = 0
  private ivl = 0
  private listeners = new Set<Listener>()
  private buffers = new Map<string, AudioBuffer>()
  private blobs = new Map<string, Blob>()
  private names = new Map<string, string>()
  private breathPattern: BreathPattern = 'none'
  private breathStart = 0
  private lastBreathStep: BreathStep = 'none'
  private vibrate = true
  private gains = { music: 0.8, voice: 1, breath: 0.5 }
  private output: 'speakers' | 'headphones' = 'speakers'
  private binaural = true
  state: EngineState

  constructor(public plan: SessionPlan) {
    this.musicCues = plan.cues.filter((c) => c.layer === 'music' && c.asset)
    this.state = { t: 0, phase: 1, phaseName: PHASE_NAMES[1], running: false, paused: false, done: false, breath: 'none', breathProgress: 0, breathPattern: 'none', durationSec: plan.durationSec, trackName: '', trackNo: 0, trackCount: this.musicCues.length, musicGain: 0.8, label: '' }
  }

  private now() { return Date.now() / 1000 }

  /** plan time → session time (adds every insertion made before it) */
  private toSession(p: number) { let s = p; for (const i of this.ins) if (i.at < p) s += i.sec; return s }
  /** session time → plan time; gap=true while inside a "+10" insertion */
  private toPlan(s: number): { p: number; gap: boolean } {
    let acc = 0
    for (const i of this.ins) {
      const start = i.at + acc
      if (s <= start) break
      if (s < start + i.sec) return { p: i.at, gap: true }
      acc += i.sec
    }
    return { p: s - acc, gap: false }
  }

  /** phase spans in session time (stretched by "+10" insertions) – for the phase strip */
  phaseSpans() {
    return this.plan.phases.map((p) => ({ n: p.n, startSec: this.toSession(p.startSec), endSec: this.toSession(p.endSec) }))
  }

  /** audio-reactive levels for visuals: { bass, mid, high, energy } 0..1 */
  levels(): { bass: number; mid: number; high: number; energy: number } {
    if (!this.analyser) return { bass: 0, mid: 0, high: 0, energy: 0 }
    this.analyser.getByteFrequencyData(this.freq)
    const n = this.freq.length // 256 bins @ ~86 Hz each at 44.1k
    const avg = (a: number, b: number) => { let s = 0; for (let i = a; i < b; i++) s += this.freq[i]; return s / ((b - a) * 255) }
    const bass = avg(1, 6), mid = avg(6, 40), high = avg(40, Math.min(n, 120))
    return { bass, mid, high, energy: bass * 0.5 + mid * 0.35 + high * 0.15 }
  }

  on(l: Listener) { this.listeners.add(l); return () => this.listeners.delete(l) }
  private emit() { this.lastEmit = performance.now(); this.listeners.forEach((l) => l({ ...this.state })) }
  /** UI updates from the frame loop are throttled (~10/s); discrete events still emit immediately */
  private lastEmit = 0
  private emittedBreath: BreathStep | null = null
  private emitThrottled() { if (performance.now() - this.lastEmit > 100 || this.state.breath !== this.emittedBreath) { this.emittedBreath = this.state.breath; this.emit() } }

  async init(opts: { haptics: boolean; gains: { music: number; voice: number; breath: number }; output?: 'speakers' | 'headphones'; binaural?: boolean }) {
    this.vibrate = opts.haptics
    this.gains = opts.gains
    this.output = opts.output ?? 'speakers'
    this.binaural = opts.binaural ?? true
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    this.ctx = ctx
    this.master = ctx.createGain(); this.master.gain.value = 1.6
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -10; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = 0.05; comp.release.value = 0.4
    this.master.connect(comp); comp.connect(ctx.destination)
    this.musicBus = ctx.createGain(); this.musicBus.gain.value = this.gains.music; this.musicBus.connect(this.master)
    this.voiceBus = ctx.createGain(); this.voiceBus.gain.value = this.gains.voice; this.voiceBus.connect(this.master)
    this.breathBus = ctx.createGain(); this.breathBus.gain.value = this.gains.breath; this.breathBus.connect(this.master)
    this.analyser = ctx.createAnalyser(); this.analyser.fftSize = 512; this.analyser.smoothingTimeConstant = 0.82
    this.freq = new Uint8Array(this.analyser.frequencyBinCount)
    // drone/voice/breath also feed the analyser (via the music bus tap)
    this.musicBus.connect(this.analyser)
    // preload: voice cues are decoded (short); music stays as blobs and streams
    // built-in narration clips used by this plan (+ the emergency anchor), fetched from the app bundle (precached → offline)
    const clipIds = [...new Set([...this.plan.cues.filter((c) => c.layer === 'voice' && c.clip).map((c) => c.clip as string), 'emergency'])]
    await Promise.all(clipIds.map(async (id) => {
      try {
        const r = await fetch(voiceUrl(id, this.plan.address ?? 'm'))
        if (r.ok) this.buffers.set(`clip:${id}`, await ctx.decodeAudioData(await r.arrayBuffer()))
      } catch (e) { console.warn('voice clip failed', id, e) }
    }))
    const voiceIds = [...new Set(this.plan.cues.filter((c) => c.layer === 'voice' && c.asset).map((c) => c.asset as string))]
    const musicIds = [...new Set(this.plan.cues.filter((c) => c.layer === 'music' && c.asset).map((c) => c.asset as string))]
    const voices = await db.assets.bulkGet(voiceIds)
    await Promise.all(voices.map(async (a?: Asset) => {
      if (!a) return
      try { this.buffers.set(a.id, await ctx.decodeAudioData(await a.blob.arrayBuffer())) } catch (e) { console.warn('decode failed', a.name, e) }
    }))
    await this.loadBreathClips(ctx)
    // built-in journey music (body & couple journeys), shipped in public/music and precached
    const trackIds = [...new Set(this.plan.cues.filter((c) => c.layer === 'music' && c.track).map((c) => c.track as string))]
    await Promise.all(trackIds.map(async (id) => {
      try { const r = await fetch(`${import.meta.env.BASE_URL}music/${id}.mp3`); if (r.ok) { this.blobs.set(`track:${id}`, await r.blob()); this.names.set(`track:${id}`, MUSIC_TITLES[id] ?? '') } } catch { /* falls back to the drone */ }
    }))
    const music = await db.assets.bulkGet(musicIds)
    music.forEach((a?: Asset) => { if (a) { this.blobs.set(a.id, a.blob); this.names.set(a.id, a.name) } })
    // phases that will use the built-in drone → pre-render to looping files (background-safe)
    const dronePhases = new Set<Phase>()
    for (const c of this.plan.cues) if (c.layer === 'music' && c.action === 'play' && !c.asset && !c.track) dronePhases.add(this.plan.phases.find((p) => c.t >= p.startSec && c.t < p.endSec)?.n ?? 3)
    const order = [...dronePhases].sort((a, b) => a - b)
    const first = order.find((ph) => this.plan.phases[0]?.n === ph) ?? order[0]
    if (first !== undefined) { try { await renderDroneBlob(first, this.output, this.binaural) } catch (e) { console.warn('drone render failed', e) } }
    // the rest render lazily while the session runs (each ~1–2 s); last: the emergency anchor drone
    void (async () => {
      for (const ph of order) if (ph !== first) { try { await renderDroneBlob(ph, this.output, this.binaural) } catch { /* fallback to live drone */ } }
      try { await renderDroneBlob(5, this.output, false) } catch { /* live fallback */ }
    })()
    this.state.musicGain = this.gains.music
    this.setupMediaSession()
    document.addEventListener('visibilitychange', this.onVisibility)
  }

  private onVisibility = () => {
    if (!this.ctx || !this.state.running || this.state.paused) return
    if (document.visibilityState === 'visible') {
      void this.ctx.resume()
      if (this.current instanceof Track) this.current.kick()
      this.tick()
    }
  }

  private setupMediaSession() {
    if (!('mediaSession' in navigator)) return
    navigator.mediaSession.metadata = new MediaMetadata({ title: 'המדריך', artist: PHASE_NAMES[this.state.phase], album: 'מסע' })
    navigator.mediaSession.setActionHandler('pause', () => this.pause())
    navigator.mediaSession.setActionHandler('play', () => this.resume())
    navigator.mediaSession.setActionHandler('stop', () => this.stop())
  }

  start() {
    if (!this.ctx) throw new Error('init first')
    void this.ctx.resume()
    this.startWall = this.now()
    this.state.running = true
    this.cueIdx = 0
    this.tick()
    this.keepAlive()
    // rAF stops in background; a coarse interval keeps cues firing (track changes) while the screen is off
    this.ivl = window.setInterval(() => {
      if (!this.state.running || this.state.paused) return
      if (this.ctx && this.ctx.state !== 'running') void this.ctx.resume().catch(() => {})
      if (this.current instanceof Track) { this.current.kick(); this.current.syncShadow() }
      if (document.hidden) this.tick()
    }, 1000)
  }

  /** silent looping buffer keeps iOS audio session alive in background */
  private keepAlive() {
    if (!this.ctx) return
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate)
    const s = this.ctx.createBufferSource(); s.buffer = buf; s.loop = true
    const g = this.ctx.createGain(); g.gain.value = 0.0001
    s.connect(g); g.connect(this.ctx.destination); s.start()
  }

  get elapsed() {
    if (!this.ctx) return 0
    if (this.state.paused) return this.pausedAt
    return this.now() - this.startWall
  }

  private tick = () => {
    if (!this.state.running || this.state.paused) return
    cancelAnimationFrame(this.raf)
    if (!this.calmMode) this.checkAlbumEnd()
    if (!this.state.running) return
    const t = this.elapsed
    this.state.t = t
    if (!this.calmMode) {
      const due: Cue[] = []
      while (this.cueIdx < this.plan.cues.length && this.toSession(this.plan.cues[this.cueIdx].t) <= t) due.push(this.plan.cues[this.cueIdx++])
      if (due.length) this.fireDue(due, t)
    }
    this.updateBreath(t)
    if (!this.calmMode && t >= this.toSession(this.plan.durationSec)) { this.finish(); return }
    this.emitThrottled()
    if (!document.hidden) this.raf = requestAnimationFrame(this.tick)
  }

  /** fire due cues; after a background stall only the latest state per layer is applied (no burst of track restarts, no stale narration) */
  private fireDue(due: Cue[], t: number) {
    const lastOf = (f: (c: Cue) => boolean) => { for (let i = due.length - 1; i >= 0; i--) if (f(due[i])) return due[i]; return undefined }
    for (const c of [lastOf((x) => x.layer === 'visual' && x.action === 'phase'), lastOf((x) => x.layer === 'visual' && x.action === 'label'), lastOf((x) => x.layer === 'breath'), lastOf((x) => x.layer === 'music')]) if (c) this.fire(c)
    for (const c of due) if (c.layer === 'voice' && t - this.toSession(c.t) < 5) this.fire(c)
  }

  /** album: a track finished before its successor's cue → fill a "+10" gap with the phase drone, otherwise move straight on */
  private checkAlbumEnd() {
    if (this.plan.mode !== 'album' || !(this.current instanceof Track) || !this.current.ended) return
    const { p, gap } = this.toPlan(this.elapsed)
    if (gap) { this.playDrone(this.state.phase, 4, this.binaural, 'דרון · הארכה'); return }
    const next = this.musicCues.find((c) => c.t > p + 0.01)
    if (next) this.seek(next.t)
    else this.finish()
  }

  /** narration over the voice bus, ducking the music (graph bus + direct media element) for its length */
  private voiceSrc: AudioBufferSourceNode | null = null
  private playVoice(buf: AudioBuffer, duckDb: number) {
    if (!this.ctx) return
    try { this.voiceSrc?.stop() } catch { /* already ended */ }
    const s = this.ctx.createBufferSource(); s.buffer = buf; s.connect(this.voiceBus); s.start()
    this.voiceSrc = s
    const duck = Math.pow(10, duckDb / 20)
    const now = this.ctx.currentTime
    this.musicBus.gain.cancelScheduledValues(now)
    this.musicBus.gain.setTargetAtTime(this.gains.music * duck, now, 0.8)
    this.musicBus.gain.setTargetAtTime(this.gains.music, now + buf.duration + 1, 1.5)
    if (this.current instanceof Track) { this.current.duck(duck, 0.8); setTimeout(() => (this.current instanceof Track) && this.current.duck(1, 1.5), (buf.duration + 1) * 1000) }
  }

  private playDrone(phase: Phase, fade: number, binaural = this.binaural, name = '') {
    if (!this.ctx) return
    const prev = this.current
    const blob = droneCache.get(droneKey(phase, this.output, binaural))
    this.current = blob
      ? new Track(this.ctx, this.musicBus, blob, true, 0, fade, true, this.gains.music, this.analyser)
      : new Drone(this.ctx, this.musicBus, phase, this.output, binaural, fade)
    prev?.stop(fade)
    this.state.trackName = name
  }

  private setTrackInfo(c: Cue) {
    if (!c.asset) { this.state.trackName = ''; return }
    this.state.trackName = this.names.get(c.asset) ?? ''
    this.state.trackNo = this.musicCues.indexOf(c) + 1
    if ('mediaSession' in navigator && navigator.mediaSession.metadata) navigator.mediaSession.metadata.title = this.state.trackName || 'המדריך'
  }

  private fire(c: Cue) {
    if (!this.ctx) return
    if (c.layer === 'music' && c.action === 'play' && this.state.paused) return
    if (c.layer === 'visual' && c.action === 'label') this.state.label = c.label ?? ''
    if (c.layer === 'visual' && c.action === 'phase' && c.phase) {
      this.state.phase = c.phase; this.state.phaseName = PHASE_NAMES[c.phase]
      if ('mediaSession' in navigator && navigator.mediaSession.metadata) navigator.mediaSession.metadata.artist = PHASE_NAMES[c.phase]
    }
    if (c.layer === 'music' && c.action === 'play') {
      const prev = this.current
      if (c.track && this.blobs.has(`track:${c.track}`)) {
        this.current = new Track(this.ctx, this.musicBus, this.blobs.get(`track:${c.track}`)!, true, 0, prev ? 8 : 4, true, this.gains.music, this.analyser)
        prev?.stop(8)
        this.state.trackName = this.names.get(`track:${c.track}`) ?? ''
      } else if (c.asset && this.blobs.has(c.asset)) {
        const isAlbum = this.plan.mode === 'album'
        this.current = new Track(this.ctx, this.musicBus, this.blobs.get(c.asset)!, !isAlbum, 0, isAlbum ? 1.5 : XFADE, true, this.gains.music, this.analyser)
        prev?.stop(isAlbum ? 1.5 : XFADE)
        this.setTrackInfo(c)
      } else {
        this.playDrone(this.state.phase, XFADE)
      }
    }
    const vkey = c.clip ? `clip:${c.clip}` : c.asset
    if (c.layer === 'voice' && c.action === 'play' && vkey && this.buffers.has(vkey)) this.playVoice(this.buffers.get(vkey)!, c.duck ?? -6)
    if (c.layer === 'breath' && c.action === 'pattern') {
      this.breathPattern = c.pattern ?? 'none'
      this.breathStart = this.elapsed
      this.state.breathPattern = this.breathPattern
    }
  }

  private updateBreath(t: number) {
    const p = BREATH_PATTERNS[this.breathPattern]
    const cycle = p.inhale + p.hold + p.exhale + p.hold2
    if (!cycle) { this.state.breath = 'none'; this.state.breathProgress = 0; return }
    const x = (t - this.breathStart) % cycle
    let step: BreathStep; let prog: number
    if (x < p.inhale) { step = 'inhale'; prog = x / p.inhale }
    else if (x < p.inhale + p.hold) { step = 'hold'; prog = (x - p.inhale) / p.hold }
    else if (x < p.inhale + p.hold + p.exhale) { step = 'exhale'; prog = (x - p.inhale - p.hold) / p.exhale }
    else { step = 'hold2'; prog = (x - p.inhale - p.hold - p.exhale) / p.hold2 }
    if (step !== this.lastBreathStep) {
      this.lastBreathStep = step
      this.breathTone(step, step === 'inhale' ? p.inhale : step === 'exhale' ? p.exhale : 0)
      if (this.vibrate && navigator.vibrate && (step === 'inhale' || step === 'exhale')) navigator.vibrate(step === 'inhale' ? 30 : [20, 40, 20])
    }
    this.state.breath = step; this.state.breathProgress = prog
  }

  /** real recorded breaths (ElevenLabs Sound Effects, trimmed + time-fitted offline): public/breath/{in|out}-{sec}-{1|2}.mp3 */
  private breathClips = new Map<string, AudioBuffer>()
  private breathAlt = 0
  private async loadBreathClips(ctx: AudioContext) {
    const names = ['in-4', 'in-5.5', 'out-4', 'out-5.5', 'out-8'].flatMap((n) => [`${n}-1`, `${n}-2`])
    await Promise.all(names.map(async (n) => {
      try {
        const r = await fetch(`${import.meta.env.BASE_URL}breath/${n}.mp3`)
        if (r.ok) this.breathClips.set(n, await ctx.decodeAudioData(await r.arrayBuffer()))
      } catch { /* offline before first cache – breath stays visual + haptic */ }
    }))
  }

  /** Breath sound: inhale through the nose / exhale through the mouth, the clip closest to the step length, alternating takes */
  private breathTone(step: BreathStep, dur: number) {
    // fast breathing (fire): too short for a recorded breath – orb + haptics only
    if (!this.ctx || !dur || dur < 2.5 || (step !== 'inhale' && step !== 'exhale')) return
    const lens = step === 'inhale' ? [4, 5.5] : [4, 5.5, 8]
    const len = lens.reduce((a, b) => (Math.abs(b - dur) < Math.abs(a - dur) ? b : a))
    this.breathAlt = (this.breathAlt + 1) % 2
    const buf = this.breathClips.get(`${step === 'inhale' ? 'in' : 'out'}-${len}-${this.breathAlt + 1}`)
    if (!buf) return
    const ctx = this.ctx, now = ctx.currentTime
    const src = ctx.createBufferSource(); src.buffer = buf
    // small rate nudge fits the clip to odd step lengths (±15%) without audible pitch change on breath noise
    const rate = Math.min(1.15, Math.max(0.85, buf.duration / (dur * 0.94)))
    src.playbackRate.value = rate
    const g = ctx.createGain(); g.gain.value = step === 'inhale' ? 1.15 : 0.95
    src.connect(g); g.connect(this.breathBus)
    const end = now + Math.min(buf.duration / rate, dur)
    g.gain.setValueAtTime(g.gain.value, Math.max(now, end - 0.3)); g.gain.linearRampToValueAtTime(0, end)
    src.start(now); src.stop(end + 0.05)
    src.onended = () => { src.disconnect(); g.disconnect() }
  }

  pause() {
    if (!this.state.running || this.state.paused) return
    this.pausedAt = this.elapsed
    this.state.paused = true
    cancelAnimationFrame(this.raf)
    if (this.current instanceof Track) this.current.pause()
    void this.ctx?.suspend()
    this.emit()
  }

  resume() {
    if (!this.state.paused || !this.ctx) return
    void this.ctx.resume().then(() => {
      if (!this.state.paused) return
      this.startWall = this.now() - this.pausedAt
      this.state.paused = false
      if (this.pendingMusic) { const c = this.pendingMusic; this.pendingMusic = null; this.fire(c) }
      else if (this.current instanceof Track) this.current.resume()
      this.tick()
    })
  }

  /** +N minutes: push all future cues and the end */
  extend(sec = 600) {
    if (!this.state.running) return
    const { p } = this.toPlan(this.elapsed)
    this.ins.push({ at: p, sec }); this.ins.sort((a, b) => a.at - b.at)
    this.state.durationSec = this.toSession(this.plan.durationSec)
    // album tracks don't loop: the gap after the current track is filled with the phase drone (pre-render it now)
    if (this.plan.mode === 'album') void renderDroneBlob(this.state.phase, this.output, this.binaural).catch(() => {})
    this.emit()
  }

  /** media element currently playing (music track or rendered drone) – target for AirPlay / Chromecast */
  castMedia(): HTMLAudioElement | null { return this.current instanceof Track ? this.current.media : null }

  /** jump to next / previous music cue (album mode) */
  nextTrack() { this.jumpTrack(1) }
  prevTrack() { this.jumpTrack(-1) }
  private jumpTrack(dir: 1 | -1) {
    const music = this.musicCues
    if (!music.length) return
    const t = this.toPlan(this.elapsed).p
    let idx = music.findIndex((c, i) => t >= c.t && (i === music.length - 1 || t < music[i + 1].t))
    if (idx < 0) idx = 0
    // prev: if more than 5s into track, restart it
    if (dir === -1 && t - music[idx].t > 5) { this.seek(music[idx].t); return }
    const target = music[Math.max(0, Math.min(music.length - 1, idx + dir))]
    this.seek(target.t)
  }
  seekPhase(n: Phase) {
    const p = this.plan.phases.find((x) => x.n === n)
    if (p) this.seek(p.startSec)
  }
  setMusicGain(v: number) {
    this.gains.music = v; this.state.musicGain = v
    if (this.ctx) this.musicBus.gain.setTargetAtTime(v, this.ctx.currentTime, 0.1)
    if (this.current instanceof Track) this.current.setBus(v)
    this.emit()
  }

  /** jump to the start of the return phase */
  skipToReturn() {
    const ret = this.plan.phases.find((p) => p.n === 4) ?? this.plan.phases[this.plan.phases.length - 1]
    this.seek(ret.startSec)
  }

  private seek(planT: number) {
    if (!this.ctx) return
    this.calmMode = false
    const st = this.toSession(planT)
    if (this.state.paused) this.pausedAt = st
    this.startWall = this.now() - st
    this.cueIdx = 0
    // re-fire state cues up to planT without audio restarts except music
    const stateCues = this.plan.cues.filter((c) => c.t <= planT)
    const lastMusic = [...stateCues].reverse().find((c) => c.layer === 'music')
    const lastPhase = [...stateCues].reverse().find((c) => c.layer === 'visual' && c.action === 'phase')
    const lastLabel = [...stateCues].reverse().find((c) => c.layer === 'visual' && c.action === 'label')
    if (lastLabel) this.fire(lastLabel)
    const lastBreath = [...stateCues].reverse().find((c) => c.layer === 'breath')
    if (lastPhase) this.fire(lastPhase)
    if (lastBreath) this.fire(lastBreath)
    if (lastMusic) {
      // paused: don't start audio now, but make sure the right music starts on resume (not the old track)
      if (this.state.paused) { this.pendingMusic = lastMusic; this.setTrackInfo(lastMusic) }
      else { this.pendingMusic = null; this.fire(lastMusic) }
    }
    this.cueIdx = this.plan.cues.findIndex((c) => c.t > planT)
    if (this.cueIdx < 0) this.cueIdx = this.plan.cues.length
    this.state.t = this.elapsed
    this.updateBreath(this.state.t)
    this.emit()
  }

  /** emergency: drop to quiet drone, calm */
  calm() {
    if (!this.ctx) return
    // freeze the timeline: no music/voice/breath cues replace the anchor until "home" (seek) or stop
    this.calmMode = true
    this.pendingMusic = null
    this.playDrone(5, 4, false, 'עיגון')
    const anchor = this.buffers.get('clip:emergency')
    if (anchor) setTimeout(() => { if (this.calmMode) this.playVoice(anchor, -9) }, 2500)
    this.breathPattern = 'coherent'; this.breathStart = this.elapsed; this.state.breathPattern = 'coherent'
    if (this.state.paused) this.resume()
    this.emit()
  }

  private finish() {
    this.state.done = true; this.state.running = false; clearInterval(this.ivl)
    this.current?.stop(8)
    this.emit()
    setTimeout(() => this.stop(), 9000)
  }

  stop() {
    this.state.running = false
    document.removeEventListener('visibilitychange', this.onVisibility)
    cancelAnimationFrame(this.raf); clearInterval(this.ivl)
    this.current?.stop(2)
    setTimeout(() => { void this.ctx?.close() }, 2500)
    this.emit()
  }
}
