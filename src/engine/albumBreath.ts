/** Auto-generated from audio analysis of Psychedelic Prayers (55 tracks).
 *  For each track: instrumental windows [start,end] in seconds where no narration is present.
 *  Breath guidance runs only inside these windows. Keyed by track number. */
export const ALBUM_BREATH_MAP: Record<number, { dur: number; inst: [number, number][] }> = {
  1: { dur: 124.4, inst: [[0.0, 13.9], [27.0, 48.3], [112.9, 124.4]] },
  2: { dur: 58.4, inst: [[44.5, 58.4]] },
  3: { dur: 125.2, inst: [[110.7, 125.2]] },
  4: { dur: 118.3, inst: [[0.0, 14.2], [103.8, 118.3]] },
  5: { dur: 125.6, inst: [[0.0, 14.2], [111.0, 125.6]] },
  6: { dur: 164.0, inst: [[0.0, 14.3], [62.3, 74.1], [149.4, 164.0]] },
  7: { dur: 78.1, inst: [[0.0, 12.9], [66.6, 78.1]] },
  8: { dur: 96.7, inst: [[84.4, 96.7]] },
  9: { dur: 195.3, inst: [[184.0, 195.3]] },
  10: { dur: 68.2, inst: [] },
  11: { dur: 67.5, inst: [[52.8, 67.5]] },
  12: { dur: 85.6, inst: [[0.0, 11.6]] },
  13: { dur: 75.9, inst: [[0.0, 11.8]] },
  14: { dur: 77.8, inst: [] },
  15: { dur: 61.8, inst: [[46.9, 61.8]] },
  16: { dur: 67.4, inst: [[0.0, 12.5], [54.3, 67.4]] },
  17: { dur: 85.1, inst: [[0.0, 13.9], [71.8, 85.1]] },
  18: { dur: 65.7, inst: [] },
  19: { dur: 105.7, inst: [[91.4, 105.7]] },
  20: { dur: 104.8, inst: [[0.0, 14.3]] },
  21: { dur: 98.7, inst: [[0.0, 14.2], [84.0, 98.7]] },
  22: { dur: 192.9, inst: [] },
  23: { dur: 204.6, inst: [[188.0, 204.6]] },
  24: { dur: 131.2, inst: [[0.0, 14.3], [116.6, 131.2]] },
  25: { dur: 126.4, inst: [[0.0, 12.0]] },
  26: { dur: 85.6, inst: [[71.0, 85.6]] },
  27: { dur: 94.1, inst: [[0.0, 14.3], [79.6, 94.1]] },
  28: { dur: 185.8, inst: [[0.0, 19.9]] },
  29: { dur: 92.4, inst: [[0.0, 14.2]] },
  30: { dur: 79.8, inst: [] },
  31: { dur: 66.1, inst: [] },
  32: { dur: 53.4, inst: [[0.0, 14.2]] },
  33: { dur: 91.9, inst: [[0.0, 14.3]] },
  34: { dur: 147.7, inst: [[0.0, 14.2], [128.9, 147.7]] },
  35: { dur: 97.8, inst: [[0.0, 14.1], [84.3, 97.8]] },
  36: { dur: 133.4, inst: [[121.0, 133.4]] },
  37: { dur: 74.7, inst: [[60.2, 74.7]] },
  38: { dur: 87.8, inst: [[0.0, 11.3]] },
  39: { dur: 80.4, inst: [[0.0, 14.4]] },
  40: { dur: 117.7, inst: [[105.0, 117.7]] },
  41: { dur: 136.8, inst: [[121.3, 136.8]] },
  42: { dur: 73.4, inst: [[59.3, 73.4]] },
  43: { dur: 108.7, inst: [[0.0, 13.3], [94.8, 108.7]] },
  44: { dur: 74.7, inst: [[0.0, 14.3]] },
  45: { dur: 73.9, inst: [[62.6, 73.9]] },
  46: { dur: 82.5, inst: [[0.0, 13.3], [67.8, 82.5]] },
  47: { dur: 116.3, inst: [[0.0, 14.2], [101.7, 116.3]] },
  48: { dur: 110.3, inst: [[0.0, 14.2], [92.5, 110.3]] },
  49: { dur: 59.0, inst: [[0.0, 13.3], [45.0, 59.0]] },
  50: { dur: 74.1, inst: [[0.0, 12.9]] },
  51: { dur: 51.5, inst: [[0.0, 14.1], [40.5, 51.5]] },
  52: { dur: 46.4, inst: [[0.0, 11.3]] },
  53: { dur: 94.1, inst: [[0.0, 14.5]] },
  54: { dur: 94.1, inst: [[0.0, 14.5]] },
  55: { dur: 248.2, inst: [[0.0, 14.0], [207.2, 248.2]] },
}

/** matches a track to the map by its number; fingerprint by duration (±3s) so a re-import still matches */
export function breathWindowsFor(trackNo: number | undefined, durationSec: number): [number, number][] | null {
  if (!trackNo) return null
  const m = ALBUM_BREATH_MAP[trackNo]
  if (!m || Math.abs(m.dur - durationSec) > 3) return null
  return m.inst
}