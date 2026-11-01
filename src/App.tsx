import { useEffect, useState } from 'react'
import { type JournalEntry, type SessionPlan, type Settings, db, getSettings, uid } from './db'
import { SessionEngine } from './engine/audio'
import { buildPlan } from './engine/plan'
import { ensureSeed } from './engine/seed'
import { IntegrationScreen } from './ui/IntegrationScreen'
import { JournalScreen } from './ui/JournalScreen'
import { JourneyScreen } from './ui/JourneyScreen'
import { LibraryScreen } from './ui/LibraryScreen'
import { PrepareScreen } from './ui/PrepareScreen'
import { StartScreen, type StartChoice } from './ui/StartScreen'
import { AlbumScreen } from './ui/AlbumScreen'
import { Cosmos } from './ui/Cosmos'
import { NavIcon } from './ui/NavIcon'

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

  useEffect(() => { void ensureSeed(); void getSettings().then(setSettings) }, [])
  useEffect(() => {
    document.body.dataset.journey = stage === 'journey' ? '1' : '0'
    if (stage !== 'journey') window.dispatchEvent(new Event('hamadrich:idle'))
  }, [stage])

  const onStart = async (c: StartChoice) => {
    setChoice(c)
    const texts = await db.texts.toArray()
    const music = (await db.assets.where('kind').equals('music').toArray()).filter((a) => !a.albumId)
    const album = c.albumId ? await db.albums.get(c.albumId) : undefined
    const albumTracks = c.albumId ? await db.assets.where('albumId').equals(c.albumId).toArray() : undefined
    const p = buildPlan({ mode: c.mode, durationSec: c.minutes * 60, intention: c.intention, texts, musicAssets: music, album, albumTracks, voiceEnabled: c.voice, breathEnabled: c.breath, startTrackNo: c.startTrackNo, onlyPhases: c.onlyPhases })
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
    <div className="h-full overflow-y-auto relative" style={{ background: '#070510' }}>
      <Cosmos ambient color="#7B2FD6" color2="#FF5FC8" intensity={0.4} phase={3} paused={false} />
      <div className="relative z-10">
        {tab === 'journey' && <StartScreen onStart={onStart} />}
        {tab === 'album' && <AlbumScreen onStart={onStart} />}
        {tab === 'journal' && <JournalScreen />}
        {tab === 'library' && <LibraryScreen />}
      </div>
      <nav className="fixed z-20 bottom-0 right-0 left-0 flex justify-around items-end pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] text-[11px]" style={{ background: 'linear-gradient(180deg, rgba(14,11,24,0.0), rgba(14,11,24,0.85) 30%)', backdropFilter: 'blur(18px)', borderTop: '1px solid rgba(242,238,230,0.08)' }}>
        {([['journey', 'מסע'], ['album', 'האלבום'], ['journal', 'יומן'], ['library', 'ספרייה']] as [Tab, string][]).map(([k, l]) => {
          const on = tab === k
          return (
            <button key={k} onClick={() => setTab(k)} className="flex flex-col items-center gap-1 px-3 py-1 transition-all duration-500" style={{ opacity: on ? 1 : 0.55 }}>
              <span className="w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-500" style={{ background: on ? 'linear-gradient(135deg, #FF5FC8, #7B2FD6)' : 'rgba(255,255,255,0.05)', boxShadow: on ? '0 0 24px -4px #FF5FC8' : 'none' }}>
                <NavIcon name={k} active={on} />
              </span>
              <span style={{ color: on ? '#FF9FE0' : undefined }}>{l}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
