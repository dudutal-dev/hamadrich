import { useEffect, useState } from 'react'
import type { Mode } from '../db'

const LINES: Record<'short' | 'deep', string[]> = {
  short: ['מצא תנוחה נוחה.', 'הטלפון יכול לנוח עכשיו.', 'נגיעה אחת על המסך – עצירה. לחיצה ארוכה – עוד עשר דקות.'],
  deep: ['לא נוהגים הערב. מים בהישג יד.', 'אם אינך מרגיש יציב – אל תישאר לבד.', 'אפשר לעצור בכל רגע. לחיצה ארוכה של שלוש שניות מביאה עזרה.', 'מצא תנוחה נוחה. הטלפון יכול לנוח עכשיו.'],
}

export function PrepareScreen({ mode, onBegin, onCancel, loading }: { mode: Mode; onBegin: () => void; onCancel: () => void; loading: boolean }) {
  const lines = mode === 'deep' || mode === 'album' ? LINES.deep : LINES.short
  const [i, setI] = useState(0)
  const [mood, setMood] = useState<number | null>(null)
  useEffect(() => { const id = setInterval(() => setI((x) => (x + 1) % lines.length), 6000); return () => clearInterval(id) }, [lines.length])

  return (
    <div className="fade-in h-full flex flex-col items-center justify-between px-6 pt-16 pb-10 text-center">
      <div>
        <div className="text-[13px] opacity-50 tracking-widest">הכנה</div>
        <p key={i} className="fade-in text-[20px] leading-relaxed mt-8 min-h-[4.5rem] max-w-[22rem]">{lines[i]}</p>
      </div>

      <div className="w-full max-w-xs">
        <div className="text-[13px] opacity-55 mb-3">איך אתה מרגיש עכשיו?</div>
        <div className="flex justify-between">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => setMood(n)} className={`w-12 h-12 rounded-full border text-[15px] transition-all duration-500 ${mood === n ? 'border-ink/70 bg-ink/10' : 'border-ink/12 opacity-60'}`}>{n}</button>
          ))}
        </div>
      </div>

      <div className="w-full flex flex-col gap-3">
        <button onClick={() => { sessionStorage.setItem('moodBefore', String(mood ?? '')); onBegin() }} disabled={loading}
          className="rounded-2xl py-4 text-[17px] bg-ink text-bg disabled:opacity-50">{loading ? 'טוען צלילים…' : 'אני מוכן'}</button>
        <button onClick={onCancel} className="text-[15px] opacity-50 py-2">ביטול</button>
      </div>
    </div>
  )
}
