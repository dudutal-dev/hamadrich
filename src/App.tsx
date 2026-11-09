import { useEffect, useState } from 'react'
import { type JournalEntry, type SessionPlan, type Settings, db, getSettings, uid } from './db'
import { SessionEngine } from './engine/audio'
import { buildPlan } from './engine/plan'
import { IntegrationScreen } from './ui/IntegrationScreen'
import { JournalScreen } from './ui/JournalScreen'
import { JourneyScreen } from './ui/JourneyScreen'
import { LibraryScreen } from './ui/LibraryScreen'
import { PrepareScreen } from './ui/PrepareScreen'
import { StartScreen, type StartChoice } from './ui/StartScreen'
import { AlbumScreen } from './ui/AlbumScreen'
import { NavIcon } from './ui/NavIcon'
import { takeJustUpdated } from './version'
import { getAddress } from './address'

// read once per page load: set right before an auto-update reload
const justUpdated = takeJustUpdated()

type Tab = 'journey' | 'album' | 'journal' | 'library'
type Stage = 'start' | 'prepare' | 'journey' | 'integration'

export default function App() {
  const [tab, setTab] = useState<Tab>('journey')
  const [stage, setStage] = useState<Stage>('start')
  const [choice, setChoice] = useState<StartChoice | null>(null)
  const [plan, setPlan] = useState<SessionPlan | null>(null)
  const [engine, setEngine] = useState<SessionEngine | null>(null)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [draft, setDraft] = useState<JournalEntry | null>(null)
  const [loading, setLoading] = useState(false)
  const [startedAt, setStartedAt] = useState('')
  const [updatedTo, setUpdatedTo] = useState(justUpdated)
  useEffect(() => { if (!updatedTo) return; const id = setTimeout(() => setUpdatedTo(null), 4500); return () => clearTimeout(id) }, [updatedTo])

  useEffect(() => { void getSettings().then(setSettings) }, [])
  useEffect(() => {
    document.body.dataset.journey = stage === 'journey' ? '1' : '0'
    if (stage !== 'journey') window.dispatchEvent(new Event('hamadrich:idle'))
  }, [stage])

  const onStart = async (c: StartChoice) => {
    setChoice(c)
    const music = (await db.assets.where('kind').equals('music').toArray()).filter((a) => !a.albumId)
    const album = c.albumId ? await db.albums.get(c.albumId) : undefined
    const albumTracks = c.albumId ? await db.assets.where('albumId').equals(c.albumId).toArray() : undefined
    const p = buildPlan({ address: getAddress(), mode: c.mode, durationSec: c.minutes * 60, intention: c.intention, musicAssets: music, album, albumTracks, voiceEnabled: c.voice, breathEnabled: c.breath, startTrackNo: c.startTrackNo, onlyPhases: c.onlyPhases })
    await db.plans.put(p)
    setPlan(p)
    setStage('prepare')
  }

  const onBegin = async () => {
    if (!plan) return
    setLoading(true)
    const s = await getSettings(); setSettings(s)
    const e = new SessionEngine(plan)
    await e.init({ haptics: s.haptics, gains: { music: s.musicGain, voice: s.voiceGain, breath: s.breathGain }, output: s.output, binaural: s.binaural })
    e.start()
    setEngine(e); setStartedAt(new Date().toISOString())
    setLoading(false); setStage('journey')
  }

  const onEnd = (actualSec: number, completed: boolean) => {
    if (!plan || !choice) return
    const mb = sessionStorage.getItem('moodBefore')
    setDraft({ id: uid(), sessionPlanId: plan.id, mode: plan.mode, intention: choice.intention, startedAt, actualSec, completed, moodBefore: mb ? +mb : undefined, tags: [], transcript: '', note: '' })
    setEngine(null)
    setStage('integration')
  }

  const reset = () => { setStage('start'); setPlan(null); setChoice(null); setDraft(null); setTab('journal') }

  if (stage === 'prepare' && choice) return <PrepareScreen mode={choice.mode} loading={loading} onBegin={onBegin} onCancel={() => setStage('start')} />
  if (stage === 'journey' && engine && settings) return <JourneyScreen engine={engine} settings={settings} onEnd={onEnd} />
  if (stage === 'integration' && draft) return <IntegrationScreen draft={draft} onDone={reset} />

  return (
    <div className="h-full overflow-y-auto relative isolate">
      <div className="app-bg"><i /></div>
      <div className="relative z-10">
        {tab === 'journey' && <StartScreen onStart={onStart} />}
        {tab === 'album' && <AlbumScreen onStart={onStart} />}
        {tab === 'journal' && <JournalScreen />}
        {tab === 'library' && <LibraryScreen />}
      </div>
      {updatedTo && (
        <div className="fade-in fixed z-30 top-[calc(env(safe-area-inset-top)+12px)] right-4 left-4 flex justify-center pointer-events-none">
          <div className="sheet rounded-full px-5 py-2.5 text-[15px] font-medium flex items-center gap-2 shadow-[0_10px_30px_-12px_rgba(242,194,107,0.7)]">
            <span className="w-2 h-2 rounded-full" style={{ background: 'var(--grad)' }} />האפליקציה עודכנה · גרסה {updatedTo}
          </div>
        </div>
      )}
      <nav className="fixed z-20 bottom-0 right-0 left-0 flex justify-around items-center pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]" style={{ background: 'rgba(12,10,23,0.82)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderTop: '1px solid rgba(246,242,234,0.08)' }}>
        {([['journey', 'מסע'], ['album', 'אלבומים'], ['journal', 'יומן'], ['library', 'ספרייה']] as [Tab, string][]).map(([k, l]) => {
          const on = tab === k
          return (
            <button key={k} onClick={() => setTab(k)} className="flex flex-col items-center gap-1 px-3 py-1 transition-all duration-300" style={{ opacity: on ? 1 : 0.72 }}>
              <span className="w-14 h-9 rounded-full flex items-center justify-center transition-all duration-300" style={{ background: on ? 'var(--grad)' : 'transparent', boxShadow: on ? '0 6px 20px -8px rgba(242,194,107,0.8)' : 'none' }}>
                <NavIcon name={k} active={on} />
              </span>
              <span className="text-[12.5px]" style={{ fontWeight: on ? 600 : 500 }}>{l}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
