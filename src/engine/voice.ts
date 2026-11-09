import type { BreathPattern, Mode, Phase } from '../db'
import clipsJson from './voice-clips.json'
import bodyJson from './body-clips.json'

/** Built-in Hebrew narration, produced once with ElevenLabs (voice "המדריך — קול רך", eleven_v3) and shipped in public/voice. */
export type VoiceGroup = 'open' | 'intent' | 'intro' | 'release' | 'peak' | 'return' | 'close' | 'emergency' | 'body'
export interface VoiceClip { id: string; group: VoiceGroup; title: string; text: string; dur: number; textF?: string; durF?: number; journey?: string; role?: string; only?: 'm' | 'f'; mode?: Mode; intention?: string; phase?: Phase; pattern?: BreathPattern }
export type Address = 'm' | 'f'

export const VOICE_CLIPS = clipsJson as VoiceClip[]
/** body & sexuality journeys narration (same voice, m/f) */
export const BODY_CLIPS = bodyJson as VoiceClip[]
const byId = new Map([...VOICE_CLIPS, ...BODY_CLIPS].map((c) => [c.id, c]))
export const voiceClip = (id: string) => byId.get(id)
/** feminine-address version exists only where the wording differs; neutral clips are shared */
const isF = (id: string, a: Address) => a === 'f' && !!byId.get(id)?.textF
export const voiceUrl = (id: string, a: Address = 'm') => `${import.meta.env.BASE_URL}voice/${id}${isF(id, a) ? '.f' : ''}.mp3`
export const clipText = (c: VoiceClip, a: Address) => (a === 'f' && c.textF ? c.textF : c.text)
export const clipDur = (id: string, a: Address = 'm') => { const c = byId.get(id); return (isF(id, a) ? c?.durF : c?.dur) || 20 }

export const VOICE_GROUP_NAMES: Record<VoiceGroup, string> = {
  open: 'פתיחה', intent: 'כוונה', intro: 'הסבר נשימה', release: 'שחרור', peak: 'שיא', return: 'חזרה', close: 'סיום', emergency: 'חירום', body: 'גוף ומיניות',
}
