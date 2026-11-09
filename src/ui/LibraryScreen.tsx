import { useEffect, useRef, useState } from 'react'
import { type Album, type Asset, type Phase, type Settings, type TextItem, db, getSettings, uid } from '../db'
import { deleteAlbum, importAlbum, importMusic, saveVoiceRecording, startRecording, synthesizeVoice } from '../engine/library'
import { PHASE_NAMES } from '../engine/plan'
import { checkForUpdate, versionLabel } from '../version'

type Tab = 'texts' | 'music' | 'settings'

export function LibraryScreen() {
  const [tab, setTab] = useState<Tab>('texts')
  return (
    <div className="fade-in flex flex-col gap-5 px-5 pt-10 pb-28">
      <h1 className="text-[34px] title-psy">ספרייה</h1>
      <div className="flex gap-1 p-1 rounded-full chip text-[15px]">
        {(['texts', 'music', 'settings'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 rounded-full transition-all ${tab === t ? 'btn-psy' : 'opacity-85'}`}>{{ texts: 'טקסטים', music: 'מוזיקה', settings: 'הגדרות' }[t]}</button>
        ))}
      </div>
      {tab === 'texts' && <Texts />}
      {tab === 'music' && <Music />}
      {tab === 'settings' && <SettingsPane />}
    </div>
  )
}

/* ---------- Texts ---------- */
function Texts() {
  const [texts, setTexts] = useState<TextItem[]>([])
  const [edit, setEdit] = useState<TextItem | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const reload = () => db.texts.toArray().then((t) => setTexts(t.sort((a, b) => a.phases[0] - b.phases[0] || a.createdAt.localeCompare(b.createdAt))))
  useEffect(() => { void reload() }, [])

  const synth = async (t: TextItem) => {
    const s = await getSettings()
    if (!s.elevenKey || !s.voiceId) { setMsg('הגדר מפתח ElevenLabs וקול בלשונית הגדרות'); return }
    setBusy(t.id); setMsg('')
    try { await synthesizeVoice(t, s.elevenKey, s.voiceId); await reload() } catch (e) { setMsg(String(e)) }
    setBusy(null)
  }
  const synthAll = async () => { for (const t of texts.filter((x) => !x.voiceAssetId)) await synth(t) }

  const play = async (t: TextItem) => {
    if (!t.voiceAssetId) return
    const a = await db.assets.get(t.voiceAssetId); if (!a) return
    const url = URL.createObjectURL(a.blob); const au = new Audio(url); au.onended = () => URL.revokeObjectURL(url); void au.play()
  }

  const missing = texts.filter((t) => !t.voiceAssetId).length
  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between items-center text-[14px] opacity-85">
        <span>{texts.length} טקסטים · {missing} ללא קול</span>
        <div className="flex gap-4">
          {missing > 0 && <button onClick={synthAll} disabled={!!busy}>הפק קול לכולם</button>}
          <button onClick={() => setEdit({ id: uid(), title: '', body: '', source: 'שלי', phases: [2], intentions: [], estSec: 20, createdAt: new Date().toISOString() })}>+ חדש</button>
        </div>
      </div>
      {msg && <div className="text-[14px] text-amber-200/80">{msg}</div>}
      {texts.map((t) => (
        <div key={t.id} className="card rounded-2xl p-4">
          <div className="flex justify-between">
            <div className="text-[18px] font-semibold">{t.title}</div>
            <div className="text-[14px] opacity-80">{t.phases.map((p) => PHASE_NAMES[p]).join(' · ')}</div>
          </div>
          <p className="text-[15px] opacity-80 leading-relaxed mt-2 line-clamp-2">{t.body}</p>
          <div className="flex gap-4 text-[14px] mt-3 opacity-80">
            {t.voiceAssetId ? <button onClick={() => play(t)}>▶ האזן</button> : <span className="opacity-85">אין קול</span>}
            <button onClick={() => synth(t)} disabled={busy === t.id}>{busy === t.id ? 'מפיק…' : t.voiceAssetId ? 'הפק מחדש' : 'הפק קריינות'}</button>
            <RecordButton text={t} onDone={reload} />
            <button onClick={() => setEdit(t)}>ערוך</button>
          </div>
        </div>
      ))}
      {edit && <TextEditor item={edit} onClose={() => { setEdit(null); void reload() }} />}
    </div>
  )
}

function RecordButton({ text, onDone }: { text: TextItem; onDone: () => void }) {
  const [rec, setRec] = useState<{ stop: () => Promise<Blob> } | null>(null)
  const toggle = async () => {
    if (rec) { const b = await rec.stop(); setRec(null); await saveVoiceRecording(text, b); onDone(); return }
    try { setRec(await startRecording()) } catch { /* */ }
  }
  return <button onClick={toggle} className={rec ? 'text-red-300' : ''}>{rec ? '● עצור' : 'הקלט בעצמך'}</button>
}

function TextEditor({ item, onClose }: { item: TextItem; onClose: () => void }) {
  const [t, setT] = useState(item)
  const togglePhase = (p: Phase) => setT({ ...t, phases: t.phases.includes(p) ? t.phases.filter((x) => x !== p) : [...t.phases, p].sort() })
  const save = async () => { await db.texts.put({ ...t, estSec: t.estSec || Math.round(t.body.length / 12) }); onClose() }
  const del = async () => { if (confirm('למחוק את הטקסט?')) { await db.texts.delete(t.id); if (t.voiceAssetId) await db.assets.delete(t.voiceAssetId); onClose() } }
  return (
    <div className="fixed inset-0 bg-bg/95 z-50 flex flex-col gap-4 px-5 pt-12 pb-8 overflow-y-auto">
      <input value={t.title} onChange={(e) => setT({ ...t, title: e.target.value })} placeholder="כותרת" className="bg-transparent border-b border-ink/15 py-2 text-[20px] outline-none" />
      <textarea value={t.body} onChange={(e) => setT({ ...t, body: e.target.value })} placeholder="הטקסט, כפי שייאמר…" rows={8} className="bg-transparent border border-ink/12 rounded-xl p-3 text-[17px] leading-relaxed outline-none resize-none" />
      <div className="text-[14px] opacity-80">שלבים</div>
      <div className="flex flex-wrap gap-2">
        {([1, 2, 3, 4, 5] as Phase[]).map((p) => <button key={p} onClick={() => togglePhase(p)} className={`px-3 py-1.5 rounded-full border text-[14px] ${t.phases.includes(p) ? 'chip-on' : 'chip'}`}>{PHASE_NAMES[p]}</button>)}
      </div>
      <input value={t.intentions.join(', ')} onChange={(e) => setT({ ...t, intentions: e.target.value.split(/[,\s]+/).filter(Boolean) })} placeholder="כוונות (שקט, ריפוי…)" className="bg-transparent border-b border-ink/15 py-2 text-[15px] outline-none" />
      <input value={t.source} onChange={(e) => setT({ ...t, source: e.target.value })} placeholder="מקור" className="bg-transparent border-b border-ink/15 py-2 text-[15px] outline-none" />
      <div className="mt-auto flex flex-col gap-3">
        <button onClick={save} className="rounded-2xl py-4 bg-ink text-bg text-[17px]">שמור</button>
        <div className="flex justify-between text-[15px] opacity-85"><button onClick={onClose}>ביטול</button><button onClick={del}>מחק</button></div>
      </div>
    </div>
  )
}

/* ---------- Music ---------- */
function Music() {
  const [albums, setAlbums] = useState<Album[]>([])
  const [loose, setLoose] = useState<Asset[]>([])
  const [busy, setBusy] = useState('')
  const [albumName, setAlbumName] = useState('Psychedelic Prayers')
  const albumInput = useRef<HTMLInputElement>(null)
  const looseInput = useRef<HTMLInputElement>(null)
  const [loosePhases, setLoosePhases] = useState<Phase[]>([3])

  const reload = () => Promise.all([db.albums.toArray(), db.assets.where('kind').equals('music').toArray()])
    .then(([al, music]) => { setAlbums(al); setLoose(music.filter((a) => !a.albumId)) })
  useEffect(() => { void reload() }, [])

  const onAlbum = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy('מתחיל…')
    try { await importAlbum([...files], albumName || 'אלבום', setBusy) } catch (e) { setBusy('שגיאה: ' + String(e)); return }
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
        <p className="text-[14px] opacity-85 leading-relaxed">בחר את קובץ ה-ZIP שהורדת מ-Bandcamp (או את כל ה-MP3 בבת אחת). הסדר נקבע לפי מספר הרצועה בשם הקובץ, והשלבים ממופים אוטומטית.</p>
        <input value={albumName} onChange={(e) => setAlbumName(e.target.value)} className="bg-transparent border-b border-ink/15 py-1 text-[15px] outline-none" />
        <input ref={albumInput} type="file" accept="audio/*,.zip,application/zip" multiple hidden onChange={(e) => onAlbum(e.target.files)} />
        <button onClick={() => albumInput.current?.click()} className="rounded-xl py-3 btn-ghost text-[15px]">בחר ZIP או קבצים</button>
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
  const [voices, setVoices] = useState<Array<{ voice_id: string; name: string }>>([])
  useEffect(() => { void getSettings().then(setS) }, [])
  if (!s) return null
  const save = (patch: Partial<Settings>) => { const n = { ...s, ...patch }; setS(n); void db.settings.put(n) }
  const loadVoices = async () => {
    if (!s.elevenKey) return
    const r = await fetch('https://api.elevenlabs.io/v1/voices', { headers: { 'xi-api-key': s.elevenKey } })
    if (r.ok) setVoices((await r.json()).voices)
  }
  return (
    <div className="flex flex-col gap-6 text-[15px]">
      <section className="flex flex-col gap-3">
        <div className="text-[18px] font-semibold">קול (ElevenLabs)</div>
        <input type="password" value={s.elevenKey ?? ''} onChange={(e) => save({ elevenKey: e.target.value })} placeholder="מפתח API" className="bg-transparent border-b border-ink/15 py-2 outline-none" />
        <div className="flex gap-3 items-center">
          <input value={s.voiceId ?? ''} onChange={(e) => save({ voiceId: e.target.value })} placeholder="Voice ID" className="flex-1 bg-transparent border-b border-ink/15 py-2 outline-none" />
          <button onClick={loadVoices} className="text-[14px] opacity-85">טען קולות</button>
        </div>
        {voices.length > 0 && (
          <select value={s.voiceId ?? ''} onChange={(e) => save({ voiceId: e.target.value })} className="bg-bg border border-ink/15 rounded-lg p-2">
            <option value="">בחר קול</option>
            {voices.map((v) => <option key={v.voice_id} value={v.voice_id}>{v.name}</option>)}
          </select>
        )}
        <p className="text-[14px] opacity-80">המפתח נשמר רק במכשיר הזה. הפקת קול דורשת רשת; המסע עצמו לא.</p>
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
