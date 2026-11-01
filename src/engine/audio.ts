import { type Asset, type BreathPattern, type Cue, type Phase, type SessionPlan, db } from '../db'
import { PHASE_NAMES } from './plan'

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
}

type Listener = (s: EngineState) => void

/** shared reverb impulse (built once per context) */
const reverbCache = new WeakMap<AudioContext, ConvolverNode>()
function reverb(ctx: AudioContext): ConvolverNode {
  let c = reverbCache.get(ctx)
  if (c) return c
  const sec = 7, len = ctx.sampleRate * sec
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
  constructor(private ctx: AudioContext, out: AudioNode, phase: Phase, output: 'speakers' | 'headphones' = 'speakers', binaural = false) {
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
    this.gain.gain.linearRampToValueAtTime(p.gain, ctx.currentTime + XFADE)
  }
  stop(fade = XFADE) {
    const t = this.ctx.currentTime
    this.gain.gain.cancelScheduledValues(t)
    this.gain.gain.setValueAtTime(this.gain.gain.value, t)
    this.gain.gain.linearRampToValueAtTime(0, t + fade)
    setTimeout(() => { this.nodes.forEach((n) => { try { n.stop() } catch { /* */ } }); this.gain.disconnect() }, fade * 1000 + 200)
  }
}

/** Streaming track: HTMLAudioElement → MediaElementSource. No full decode, so 55 tracks don't blow up RAM. */
class Track {
  private el: HTMLAudioElement
  private src: MediaElementAudioSourceNode
  private gain: GainNode
  private url: string
  constructor(private ctx: AudioContext, out: AudioNode, blob: Blob, loop: boolean, gainDb: number, fadeIn: number) {
    this.url = URL.createObjectURL(blob)
    this.el = new Audio()
    this.el.src = this.url
    this.el.loop = loop
    this.el.preload = 'auto'
    this.el.crossOrigin = 'anonymous'
    this.gain = ctx.createGain(); this.gain.gain.value = 0; this.gain.connect(out)
    this.src = ctx.createMediaElementSource(this.el)
    this.src.connect(this.gain)
    const target = Math.pow(10, gainDb / 20)
    void this.el.play().catch((e) => console.warn('track play failed', e))
    this.gain.gain.linearRampToValueAtTime(target, ctx.currentTime + fadeIn)
  }
  pause() { this.el.pause() }
  resume() { void this.el.play().catch(() => {}) }
  stop(fade: number) {
    const t = this.ctx.currentTime
    this.gain.gain.cancelScheduledValues(t)
    this.gain.gain.setValueAtTime(this.gain.gain.value, t)
    this.gain.gain.linearRampToValueAtTime(0, t + fade)
    setTimeout(() => { this.el.pause(); this.el.src = ''; this.src.disconnect(); this.gain.disconnect(); URL.revokeObjectURL(this.url) }, fade * 1000 + 100)
  }
}

export class SessionEngine {
  private ctx: AudioContext | null = null
  private master!: GainNode
  private musicBus!: GainNode
  private voiceBus!: GainNode
  private breathBus!: GainNode
  private current: Drone | Track | null = null
  private cueIdx = 0
  private startCtxTime = 0
  private pausedAt = 0
  private offset = 0 // accumulated extension seconds applied to future cues
  private raf = 0
  private listeners = new Set<Listener>()
  private buffers = new Map<string, AudioBuffer>()
  private blobs = new Map<string, Blob>()
  private breathPattern: BreathPattern = 'none'
  private breathStart = 0
  private lastBreathStep: BreathStep = 'none'
  private vibrate = true
  private gains = { music: 0.8, voice: 1, breath: 0.5 }
  private output: 'speakers' | 'headphones' = 'speakers'
  private binaural = true
  state: EngineState

  constructor(public plan: SessionPlan) {
    this.state = { t: 0, phase: 1, phaseName: PHASE_NAMES[1], running: false, paused: false, done: false, breath: 'none', breathProgress: 0, breathPattern: 'none', durationSec: plan.durationSec }
  }

  on(l: Listener) { this.listeners.add(l); return () => this.listeners.delete(l) }
  private emit() { this.listeners.forEach((l) => l({ ...this.state })) }

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
    // preload: voice cues are decoded (short); music stays as blobs and streams
    const voiceIds = [...new Set(this.plan.cues.filter((c) => c.layer === 'voice' && c.asset).map((c) => c.asset as string))]
    const musicIds = [...new Set(this.plan.cues.filter((c) => c.layer === 'music' && c.asset).map((c) => c.asset as string))]
    const voices = await db.assets.bulkGet(voiceIds)
    await Promise.all(voices.map(async (a?: Asset) => {
      if (!a) return
      try { this.buffers.set(a.id, await ctx.decodeAudioData(await a.blob.arrayBuffer())) } catch (e) { console.warn('decode failed', a.name, e) }
    }))
    const music = await db.assets.bulkGet(musicIds)
    music.forEach((a?: Asset) => { if (a) this.blobs.set(a.id, a.blob) })
    this.setupMediaSession()
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
    this.startCtxTime = this.ctx.currentTime
    this.state.running = true
    this.cueIdx = 0
    this.tick()
    this.keepAlive()
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
    return this.ctx.currentTime - this.startCtxTime
  }

  private tick = () => {
    if (!this.state.running || this.state.paused) return
    const t = this.elapsed
    this.state.t = t
    // fire due cues
    while (this.cueIdx < this.plan.cues.length && this.plan.cues[this.cueIdx].t + this.offset <= t) {
      this.fire(this.plan.cues[this.cueIdx++])
    }
    this.updateBreath(t)
    if (t >= this.plan.durationSec + this.offset) { this.finish(); return }
    this.emit()
    this.raf = requestAnimationFrame(this.tick)
  }

  private fire(c: Cue) {
    if (!this.ctx) return
    if (c.layer === 'visual' && c.action === 'phase' && c.phase) {
      this.state.phase = c.phase; this.state.phaseName = PHASE_NAMES[c.phase]
      if ('mediaSession' in navigator && navigator.mediaSession.metadata) navigator.mediaSession.metadata.artist = PHASE_NAMES[c.phase]
    }
    if (c.layer === 'music' && c.action === 'play') {
      const prev = this.current
      if (c.asset && this.blobs.has(c.asset)) {
        const isAlbum = this.plan.mode === 'album'
        this.current = new Track(this.ctx, this.musicBus, this.blobs.get(c.asset)!, !isAlbum, 0, isAlbum ? 1.5 : XFADE)
        prev?.stop(isAlbum ? 1.5 : XFADE)
      } else {
        this.current = new Drone(this.ctx, this.musicBus, this.state.phase, this.output, this.binaural)
        prev?.stop(XFADE)
      }
    }
    if (c.layer === 'voice' && c.action === 'play' && c.asset && this.buffers.has(c.asset)) {
      const buf = this.buffers.get(c.asset)!
      const s = this.ctx.createBufferSource(); s.buffer = buf; s.connect(this.voiceBus); s.start()
      const duck = Math.pow(10, (c.duck ?? -6) / 20)
      const now = this.ctx.currentTime
      this.musicBus.gain.cancelScheduledValues(now)
      this.musicBus.gain.setTargetAtTime(this.gains.music * duck, now, 0.8)
      this.musicBus.gain.setTargetAtTime(this.gains.music, now + buf.duration + 1, 1.5)
    }
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

  private breathTone(step: BreathStep, dur: number) {
    if (!this.ctx || !dur) return
    const o = this.ctx.createOscillator(); o.type = 'sine'
    const g = this.ctx.createGain(); g.gain.value = 0
    o.connect(g); g.connect(this.breathBus)
    const now = this.ctx.currentTime
    if (step === 'inhale') { o.frequency.setValueAtTime(392, now); o.frequency.linearRampToValueAtTime(587, now + dur) }
    else { o.frequency.setValueAtTime(587, now); o.frequency.linearRampToValueAtTime(349, now + dur) }
    g.gain.linearRampToValueAtTime(0.35, now + dur * 0.4)
    g.gain.linearRampToValueAtTime(0, now + dur)
    o.start(now); o.stop(now + dur + 0.1)
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
      this.startCtxTime = this.ctx!.currentTime - this.pausedAt
      this.state.paused = false
      if (this.current instanceof Track) this.current.resume()
      this.tick()
    })
  }

  /** +N minutes: push all future cues and the end */
  extend(sec = 600) {
    this.offset += sec
    this.state.durationSec = this.plan.durationSec + this.offset
    this.emit()
  }

  /** jump to the start of the return phase */
  skipToReturn() {
    const ret = this.plan.phases.find((p) => p.n === 4) ?? this.plan.phases[this.plan.phases.length - 1]
    this.seek(ret.startSec)
  }

  private seek(planT: number) {
    if (!this.ctx) return
    this.startCtxTime = this.ctx.currentTime - (planT + this.offset)
    this.cueIdx = 0
    // re-fire state cues up to planT without audio restarts except music
    const stateCues = this.plan.cues.filter((c) => c.t <= planT)
    const lastMusic = [...stateCues].reverse().find((c) => c.layer === 'music')
    const lastPhase = [...stateCues].reverse().find((c) => c.layer === 'visual')
    const lastBreath = [...stateCues].reverse().find((c) => c.layer === 'breath')
    if (lastPhase) this.fire(lastPhase)
    if (lastBreath) this.fire(lastBreath)
    if (lastMusic) this.fire(lastMusic)
    this.cueIdx = this.plan.cues.findIndex((c) => c.t > planT)
    if (this.cueIdx < 0) this.cueIdx = this.plan.cues.length
  }

  /** emergency: drop to quiet drone, calm */
  calm() {
    if (!this.ctx) return
    const prev = this.current
    this.current = new Drone(this.ctx, this.musicBus, 5, this.output, false)
    prev?.stop(4)
    this.breathPattern = 'coherent'; this.breathStart = this.elapsed; this.state.breathPattern = 'coherent'
  }

  private finish() {
    this.state.done = true; this.state.running = false
    this.current?.stop(8)
    this.emit()
    setTimeout(() => this.stop(), 9000)
  }

  stop() {
    this.state.running = false
    cancelAnimationFrame(this.raf)
    this.current?.stop(2)
    setTimeout(() => { void this.ctx?.close() }, 2500)
    this.emit()
  }
}
