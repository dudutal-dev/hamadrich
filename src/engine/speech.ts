/** Speech detection for imported albums: finds instrumental windows (no narration) where breath guidance may run.
 *
 *  Speech has a characteristic syllabic rhythm: the energy of the voice band (≈300–3400 Hz) is modulated at
 *  roughly 3–8 Hz. Ambient music, drones and breaths are modulated much more slowly (or not at all).
 *  We band-pass the track offline, take a 100 Hz energy envelope, and in sliding 2 s windows measure how much of
 *  the envelope's modulation power sits in 3–8 Hz. High ratio + enough energy ⇒ speech.
 *  Biased towards "speech": a missed instrumental window only means less breath guidance, while a missed
 *  speech window would put breath sounds over the narration. */

const SR = 8000
const FRAME = 80 // samples → 100 Hz envelope
const WIN = 200 // frames = 2 s
const HOP = 50 // frames = 0.5 s

export interface SpeechAnalysis { windows: [number, number][]; speechRatio: number; scores?: number[] }

export async function analyzeSpeech(blob: Blob, minWindow = 11, debug = false): Promise<SpeechAnalysis> {
  const decodeCtx = new OfflineAudioContext(1, SR, SR)
  const src = await decodeCtx.decodeAudioData(await blob.arrayBuffer())
  const dur = src.duration
  const off = new OfflineAudioContext(1, Math.ceil(dur * SR), SR)
  const s = off.createBufferSource(); s.buffer = src
  const hp = off.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 300
  const lp = off.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3400
  s.connect(hp); hp.connect(lp); lp.connect(off.destination); s.start()
  const x = (await off.startRendering()).getChannelData(0)

  // energy envelope (dB-ish, log compresses loudness differences between tracks)
  const nF = Math.floor(x.length / FRAME)
  const env = new Float32Array(nF)
  let peak = 1e-9
  for (let f = 0; f < nF; f++) {
    let e = 0
    for (let i = f * FRAME; i < (f + 1) * FRAME; i++) e += x[i] * x[i]
    env[f] = e / FRAME; if (env[f] > peak) peak = env[f]
  }
  const floor = peak * 1e-4 // −40 dB below the loudest frame = silence

  // modulation spectrum per window: DFT bins of 0.5 Hz up to 20 Hz
  const nW = Math.max(0, Math.floor((nF - WIN) / HOP) + 1)
  const speech = new Uint8Array(nW)
  const scores: number[] = []
  const cosT: Float32Array[] = [], sinT: Float32Array[] = []
  for (let k = 1; k <= 40; k++) {
    const c = new Float32Array(WIN), sn = new Float32Array(WIN)
    for (let n = 0; n < WIN; n++) { c[n] = Math.cos((2 * Math.PI * k * n) / WIN); sn[n] = Math.sin((2 * Math.PI * k * n) / WIN) }
    cosT.push(c); sinT.push(sn)
  }
  const seg = new Float32Array(WIN)
  for (let w = 0; w < nW; w++) {
    const o = w * HOP
    let mean = 0, energy = 0
    for (let n = 0; n < WIN; n++) { const v = Math.log10(env[o + n] + floor); seg[n] = v; mean += v; energy += env[o + n] }
    mean /= WIN
    if (energy / WIN < floor * 10) { scores.push(-1); continue } // quiet → not speech
    for (let n = 0; n < WIN; n++) seg[n] = (seg[n] - mean) * (0.5 - 0.5 * Math.cos((2 * Math.PI * n) / WIN)) // Hann
    // depth: std of the log-energy envelope (×10 → dB); band: modulation power 2–8 Hz; peak: how tonal that band is
    let varSum = 0
    for (let n = 0; n < WIN; n++) varSum += seg[n] * seg[n]
    const depthDb = 10 * Math.sqrt(varSum / (WIN * 0.375)) // Hann power correction
    let band = 0, bandMax = 0, total = 0
    for (let k = 1; k <= 40; k++) {
      let re = 0, im = 0
      const c = cosT[k - 1], sn = sinT[k - 1]
      for (let n = 0; n < WIN; n++) { re += seg[n] * c[n]; im += seg[n] * sn[n] }
      const p = re * re + im * im
      total += p
      if (k >= 4 && k <= 16) { band += p; if (p > bandMax) bandMax = p } // 2–8 Hz
    }
    const ratio = total > 0 ? band / total : 0, peaky = band > 0 ? bandMax / band : 1
    scores.push(depthDb * 100 + Math.round(ratio * 99) + (peaky > 0.5 ? 0.5 : 0))
    speech[w] = depthDb > 3.5 ? 1 : 0
  }

  // dilate speech 2.5 s each side (soft last words, breaths before the next sentence)
  const hopSec = HOP / 100, winSec = WIN / 100
  const isSpeechAt = new Uint8Array(Math.ceil(dur / hopSec) + 1)
  for (let w = 0; w < nW; w++) if (speech[w]) {
    const a = Math.max(0, Math.floor((w * hopSec - 2.5) / hopSec)), b = Math.min(isSpeechAt.length - 1, Math.ceil((w * hopSec + winSec + 2.5) / hopSec))
    for (let i = a; i <= b; i++) isSpeechAt[i] = 1
  }
  const windows: [number, number][] = []
  let start = -1, speechCount = 0
  for (let i = 0; i < isSpeechAt.length; i++) {
    if (isSpeechAt[i]) speechCount++
    if (!isSpeechAt[i] && start < 0) start = i
    if ((isSpeechAt[i] || i === isSpeechAt.length - 1) && start >= 0) {
      const a = start * hopSec, b = Math.min(dur, (isSpeechAt[i] ? i : i + 1) * hopSec)
      if (b - a >= minWindow) windows.push([Math.round(a * 10) / 10, Math.round(b * 10) / 10])
      start = -1
    }
  }
  return { windows, speechRatio: speechCount / isSpeechAt.length, ...(debug ? { scores } : {}) }
}
