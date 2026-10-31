import { useEffect, useMemo, useState } from 'react'
import { type JournalEntry, db } from '../db'
import { MODE_META } from '../engine/plan'

export function JournalScreen() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<string | null>(null)

  useEffect(() => { void db.journal.orderBy('startedAt').reverse().toArray().then(setEntries) }, [])

  const filtered = useMemo(() => entries.filter((e) => !q || [e.note, e.transcript, e.intention, ...e.tags].join(' ').includes(q)), [entries, q])

  const stats = useMemo(() => {
    const days = new Set(entries.map((e) => e.startedAt.slice(0, 10)))
    let streak = 0
    const d = new Date()
    for (;;) { const k = d.toISOString().slice(0, 10); if (days.has(k)) { streak++; d.setDate(d.getDate() - 1) } else break }
    const weekAgo = Date.now() - 7 * 864e5
    const weekMin = Math.round(entries.filter((e) => new Date(e.startedAt).getTime() > weekAgo).reduce((s, e) => s + e.actualSec, 0) / 60)
    const last30 = entries.filter((e) => e.moodAfter && Date.now() - new Date(e.startedAt).getTime() < 30 * 864e5).slice(0, 30).reverse()
    const tagCount = new Map<string, number>()
    entries.forEach((e) => e.tags.forEach((t) => tagCount.set(t, (tagCount.get(t) ?? 0) + 1)))
    const topTags = [...tagCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
    return { streak, weekMin, last30, topTags }
  }, [entries])

  const exportMd = () => {
    const md = entries.map((e) => `## ${new Date(e.startedAt).toLocaleString('he-IL')} · ${MODE_META[e.mode].name} · ${Math.round(e.actualSec / 60)} דק'\nכוונה: ${e.intention}${e.moodBefore ? ` · לפני ${e.moodBefore}` : ''}${e.moodAfter ? ` · אחרי ${e.moodAfter}` : ''}\n${e.tags.length ? `תגיות: ${e.tags.join(', ')}\n` : ''}${e.transcript ? `\n${e.transcript}\n` : ''}${e.note ? `\n${e.note}\n` : ''}`).join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([md], { type: 'text/markdown' })); a.download = 'hamadrich-journal.md'; a.click()
  }

  return (
    <div className="fade-in flex flex-col gap-6 px-5 pt-10 pb-28">
      <header className="flex items-end justify-between">
        <h1 className="text-[28px] font-light">יומן</h1>
        <button onClick={exportMd} className="text-[13px] opacity-70">ייצוא</button>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="רצף ימים" value={String(stats.streak)} />
        <Stat label="דקות השבוע" value={String(stats.weekMin)} />
      </div>

      {stats.last30.length > 1 && (
        <div className="card rounded-2xl p-4">
          <div className="text-[13px] opacity-70 mb-2">מצב רוח אחרי סשן · 30 יום</div>
          <svg viewBox="0 0 300 60" className="w-full h-16">
            <polyline fill="none" stroke="#3FB7A8" strokeWidth="1.5" strokeLinejoin="round"
              points={stats.last30.map((e, i) => `${(i / (stats.last30.length - 1)) * 290 + 5},${55 - ((e.moodAfter! - 1) / 4) * 50}`).join(' ')} />
          </svg>
        </div>
      )}

      {stats.topTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {stats.topTags.map(([t, n]) => <span key={t} className="px-3 py-1 rounded-full border border-ink/12 text-[13px]" style={{ opacity: 0.45 + Math.min(0.5, n * 0.1) }}>{t}</span>)}
        </div>
      )}

      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש…" className="w-full bg-transparent border-b border-ink/15 py-2 text-[15px] outline-none placeholder:opacity-55" />

      <ul className="flex flex-col gap-3">
        {filtered.map((e) => (
          <li key={e.id} onClick={() => setOpen(open === e.id ? null : e.id)} className="card rounded-2xl p-4">
            <div className="flex justify-between text-[15px]">
              <span>{MODE_META[e.mode].name} · {Math.round(e.actualSec / 60)} דק'</span>
              <span className="opacity-70 text-[13px]">{new Date(e.startedAt).toLocaleDateString('he-IL')}</span>
            </div>
            <div className="text-[13px] opacity-70 mt-1">{e.intention}{e.tags.length ? ` · ${e.tags.join(' · ')}` : ''}{e.moodBefore && e.moodAfter ? ` · ${e.moodBefore}→${e.moodAfter}` : ''}{!e.completed ? ' · הופסק' : ''}</div>
            {open === e.id && (e.transcript || e.note) && <p className="text-[15px] leading-relaxed mt-3 opacity-80">{e.transcript}{e.transcript && e.note ? '\n' : ''}{e.note}</p>}
          </li>
        ))}
        {!entries.length && <li className="opacity-70 text-[15px]">עדיין אין סשנים. היומן מתחיל במסע הראשון.</li>}
      </ul>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="card rounded-2xl p-4"><div className="text-[28px] font-light">{value}</div><div className="text-[13px] opacity-70">{label}</div></div>
}
