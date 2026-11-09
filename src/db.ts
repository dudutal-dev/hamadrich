import Dexie, { type Table } from 'dexie'

export type Mode = 'breath' | 'meditation' | 'deep' | 'sleep' | 'album' | 'body'
export type Phase = 1 | 2 | 3 | 4 | 5
export type Layer = 'music' | 'voice' | 'breath' | 'visual'
export type AssetKind = 'voice' | 'music' | 'recording'
export type BreathPattern = 'none' | '478' | 'coherent' | 'box' | 'wave' | 'fire'

export interface TextItem {
  id: string
  title: string
  body: string
  source: string
  phases: Phase[]
  intentions: string[]
  estSec: number
  voiceAssetId?: string
  createdAt: string
}

export interface Asset {
  id: string
  kind: AssetKind
  name: string
  blob: Blob
  mime: string
  durationSec: number
  phases: Phase[]
  gainDb: number
  albumId?: string
  trackNo?: number
  /** imported albums: instrumental windows [start,end] s (no narration) where breath guidance may run */
  breathWindows?: [number, number][]
  createdAt: string
}

export interface Album {
  id: string
  name: string
  trackCount: number
  totalSec: number
  /** phase for each trackNo (1-based index -> phase) */
  phaseMap: Record<number, Phase>
  createdAt: string
}

export interface PhaseSpan { n: Phase; startSec: number; endSec: number }

export interface Cue {
  t: number
  layer: Layer
  action: 'play' | 'stop' | 'pattern' | 'phase' | 'label'
  asset?: string
  /** built-in narration clip id (public/voice) */
  clip?: string
  /** built-in music loop id (public/music) */
  track?: string
  pattern?: BreathPattern
  phase?: Phase
  duck?: number
  /** on-screen instruction (couple evenings: whose turn it is) */
  label?: string
}

export interface SessionPlan {
  id: string
  mode: Mode
  intention: string
  durationSec: number
  phases: PhaseSpan[]
  cues: Cue[]
  albumId?: string
  /** narration version used by this session */
  address?: 'm' | 'f'
  /** body & sexuality journey id (mode 'body') */
  journey?: string
  createdAt: string
}

export interface JournalEntry {
  id: string
  sessionPlanId: string
  mode: Mode
  intention: string
  startedAt: string
  actualSec: number
  completed: boolean
  moodBefore?: number
  moodAfter?: number
  tags: string[]
  recordingAssetId?: string
  transcript: string
  note: string
}

export interface Settings {
  id: 'main'
  musicGain: number
  voiceGain: number
  breathGain: number
  haptics: boolean
  output: 'speakers' | 'headphones'
  binaural: boolean
  emergencyName?: string
  emergencyPhone?: string
  /** listener address for narration + UI: masculine / feminine */
  address?: 'm' | 'f'
}

export class HamadrichDB extends Dexie {
  texts!: Table<TextItem, string>
  assets!: Table<Asset, string>
  albums!: Table<Album, string>
  plans!: Table<SessionPlan, string>
  journal!: Table<JournalEntry, string>
  settings!: Table<Settings, string>

  constructor() {
    super('hamadrich')
    this.version(1).stores({
      texts: 'id, title, createdAt',
      assets: 'id, kind, albumId, trackNo, createdAt',
      albums: 'id, name',
      plans: 'id, createdAt',
      journal: 'id, startedAt, sessionPlanId',
      settings: 'id',
    })
  }
}

export const db = new HamadrichDB()

export const uid = () =>
  (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36))

export const DEFAULT_SETTINGS: Settings = {
  id: 'main',
  musicGain: 0.8,
  voiceGain: 1,
  breathGain: 0.8,
  haptics: true,
  output: 'speakers',
  binaural: true,
}

export async function getSettings(): Promise<Settings> {
  const s = await db.settings.get('main')
  if (s) return { ...DEFAULT_SETTINGS, ...s }
  await db.settings.put(DEFAULT_SETTINGS)
  return DEFAULT_SETTINGS
}
