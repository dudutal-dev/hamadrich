import { useEffect, useState } from 'react'
import { Cosmos } from './Cosmos'
import type { Mode } from '../db'

const ALBUM_LINES = [
  'תפילות פסיכדליות. 55 שירים, מהכניסה ועד החזרה.',
  'לירי כתב: שיר בזמן הנכון הוא דלת.',
  'אל תנסה להבין את המילים. תן להן לעבור כמו מים.',
  'בשיא – שקט מוחלט. זה מכוון.',
  'לא נוהגים הערב. מים בהישג יד. אפשר לעצור בכל רגע.',
  'מצא תנוחה נוחה. הטלפון יכול לנוח עכשיו.',
]
const LINES: Record<'short' | 'deep', string[]> = {
  short: ['מצא תנוחה נוחה.', 'הטלפון יכול לנוח עכשיו.', 'נגיעה אחת על המסך – עצירה. לחיצה ארוכה – עוד עשר דקות.'],
  deep: ['לא נוהגים הערב. מים בהישג יד.', 'אם אינך מרגיש יציב – אל תישאר לבד.', 'אפשר לעצור בכל רגע. לחיצה ארוכה של שלוש שניות מביאה עזרה.', 'מצא תנוחה נוחה. הטלפון יכול לנוח עכשיו.'],
}

export function PrepareScreen({ mode, onBegin, onCancel, loading }: { mode: Mode; onBegin: () => void; onCancel: () => void; loading: boolean }) {
  const lines = mode === 'album' ? ALBUM_LINES : mode === 'deep' ? LINES.deep : LINES.short
  const [i, setI] = useState(0)
  const [mood, setMood] = useState<number | null>(null)
  useEffect(() => { const id = setInterval(() => setI((x) => (x + 1) % lines.length), 6000); return () => clearInterval(id) }, [lines.length])

  return (
    <div className="fade-in h-full flex flex-col items-center justify-between px-6 pt-16 pb-10 text-center relative overflow-hidden" style={{ background: "#070510" }}>
      <Cosmos color="#7B2FD6" color2="#FF5FC8" intensity={0.5} phase={3} paused={false} />
      <div className="relative">
        <div className="text-[13px] opacity-70 tracking-[0.3em]">הכנה</div>
        <p key={i} className="fade-in text-[20px] leading-relaxed mt-8 min-h-[4.5rem] max-w-[22rem]">{lines[i]}</p>
      </div>

      <div className="relative w-full max-w-xs">
        <div className="w-36 h-36 mx-auto mb-8 rounded-full aura" style={{ background: 'radial-gradient(circle at 40% 35%, #FF5FC8, #7B2FD6 55%, transparent 75%)', boxShadow: '0 0 70px #7B2FD688' }} />
        <div className="text-[13px] opacity-70 mb-3">איך אתה מרגיש עכשיו?</div>
        <div className="flex justify-between">
          {[['1', 'כבד'], ['2', 'מתוח'], ['3', 'רגיל'], ['4', 'רגוע'], ['5', 'פתוח']].map(([n, l]) => (
            <button key={n} onClick={() => setMood(+n)} className="flex flex-col items-center gap-1">
              <span className={`w-12 h-12 rounded-full border text-[15px] flex items-center justify-center transition-all duration-500 ${mood === +n ? 'border-[#FF5FC8] bg-[#FF5FC8]/25 shadow-[0_0_20px_-4px_#FF5FC8]' : 'border-ink/15 opacity-75'}`}>{n}</span>
              <span className="text-[11px] opacity-60">{l}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="relative w-full flex flex-col gap-3">
        <button onClick={() => { sessionStorage.setItem('moodBefore', String(mood ?? '')); onBegin() }} disabled={loading}
          className="rounded-2xl py-4 text-[18px] btn-psy disabled:opacity-70">{loading ? 'מכין את הצלילים…' : 'אני מוכן'}</button>
        <button onClick={onCancel} className="text-[15px] opacity-70 py-2">ביטול</button>
      </div>
    </div>
  )
}
