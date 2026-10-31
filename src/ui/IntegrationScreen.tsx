import { useRef, useState } from 'react'
import { type Asset, type JournalEntry, db, uid } from '../db'
import { measureDuration, startRecording } from '../engine/library'

const QUESTIONS = ['מה נשאר איתך?', 'מה הגוף אומר עכשיו?', 'מה היית רוצה לזכור מחר?', 'מה השתחרר?']

interface SRResultEvent { results: ArrayLike<ArrayLike<{ transcript: string }>> }
interface SRInstance { lang: string; continuous: boolean; interimResults: boolean; onresult: ((e: SRResultEvent) => void) | null; start(): void; stop(): void }
type SR = { new (): SRInstance }
declare global { interface Window { webkitSpeechRecognition?: SR; SpeechRecognition?: SR } }

export function IntegrationScreen({ draft, onDone }: { draft: JournalEntry; onDone: () => void }) {
  const [q] = useState(() => QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)])
  const [mood, setMood] = useState<number | null>(null)
  const [tags, setTags] = useState('')
  const [note, setNote] = useState('')
  const [rec, setRec] = useState<{ stop: () => Promise<Blob> } | null>(null)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [transcript, setTranscript] = useState('')
  const sr = useRef<SRInstance | null>(null)

  const toggleRec = async () => {
    if (rec) {
      const b = await rec.stop(); setBlob(b); setRec(null); sr.current?.stop()
      return
    }
    try {
      const r = await startRecording(); setRec(r)
      const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition
      if (Ctor) {
        const s = new Ctor(); s.lang = 'he-IL'; s.continuous = true; s.interimResults = false
        s.onresult = (e) => { let t = ''; for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript + ' '; setTranscript(t.trim()) }
        s.start(); sr.current = s
      }
    } catch { /* mic denied */ }
  }

  const save = async () => {
    let recordingAssetId: string | undefined
    if (blob) {
      const a: Asset = { id: uid(), kind: 'recording', name: `יומן ${new Date().toLocaleDateString('he-IL')}`, blob, mime: blob.type, durationSec: await measureDuration(blob), phases: [], gainDb: 0, createdAt: new Date().toISOString() }
      await db.assets.add(a); recordingAssetId = a.id
    }
    const entry: JournalEntry = { ...draft, moodAfter: mood ?? undefined, tags: tags.split(/[,\s]+/).filter(Boolean).slice(0, 3), note, transcript, recordingAssetId }
    await db.journal.put(entry)
    onDone()
  }

  return (
    <div className="fade-in h-full flex flex-col gap-7 px-6 pt-14 pb-8 overflow-y-auto">
      <div className="text-[13px] opacity-50 tracking-widest">אינטגרציה</div>
      <h2 className="text-[24px] font-light leading-relaxed">{q}</h2>

      <button onClick={toggleRec} className={`self-start rounded-full px-6 py-3 border text-[15px] transition-all ${rec ? 'border-red-400/70 text-red-300' : 'border-ink/25'}`}>
        {rec ? '● מקליט… לחץ לסיום' : blob ? '✓ הוקלט · הקלט שוב' : 'הקלט תשובה'}
      </button>
      {transcript && <p className="text-[15px] opacity-70 leading-relaxed">{transcript}</p>}

      <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="או בכתב…" rows={3}
        className="w-full bg-transparent border border-ink/12 rounded-xl p-3 text-[15px] outline-none placeholder:opacity-40 resize-none" />

      <div>
        <div className="text-[13px] opacity-55 mb-2">שלוש מילים</div>
        <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="שקט, גוף, אור" className="w-full bg-transparent border-b border-ink/15 py-2 text-[15px] outline-none placeholder:opacity-40" />
      </div>

      <div>
        <div className="text-[13px] opacity-55 mb-3">איך אתה מרגיש עכשיו?</div>
        <div className="flex justify-between max-w-xs">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => setMood(n)} className={`w-12 h-12 rounded-full border text-[15px] transition-all ${mood === n ? 'border-ink/70 bg-ink/10' : 'border-ink/12 opacity-60'}`}>{n}</button>
          ))}
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-3 pt-4">
        <button onClick={save} className="rounded-2xl py-4 text-[17px] bg-ink text-bg">שמור</button>
        <button onClick={() => void db.journal.put(draft).then(onDone)} className="text-[15px] opacity-50 py-2">דלג</button>
      </div>
    </div>
  )
}
