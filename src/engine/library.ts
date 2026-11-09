import { type Album, type Asset, type Phase, db, uid } from '../db'
import { defaultAlbumPhaseMap, isPsychedelicPrayers } from './plan'
import { analyzeSpeech } from './speech'
import JSZip from 'jszip'

/** Measure audio duration via a media element (metadata only, no full decode) */
export function measureDuration(blob: Blob): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob)
    const el = new Audio()
    el.preload = 'metadata'
    const done = (v: number) => { URL.revokeObjectURL(url); el.src = ''; resolve(v) }
    el.onloadedmetadata = () => done(isFinite(el.duration) ? Math.round(el.duration) : 0)
    el.onerror = () => done(0)
    setTimeout(() => done(0), 8000)
    el.src = url
  })
}

/** Import loose music files (or ZIPs of them), tagged to the given phases */
export async function importMusic(files: File[], phases: Phase[]): Promise<Asset[]> {
  const out: Asset[] = []
  for (const f of await expandZips(files)) {
    const a: Asset = { id: uid(), kind: 'music', name: f.name.replace(/\.[^.]+$/, ''), blob: f, mime: f.type || 'audio/mpeg', durationSec: await measureDuration(f), phases, gainDb: 0, createdAt: new Date().toISOString() }
    await db.assets.add(a)
    out.push(a)
  }
  return out
}

/** Expand ZIP files into their audio entries; pass other files through */
export async function expandZips(files: File[], onProgress?: (msg: string) => void): Promise<File[]> {
  const out: File[] = []
  for (const f of files) {
    const isZip = /\.zip$/i.test(f.name) || f.type === 'application/zip' || f.type === 'application/x-zip-compressed'
    if (!isZip) { out.push(f); continue }
    onProgress?.('פותח ZIP…')
    const zip = await JSZip.loadAsync(f)
    const entries = Object.values(zip.files).filter((e) => !e.dir && /\.(mp3|m4a|aac|wav|ogg|flac|aif|aiff)$/i.test(e.name) && !e.name.includes('__MACOSX'))
    let i = 0
    for (const e of entries) {
      onProgress?.(`מחלץ ${++i}/${entries.length}…`)
      const blob = await e.async('blob')
      const name = e.name.split('/').pop() ?? e.name
      const mime = /\.mp3$/i.test(name) ? 'audio/mpeg' : /\.(m4a|aac)$/i.test(name) ? 'audio/mp4' : /\.wav$/i.test(name) ? 'audio/wav' : /\.ogg$/i.test(name) ? 'audio/ogg' : 'audio/*'
      out.push(new File([blob], name, { type: mime }))
    }
  }
  return out
}

/** Import a whole album: files sorted by leading track number in filename, phases from default map */
export async function importAlbum(files: File[], name: string, onProgress?: (msg: string) => void): Promise<Album> {
  const expanded = await expandZips(files, onProgress)
  const sorted = [...expanded].sort((a, b) => trackNoOf(a.name) - trackNoOf(b.name) || a.name.localeCompare(b.name))
  const albumId = uid()
  const durs: number[] = []
  for (const [k, f] of sorted.entries()) { onProgress?.(`קורא ${k + 1}/${sorted.length}…`); durs.push(await measureDuration(f)) }
  const phaseMap = defaultAlbumPhaseMap(sorted.length, durs)
  let total = 0
  let i = 1
  for (const f of sorted) {
    onProgress?.(`מייבא ${i}/${sorted.length}…`)
    const dur = durs[i - 1]
    total += dur
    await db.assets.add({ id: uid(), kind: 'music', name: cleanName(f.name), blob: f, mime: f.type || 'audio/mpeg', durationSec: dur, phases: [phaseMap[i]], gainDb: 0, albumId, trackNo: i, createdAt: new Date().toISOString() })
    i++
  }
  const album: Album = { id: albumId, name, trackCount: sorted.length, totalSec: total, phaseMap, createdAt: new Date().toISOString() }
  await db.albums.add(album)
  // Psychedelic Prayers ships with a hand-made breath map; any other album gets automatic speech detection
  if (!isPsychedelicPrayers(album)) await analyzeAlbumBreath(album.id, onProgress)
  return album
}

/** detect narration in every track of an album and store the instrumental windows used for breath guidance */
export async function analyzeAlbumBreath(albumId: string, onProgress?: (msg: string) => void) {
  const tracks = (await db.assets.where('albumId').equals(albumId).toArray()).sort((a, b) => (a.trackNo ?? 0) - (b.trackNo ?? 0))
  for (const [k, t] of tracks.entries()) {
    onProgress?.(`מזהה קטעי דיבור ${k + 1}/${tracks.length}…`)
    try { await db.assets.update(t.id, { breathWindows: (await analyzeSpeech(t.blob)).windows }) } catch { await db.assets.update(t.id, { breathWindows: [] }) }
  }
}

function trackNoOf(name: string): number {
  const m = name.match(/(?:^|[\s_-])(\d{1,3})(?=[\s_.-])/)
  return m ? parseInt(m[1], 10) : 999
}
function cleanName(name: string) {
  return name.replace(/\.[^.]+$/, '').replace(/^.*?-\s*\d{1,3}\s*[-.]?\s*/, '').replace(/^\d{1,3}\s*[-.]?\s*/, '').trim()
}

export async function deleteAlbum(id: string) {
  await db.assets.where('albumId').equals(id).delete()
  await db.albums.delete(id)
}

/** Record own voice via MediaRecorder; returns a stop() that resolves to the asset */
export async function startRecording(): Promise<{ stop: () => Promise<Blob> }> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : ''
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
  const chunks: BlobPart[] = []
  rec.ondataavailable = (e) => chunks.push(e.data)
  rec.start()
  return {
    stop: () => new Promise<Blob>((resolve) => {
      rec.onstop = () => { stream.getTracks().forEach((t) => t.stop()); resolve(new Blob(chunks, { type: rec.mimeType || 'audio/webm' })) }
      rec.stop()
    }),
  }
}
