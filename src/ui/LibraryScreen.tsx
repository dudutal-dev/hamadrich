import { useEffect, useRef, useState } from 'react'
import { type Album, type Asset, type Phase, type Settings, db, getSettings } from '../db'
import { deleteAlbum, importAlbum, importMusic } from '../engine/library'
import { BODY_CLIPS, COUPLE_CLIPS, VOICE_CLIPS, VOICE_GROUP_NAMES, type VoiceClip, type VoiceGroup, clipText, voiceUrl } from '../engine/voice'
import { BODY_JOURNEYS, isAdultUnlocked, isCoupleUnlocked } from '../engine/body'
import { g, useAddress } from '../address'
import { AddressPicker } from './AddressPicker'
import { PHASE_NAMES } from '../engine/plan'
import { checkForUpdate, versionLabel } from '../version'

type Tab = 'voice' | 'music' | 'settings'

export function LibraryScreen() {
  const [tab, setTab] = useState<Tab>('voice')
  return (
    <div className="fade-in flex flex-col gap-5 px-5 pt-10 pb-28">
      <h1 className="text-[34px] title-psy">ספרייה</h1>
      <div className="flex gap-1 p-1 rounded-full chip text-[15px]">
        {(['voice', 'music', 'settings'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 rounded-full transition-all ${tab === t ? 'btn-psy' : 'opacity-85'}`}>{{ voice: 'קריינות', music: 'מוזיקה', settings: 'הגדרות' }[t]}</button>
        ))}
      </div>
      {tab === 'voice' && <Narration />}
      {tab === 'music' && <Music />}
      {tab === 'settings' && <SettingsPane />}
    </div>
  )
}

/* ---------- Narration (built-in, read-only) ---------- */
function Narration() {
  const a = useAddress()
  const [playing, setPlaying] = useState<string | null>(null)
  const audio = useRef<HTMLAudioElement | null>(null)
  useEffect(() => () => { audio.current?.pause() }, [])
  const toggle = (id: string) => {
    audio.current?.pause()
    if (playing === id) { setPlaying(null); return }
    const el = new Audio(voiceUrl(id, a)); el.onended = () => setPlaying(null)
    audio.current = el; void el.play().catch(() => setPlaying(null)); setPlaying(id)
  }
  const groups: { key: string; label: string; clips: VoiceClip[] }[] = (Object.keys(VOICE_GROUP_NAMES) as VoiceGroup[]).filter((g) => g !== 'body').map((g) => ({ key: g, label: VOICE_GROUP_NAMES[g], clips: VOICE_CLIPS.filter((c) => c.group === g) }))
  // body & sexuality journeys (level 2 only after the 18+ confirmation); clips for the other gender are hidden
  for (const j of BODY_JOURNEYS) {
    if (j.level === 3) { if (isCoupleUnlocked()) groups.push({ key: j.id, label: `ערב זוגי · ${j.title}`, clips: COUPLE_CLIPS.filter((c) => c.journey === j.id) }); continue }
    if (j.level === 1 || isAdultUnlocked()) groups.push({ key: j.id, label: `גוף ומיניות · ${j.title}`, clips: BODY_CLIPS.filter((c) => c.journey === j.id && (!c.only || c.only === a)) })
  }
  const total = Math.round(VOICE_CLIPS.reduce((t, c) => t + c.dur, 0) / 60)
  return (
    <div className="flex flex-col gap-5">
      <AddressPicker />
      <p className="text-[14px] muted leading-relaxed">{VOICE_CLIPS.length} קטעי קריינות בעברית · כ-{total} דקות · קול "המדריך". הם משולבים במסע לפי המצב, הכוונה והשלב, ועובדים גם בלי רשת.</p>
      {groups.map(({ key, label, clips }) => (
        <section key={key} className="flex flex-col gap-2">
          <div className="label">{label}</div>
          {clips.map((c) => (
            <div key={c.id} className="card rounded-2xl p-4 flex gap-3 items-start">
              <button onClick={() => toggle(c.id)} aria-label="האזן" className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-[14px] ${playing === c.id ? 'btn-psy' : 'btn-ghost'}`}>{playing === c.id ? '■' : '▶'}</button>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline gap-2"><div className="text-[16px] font-medium">{c.title}</div><div className="text-[13px] muted tabular-nums">{Math.round(a === 'f' && c.durF ? c.durF : c.dur)} שנ'</div></div>
                <p className={`text-[14px] muted leading-relaxed mt-1 ${playing === c.id ? '' : 'line-clamp-2'}`}>{clipText(c, a).replace(/([.,])\s*\.\.\./g, '$1').replace(/\.\.\./g, '…')}</p>
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}

/* ---------- Music ---------- */
function Music() {
  const addr = useAddress()
  const [albums, setAlbums] = useState<Album[]>([])
  const [loose, setLoose] = useState<Asset[]>([])
  const [busy, setBusy] = useState('')
  const [albumName, setAlbumName] = useState('')
  const albumInput = useRef<HTMLInputElement>(null)
  const looseInput = useRef<HTMLInputElement>(null)
  const [loosePhases, setLoosePhases] = useState<Phase[]>([3])

  const reload = () => Promise.all([db.albums.toArray(), db.assets.where('kind').equals('music').toArray()])
    .then(([al, music]) => { setAlbums(al); setLoose(music.filter((a) => !a.albumId)) })
  useEffect(() => { void reload() }, [])

  const onAlbum = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy('מתחיל…')
    try { await importAlbum([...files], albumName.trim() || files[0].name.replace(/\.[^.]+$/, ''), setBusy) } catch (e) { setBusy('שגיאה: ' + String(e)); return }
    setBusy(''); await reload()
  }
  const onLoose = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy('מייבא…'); await importMusic([...files], loosePhases); setBusy(''); await reload()
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="card rounded-2xl p-4 flex flex-col gap-3">
        <div className="text-[18px] font-semibold">אלבום כמסע</div>
        <p className="text-[14px] opacity-85 leading-relaxed">{g(addr, 'בחר', 'בחרי')} את קובץ ה-ZIP שהורדת מ-Bandcamp (או את כל ה-MP3 בבת אחת). הסדר נקבע לפי מספר הרצועה בשם הקובץ, והשלבים ממופים אוטומטית.</p>
        <input value={albumName} onChange={(e) => setAlbumName(e.target.value)} placeholder="שם האלבום" className="bg-transparent border-b border-ink/15 py-1 text-[15px] outline-none" />
        <input ref={albumInput} type="file" accept="audio/*,.zip,application/zip" multiple hidden onChange={(e) => onAlbum(e.target.files)} />
        <button onClick={() => albumInput.current?.click()} className="rounded-xl py-3 btn-ghost text-[15px]">{g(addr, 'בחר', 'בחרי')} ZIP או קבצים</button>
        {albums.map((a) => (
          <div key={a.id} className="flex justify-between items-center text-[15px] pt-2 border-t border-ink/10">
            <span>{a.name} · {a.trackCount} רצועות · {Math.round(a.totalSec / 60)} דק'</span>
            <button onClick={() => { if (confirm('למחוק את האלבום מהאפליקציה?')) void deleteAlbum(a.id).then(reload) }} className="text-[14px] opacity-80">מחק</button>
          </div>
        ))}
      </section>

      <section className="card rounded-2xl p-4 flex flex-col gap-3">
        <div className="text-[18px] font-semibold">רצועות אמביינט לשלבים</div>
        <p className="text-[14px] opacity-85 leading-relaxed">קבצים בודדים לשימוש במצבי נשימה/מדיטציה/מסע. בלי קבצים האפליקציה מנגנת דרון מובנה.</p>
        <div className="flex flex-wrap gap-2">
          {([1, 2, 3, 4, 5] as Phase[]).map((p) => <button key={p} onClick={() => setLoosePhases(loosePhases.includes(p) ? loosePhases.filter((x) => x !== p) : [...loosePhases, p].sort())} className={`px-3 py-1.5 rounded-full border text-[14px] ${loosePhases.includes(p) ? 'chip-on' : 'chip'}`}>{PHASE_NAMES[p]}</button>)}
        </div>
        <input ref={looseInput} type="file" accept="audio/*" multiple hidden onChange={(e) => onLoose(e.target.files)} />
        <button onClick={() => looseInput.current?.click()} className="rounded-xl py-3 btn-ghost text-[15px]">הוסף קבצים לשלבים שנבחרו</button>
        {loose.map((a) => (
          <div key={a.id} className="flex justify-between items-center text-[15px] pt-2 border-t border-ink/10">
            <span className="truncate ml-3">{a.name} <span className="opacity-80 text-[14px]">· {a.phases.map((p) => PHASE_NAMES[p]).join('/')} · {Math.round(a.durationSec / 60)} דק'</span></span>
            <button onClick={() => void db.assets.delete(a.id).then(reload)} className="text-[14px] opacity-80">מחק</button>
          </div>
        ))}
      </section>
      {busy && <div className="text-[14px] opacity-80">{busy}</div>}
    </div>
  )
}

/* ---------- Settings ---------- */
function GainSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex flex-col gap-1 text-[15px]"><span className="opacity-80">{label}</span><input type="range" min={0} max={1} step={0.05} value={value} onChange={(e) => onChange(+e.target.value)} /></label>
  )
}

function SettingsPane() {
  const [s, setS] = useState<Settings | null>(null)
  useEffect(() => { void getSettings().then(setS) }, [])
  if (!s) return null
  const save = (patch: Partial<Settings>) => { const n = { ...s, ...patch }; setS(n); void db.settings.put(n) }
  return (
    <div className="flex flex-col gap-6 text-[15px]">
      <section className="flex flex-col gap-3">
        <div className="text-[18px] font-semibold">פנייה</div>
        <AddressPicker />
        <p className="text-[14px] opacity-80">הקריינות והטקסטים באפליקציה פונים אליך בלשון שבחרת. הקול נשאר אותו קול.</p>
      </section>
      <section className="flex flex-col gap-3">
        <div className="text-[18px] font-semibold">פלט</div>
        <div className="grid grid-cols-2 gap-2">
          {(['speakers', 'headphones'] as const).map((o) => (
            <button key={o} onClick={() => save({ output: o })} className={`rounded-xl py-3 border transition-all ${s.output === o ? 'chip-on' : 'chip'}`}>{o === 'speakers' ? 'רמקולים' : 'אוזניות'}</button>
          ))}
        </div>
        <p className="text-[14px] opacity-80">רמקולים: הדרון מכוון גבוה יותר כדי שיישמע בטלפון. אוזניות: מוסיף תת-אוקטבה ושכבה ביניאורלית (תטא בשיא).</p>
        {s.output === 'headphones' && <label className="flex items-center justify-between"><span>שכבה ביניאורלית</span><input type="checkbox" checked={s.binaural} onChange={(e) => save({ binaural: e.target.checked })} /></label>}
      </section>
      <section className="flex flex-col gap-3">
        <div className="text-[18px] font-semibold">עוצמות</div>
        {([['musicGain', 'מוזיקה'], ['voiceGain', 'קריינות'], ['breathGain', 'צלילי נשימה']] as const).map(([k, label]) => (
          <GainSlider key={k} label={label} value={s[k]} onChange={(v) => save({ [k]: v })} />
        ))}
        <label className="flex items-center justify-between"><span>רטט בנשימה</span><input type="checkbox" checked={s.haptics} onChange={(e) => save({ haptics: e.target.checked })} /></label>
      </section>
      <section className="flex flex-col gap-3">
        <div className="text-[18px] font-semibold">איש קשר לחירום</div>
        <input value={s.emergencyName ?? ''} onChange={(e) => save({ emergencyName: e.target.value })} placeholder="שם" className="bg-transparent border-b border-ink/15 py-2 outline-none" />
        <input value={s.emergencyPhone ?? ''} onChange={(e) => save({ emergencyPhone: e.target.value })} placeholder="טלפון" inputMode="tel" className="bg-transparent border-b border-ink/15 py-2 outline-none" />
        <p className="text-[14px] opacity-80">מופיע כקיצור במסך החירום (לחיצה ארוכה 3 שניות בזמן מסע).</p>
      </section>
      <section className="text-[14px] opacity-80 leading-relaxed">
        המדריך מלווה נשימה, מדיטציה ומסעות עצמאיים. הוא אינו כלי רפואי ואינו מחליף ליווי אנושי. הכל נשמר במכשיר בלבד.
      </section>
      <VersionInfo />
    </div>
  )
}

function VersionInfo() {
  const [state, setState] = useState<'idle' | 'checking' | 'latest'>('idle')
  const check = async () => {
    setState('checking')
    try { await checkForUpdate() } catch { /* offline */ }
    // if a newer version exists it installs and the app reloads by itself; otherwise we're current
    setTimeout(() => setState('latest'), 4000)
  }
  return (
    <section className="card rounded-2xl p-4 flex items-center justify-between gap-3">
      <div>
        <div className="label">גרסה</div>
        <div className="text-[15px] font-medium tabular-nums mt-0.5" dir="ltr" style={{ textAlign: 'right' }}>{versionLabel()}</div>
        <div className="text-[13px] muted mt-0.5">עדכונים נטענים אוטומטית בפתיחת האפליקציה</div>
      </div>
      <button onClick={check} disabled={state === 'checking'} className="btn-ghost rounded-full px-4 py-2 text-[14px] shrink-0">
        {state === 'checking' ? 'בודק…' : state === 'latest' ? '✓ עדכני' : 'בדוק עכשיו'}
      </button>
    </section>
  )
}
