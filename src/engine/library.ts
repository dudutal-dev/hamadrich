import { type Album, type Asset, type Phase, type TextItem, db, uid } from '../db'
import { defaultAlbumPhaseMap } from './plan'
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
  const phaseMap = defaultAlbumPhaseMap(sorted.length)
  let total = 0
  let i = 1
  for (const f of sorted) {
    onProgress?.(`מייבא ${i}/${sorted.length}…`)
    const dur = await measureDuration(f)
    total += dur
    await db.assets.add({ id: uid(), kind: 'music', name: cleanName(f.name), blob: f, mime: f.type || 'audio/mpeg', durationSec: dur, phases: [phaseMap[i]], gainDb: 0, albumId, trackNo: i, createdAt: new Date().toISOString() })
    i++
  }
  const album: Album = { id: albumId, name, trackCount: sorted.length, totalSec: total, phaseMap, createdAt: new Date().toISOString() }
  await db.albums.add(album)
  return album
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

/** ElevenLabs TTS: produce a voice asset for a text and attach it */
export async function synthesizeVoice(text: TextItem, apiKey: string, voiceId: string): Promise<Asset> {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: text.body, model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.75, similarity_boost: 0.8, style: 0.15, speed: 0.85 } }),
  })
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`)
  const blob = await res.blob()
  const asset: Asset = { id: uid(), kind: 'voice', name: text.title, blob, mime: 'audio/mpeg', durationSec: await measureDuration(blob), phases: text.phases, gainDb: 0, createdAt: new Date().toISOString() }
  await db.assets.add(asset)
  if (text.voiceAssetId) await db.assets.delete(text.voiceAssetId).catch(() => {})
  await db.texts.update(text.id, { voiceAssetId: asset.id, estSec: asset.durationSec || text.estSec })
  return asset
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

export async function saveVoiceRecording(text: TextItem, blob: Blob) {
  const asset: Asset = { id: uid(), kind: 'voice', name: text.title, blob, mime: blob.type, durationSec: await measureDuration(blob), phases: text.phases, gainDb: 0, createdAt: new Date().toISOString() }
  await db.assets.add(asset)
  await db.texts.update(text.id, { voiceAssetId: asset.id, estSec: asset.durationSec || text.estSec })
  return asset
}
