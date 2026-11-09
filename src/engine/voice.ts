import type { BreathPattern, Mode, Phase } from '../db'
import clipsJson from './voice-clips.json'

/** Built-in Hebrew narration, produced once with ElevenLabs (voice "המדריך — קול רך", eleven_v3) and shipped in public/voice. */
export type VoiceGroup = 'open' | 'intent' | 'intro' | 'release' | 'peak' | 'return' | 'close' | 'emergency'
export interface VoiceClip { id: string; group: VoiceGroup; title: string; text: string; dur: number; mode?: Mode; intention?: string; phase?: Phase; pattern?: BreathPattern }

export const VOICE_CLIPS = clipsJson as VoiceClip[]
const byId = new Map(VOICE_CLIPS.map((c) => [c.id, c]))
export const voiceClip = (id: string) => byId.get(id)
export const voiceUrl = (id: string) => `${import.meta.env.BASE_URL}voice/${id}.mp3`

export const VOICE_GROUP_NAMES: Record<VoiceGroup, string> = {
  open: 'פתיחה', intent: 'כוונה', intro: 'הסבר נשימה', release: 'שחרור', peak: 'שיא', return: 'חזרה', close: 'סיום', emergency: 'חירום',
}
