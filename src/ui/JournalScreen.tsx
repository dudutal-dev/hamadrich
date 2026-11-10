import { useEffect, useMemo, useState } from 'react'
import { type JournalEntry, db } from '../db'
import { MODE_META } from '../engine/plan'
import { ScreenHero, art } from './ScreenHero'

export function JournalScreen() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const [now] = useState(() => Date.now())

  useEffect(() => { void db.journal.orderBy('startedAt').reverse().toArray().then(setEntries) }, [])

  const filtered = useMemo(() => entries.filter((e) => !q || [e.note, e.transcript, e.intention, ...e.tags].join(' ').includes(q)), [entries, q])

  const stats = useMemo(() => {
    const days = new Set(entries.map((e) => e.startedAt.slice(0, 10)))
    let streak = 0
    const d = new Date(now)
    for (;;) { const k = d.toISOString().slice(0, 10); if (days.has(k)) { streak++; d.setDate(d.getDate() - 1) } else break }
    const weekAgo = now - 7 * 864e5
    const weekMin = Math.round(entries.filter((e) => new Date(e.startedAt).getTime() > weekAgo).reduce((s, e) => s + e.actualSec, 0) / 60)
    const last30 = entries.filter((e) => e.moodAfter && now - new Date(e.startedAt).getTime() < 30 * 864e5).slice(0, 30).reverse()
    const tagCount = new Map<string, number>()
    entries.forEach((e) => e.tags.forEach((t) => tagCount.set(t, (tagCount.get(t) ?? 0) + 1)))
    const topTags = [...tagCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
    return { streak, weekMin, last30, topTags }
  }, [entries, now])

  const clearAll = async () => {
    if (!confirm('למחוק את כל רשומות היומן? ההקלטות יימחקו גם. לא ניתן לשחזר.')) return
    const recs = entries.map((e) => e.recordingAssetId).filter(Boolean) as string[]
    await db.assets.bulkDelete(recs)
    await db.journal.clear()
    setEntries([])
  }
  const delOne = async (e: JournalEntry) => {
    if (!confirm('למחוק את הרשומה הזו?')) return
    if (e.recordingAssetId) await db.assets.delete(e.recordingAssetId)
    await db.journal.delete(e.id)
    setEntries((x) => x.filter((y) => y.id !== e.id))
  }
  const playRec = async (e: JournalEntry) => {
    if (!e.recordingAssetId) return
    const a = await db.assets.get(e.recordingAssetId); if (!a) return
    const url = URL.createObjectURL(a.blob); const au = new Audio(url); au.onended = () => URL.revokeObjectURL(url); void au.play()
  }
  const exportMd = () => {
    const md = entries.map((e) => `## ${new Date(e.startedAt).toLocaleString('he-IL')} · ${MODE_META[e.mode].name} · ${Math.round(e.actualSec / 60)} דק'\nכוונה: ${e.intention}${e.moodBefore ? ` · לפני ${e.moodBefore}` : ''}${e.moodAfter ? ` · אחרי ${e.moodAfter}` : ''}\n${e.tags.length ? `תגיות: ${e.tags.join(', ')}\n` : ''}${e.transcript ? `\n${e.transcript}\n` : ''}${e.note ? `\n${e.note}\n` : ''}`).join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([md], { type: 'text/markdown' })); a.download = 'hamadrich-journal.md'; a.click()
  }

  return (
    <div className="fade-in flex flex-col gap-6 px-5 pt-12 pb-28">
      <ScreenHero img="journal" title="יומן" sub={entries.length ? `${entries.length} מסעות` : 'המסע הראשון שלך יופיע כאן'}>
        <div className="flex gap-2 text-[13.5px] shrink-0">
          {entries.length > 0 && <button onClick={exportMd} className="rounded-full px-3 py-1.5" style={{ background: 'rgba(14,12,21,0.55)', backdropFilter: 'blur(8px)', border: '1px solid rgba(246,242,234,0.2)' }}>ייצוא</button>}
          {entries.length > 0 && <button onClick={clearAll} className="rounded-full px-3 py-1.5 text-red-200" style={{ background: 'rgba(14,12,21,0.55)', backdropFilter: 'blur(8px)', border: '1px solid rgba(246,242,234,0.2)' }}>ניקוי</button>}
        </div>
      </ScreenHero>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="רצף ימים" value={String(stats.streak)} />
        <Stat label="דקות השבוע" value={String(stats.weekMin)} />
      </div>

      {stats.last30.length > 1 && (
        <div className="card rounded-2xl p-4">
          <div className="text-[14px] opacity-80 mb-2">מצב רוח אחרי סשן · 30 יום</div>
          <svg viewBox="0 0 300 60" className="w-full h-16">
            <polyline fill="none" stroke="#4FD6C8" strokeWidth="2.2" strokeLinejoin="round"
              points={stats.last30.map((e, i) => `${(i / (stats.last30.length - 1)) * 290 + 5},${55 - ((e.moodAfter! - 1) / 4) * 50}`).join(' ')} />
          </svg>
        </div>
      )}

      {stats.topTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {stats.topTags.map(([t, n]) => <span key={t} className="px-3 py-1 rounded-full border border-ink/12 text-[14px]" style={{ opacity: 0.45 + Math.min(0.5, n * 0.1) }}>{t}</span>)}
        </div>
      )}

      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש…" className="w-full bg-transparent border-b border-ink/15 py-2 text-[15px] outline-none placeholder:opacity-55" />

      <ul className="flex flex-col gap-3">
        {filtered.map((e) => (
          <li key={e.id} onClick={() => setOpen(open === e.id ? null : e.id)} className="card rounded-2xl p-4">
            <div className="flex justify-between text-[15px]">
              <span>{MODE_META[e.mode].name} · {Math.round(e.actualSec / 60)} דק'</span>
              <span className="opacity-80 text-[14px]">{new Date(e.startedAt).toLocaleDateString('he-IL')}</span>
            </div>
            <div className="text-[14px] opacity-80 mt-1">{e.intention}{e.tags.length ? ` · ${e.tags.join(' · ')}` : ''}{e.moodBefore && e.moodAfter ? ` · ${e.moodBefore}→${e.moodAfter}` : ''}{!e.completed ? ' · הופסק' : ''}</div>
            {open === e.id && (
              <div className="mt-3 flex flex-col gap-3">
                {(e.transcript || e.note) && <p className="text-[15px] leading-relaxed opacity-85 whitespace-pre-line">{e.transcript}{e.transcript && e.note ? '\n' : ''}{e.note}</p>}
                <div className="flex gap-5 text-[14px] opacity-85">
                  {e.recordingAssetId && <button onClick={(ev) => { ev.stopPropagation(); void playRec(e) }}>▶ הקלטה</button>}
                  <button onClick={(ev) => { ev.stopPropagation(); void delOne(e) }} className="text-red-300/80">מחק</button>
                </div>
              </div>
            )}
          </li>
        ))}
        {!entries.length && (
          <li className="card rounded-3xl overflow-hidden text-center">
            <img src={art('sleep')} alt="" className="w-full aspect-[16/7] object-cover opacity-90" />
            <div className="p-6 pt-4">
            <p className="text-[15px] opacity-80 leading-relaxed">אחרי כל מסע תענה על שאלה אחת, תקליט או תכתוב, ותסמן איך הרגשת. כאן תראה לאורך זמן מה חוזר.</p>
            </div>
          </li>
        )}
      </ul>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="relative overflow-hidden rounded-3xl p-4" style={{ background: 'linear-gradient(135deg, rgba(242,194,107,0.12), rgba(179,164,242,0.08))', border: '1px solid rgba(246,242,234,0.12)' }}>
      <div className="absolute -top-8 -left-8 w-24 h-24 rounded-full" style={{ background: 'radial-gradient(circle, rgba(242,194,107,0.3), transparent 70%)', filter: 'blur(10px)' }} />
      <div className="relative text-[34px] title-psy leading-none tabular-nums">{value}</div><div className="relative text-[14px] opacity-80 mt-1.5">{label}</div>
    </div>
  )
}
