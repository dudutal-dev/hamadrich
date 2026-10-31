import { useEffect, useState } from 'react'
import { type Album, type Mode, db } from '../db'
import { INTENTIONS, MODE_META } from '../engine/plan'

export interface StartChoice { mode: Mode; minutes: number; intention: string; voice: boolean; breath: boolean; albumId?: string }

export function StartScreen({ onStart }: { onStart: (c: StartChoice) => void }) {
  const [mode, setMode] = useState<Mode>('breath')
  const [minutes, setMinutes] = useState(MODE_META.breath.defaultMin)
  const [intention, setIntention] = useState('שקט')
  const [custom, setCustom] = useState('')
  const [voice, setVoice] = useState(true)
  const [breath, setBreath] = useState(true)
  const [album, setAlbum] = useState<Album | null>(null)
  const [adv, setAdv] = useState(false)

  useEffect(() => { void db.albums.toCollection().first().then((a) => setAlbum(a ?? null)) }, [])

  const meta = MODE_META[mode]
  const maxMin = mode === 'album' && album ? Math.round(album.totalSec / 60) : meta.maxMin
  const pick = (m: Mode) => { setMode(m); setMinutes(m === 'album' && album ? Math.round(album.totalSec / 60) : MODE_META[m].defaultMin) }
  const modes: Mode[] = ['breath', 'meditation', 'deep', 'sleep', ...(album ? (['album'] as Mode[]) : [])]

  return (
    <div className="fade-in flex flex-col gap-7 px-5 pt-10 pb-28">
      <header>
        <h1 className="text-[28px] font-light tracking-wide">המדריך</h1>
        <p className="opacity-60 text-[15px] mt-1">מה הכיוון הערב?</p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        {modes.map((m) => {
          const active = mode === m
          return (
            <button key={m} onClick={() => pick(m)} onContextMenu={(e) => { e.preventDefault(); setAdv(true) }}
              className={`text-right rounded-2xl p-4 border transition-all duration-700 ${active ? 'border-ink/60 bg-ink/8' : 'border-ink/12 bg-transparent'} ${m === 'album' ? 'col-span-2' : ''}`}>
              <div className="text-[17px]">{MODE_META[m].name}</div>
              <div className="text-[13px] opacity-55 mt-1 leading-snug">{m === 'album' && album ? `${album.trackCount} רצועות · ${Math.round(album.totalSec / 60)} דק'` : MODE_META[m].sub}</div>
            </button>
          )
        })}
      </div>

      <section>
        <div className="flex justify-between text-[13px] opacity-60 mb-2"><span>משך</span><span>{minutes} דק'</span></div>
        <input type="range" min={meta.minMin} max={maxMin} step={5} value={minutes} onChange={(e) => setMinutes(+e.target.value)} className="w-full" />
      </section>

      <section>
        <div className="text-[13px] opacity-60 mb-2">כוונה</div>
        <div className="flex flex-wrap gap-2">
          {INTENTIONS.map((i) => (
            <button key={i} onClick={() => { setIntention(i); setCustom('') }}
              className={`px-4 py-2 rounded-full text-[15px] border transition-all duration-500 ${intention === i && !custom ? 'border-ink/70 bg-ink/10' : 'border-ink/12 opacity-70'}`}>{i}</button>
          ))}
        </div>
        <input value={custom} onChange={(e) => { setCustom(e.target.value); if (e.target.value) setIntention(e.target.value) }} placeholder="או במילים שלך…"
          className="mt-3 w-full bg-transparent border-b border-ink/15 py-2 text-[15px] outline-none placeholder:opacity-40" />
      </section>

      <button onClick={() => setAdv((v) => !v)} className="text-[13px] opacity-50 text-right">{adv ? 'פחות' : 'הגדרות מתקדמות'}</button>
      {adv && (
        <section className="flex flex-col gap-3 text-[15px] -mt-4">
          {mode !== 'album' && <label className="flex items-center justify-between"><span>קריינות</span><input type="checkbox" checked={voice} onChange={(e) => setVoice(e.target.checked)} /></label>}
          <label className="flex items-center justify-between"><span>הנחיית נשימה</span><input type="checkbox" checked={breath} onChange={(e) => setBreath(e.target.checked)} /></label>
        </section>
      )}

      <button onClick={() => onStart({ mode, minutes, intention, voice: mode !== 'album' && voice, breath, albumId: mode === 'album' ? album?.id : undefined })}
        className="fixed bottom-20 right-5 left-5 rounded-2xl py-4 text-[17px] bg-ink text-bg font-normal active:scale-[0.98] transition-transform">
        התחל
      </button>
    </div>
  )
}
