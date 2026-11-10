import type { SessionPlan } from '../db'
import type { VisualPick } from './AlbumVisuals'

/** Solo body journeys, feminine address: the goddess of the album journey, one scene per narration beat
 *  (ElevenLabs · Veo 3.1). A scene starts when its narration clip starts and stays until the next one.
 *  [narration clip, scene, phase] – the phase is the fallback when narration is off. */
const SCENES: Record<string, [string, string, number][]> = {
  home: [['home-open', 'home-1', 1], ['home-r1', 'home-2', 2], ['home-r2', 'home-3', 2], ['home-p1', 'home-4', 3], ['home-ret', 'home-5', 4]],
  desire: [['desire-open', 'desire-1', 1], ['desire-r1', 'desire-2', 2], ['desire-r2', 'desire-3', 2], ['desire-p1', 'desire-4', 3], ['desire-ret', 'desire-5', 4]],
  shame: [['shame-open', 'shame-1', 1], ['shame-r1', 'shame-2', 2], ['shame-rf', 'shame-3', 2], ['shame-p1', 'shame-4', 3], ['shame-ret', 'shame-5', 4]],
  touch: [['touch-open', 'touch-1', 1], ['touch-r2', 'touch-2', 2], ['touch-r3', 'touch-3', 2], ['touch-rf', 'touch-4', 2], ['touch-ret', 'touch-5', 4]],
  fire: [['fire-open', 'fire-1', 1], ['fire-intro', 'fire-2', 2], ['fire-r1', 'fire-3', 2], ['fire-p1', 'fire-4', 3], ['fire-ret', 'fire-5', 4]],
  pleasure: [['pleasure-open', 'pleasure-1', 1], ['pleasure-r1', 'pleasure-2', 2], ['pleasure-rf', 'pleasure-3', 2], ['pleasure-p1', 'pleasure-4', 3], ['pleasure-ret', 'pleasure-5', 4]],
}
export const hasBodyVisuals = (plan: SessionPlan) => plan.mode === 'body' && plan.address === 'f' && !!plan.journey && !!SCENES[plan.journey]

/** the scene at plan time t (seconds) in phase `phase` */
export function pickBodyVisual(plan: SessionPlan, t: number, phase: number): VisualPick | null {
  if (!hasBodyVisuals(plan)) return null
  const list = SCENES[plan.journey!]
  let scene: string | null = null, at = -1
  for (const c of plan.cues) {
    if (c.t > t || c.t < at || c.layer !== 'voice' || !c.clip) continue
    const hit = list.find((x) => x[0] === c.clip)
    if (hit) { scene = hit[1]; at = c.t }
  }
  // narration off (or before the first beat): the last scene of the current phase or earlier
  if (!scene) scene = [...list].reverse().find((x) => x[2] <= phase)?.[1] ?? list[0][1]
  return { dir: 'body', clip: scene, key: scene, mirror: false, flash: false, zone: phase === 3 ? 2 : phase === 2 ? 4 : 1 }
}
