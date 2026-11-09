import { useEffect, useState } from 'react'
import type { Mode } from '../db'
import { Halo } from './Halo'
import { type Address, g, useAddress } from '../address'

const albumLines = (a: Address) => [
  'האלבום הוא המדריך. מהכניסה ועד החזרה.',
  'אין מה לעשות. רק להקשיב.',
  g(a, 'אל תנסה להבין את המילים. תן להן לעבור כמו מים.', 'אל תנסי להבין את המילים. תני להן לעבור כמו מים.'),
  'בשיא – שקט מוחלט. זה מכוון.',
  'לא נוהגים הערב. מים בהישג יד. אפשר לעצור בכל רגע.',
  g(a, 'מצא תנוחה נוחה. הטלפון יכול לנוח עכשיו.', 'מצאי תנוחה נוחה. הטלפון יכול לנוח עכשיו.'),
]
const lines = (a: Address): Record<'short' | 'deep', string[]> => ({
  short: [g(a, 'מצא תנוחה נוחה.', 'מצאי תנוחה נוחה.'), 'הטלפון יכול לנוח עכשיו.', 'נגיעה אחת על המסך – עצירה. לחיצה ארוכה – עוד עשר דקות.'],
  deep: ['לא נוהגים הערב. מים בהישג יד.', g(a, 'אם אינך מרגיש יציב – אל תישאר לבד.', 'אם אינך מרגישה יציבה – אל תישארי לבד.'), 'אפשר לעצור בכל רגע. לחיצה ארוכה של שלוש שניות מביאה עזרה.', g(a, 'מצא תנוחה נוחה. הטלפון יכול לנוח עכשיו.', 'מצאי תנוחה נוחה. הטלפון יכול לנוח עכשיו.')],
})

export function PrepareScreen({ mode, onBegin, onCancel, loading }: { mode: Mode; onBegin: () => void; onCancel: () => void; loading: boolean }) {
  const a = useAddress()
  const L = lines(a)
  const shown = mode === 'album' ? albumLines(a) : mode === 'deep' ? L.deep : L.short
  const [i, setI] = useState(0)
  const [mood, setMood] = useState<number | null>(null)
  useEffect(() => { const id = setInterval(() => setI((x) => (x + 1) % shown.length), 6000); return () => clearInterval(id) }, [shown.length])

  return (
    <div className="fade-in h-full flex flex-col items-center justify-between px-6 pt-16 pb-10 text-center relative overflow-hidden">
      <div className="app-bg"><i /></div>
      <div className="relative">
        <div className="label">הכנה</div>
        <p key={i} className="fade-in text-[20px] leading-relaxed mt-8 min-h-[4.5rem] max-w-[22rem]">{shown[i % shown.length]}</p>
      </div>

      <div className="relative w-full max-w-xs">
        <Halo size={210} className="mx-auto mb-6" />
        <div className="text-[14px] opacity-80 mb-3">{g(a, 'איך אתה מרגיש עכשיו?', 'איך את מרגישה עכשיו?')}</div>
        <div className="flex justify-between">
          {[['1', 'כבד'], ['2', 'מתוח'], ['3', 'רגיל'], ['4', 'רגוע'], ['5', 'פתוח']].map(([n, l]) => (
            <button key={n} onClick={() => setMood(+n)} className="flex flex-col items-center gap-1">
              <span className={`w-12 h-12 rounded-full border text-[15px] flex items-center justify-center transition-all duration-500 ${mood === +n ? 'border-[#EBA17A] bg-[#EBA17A]/20 font-semibold' : 'border-ink/15 opacity-85'}`}>{n}</span>
              <span className="text-[12.5px] opacity-75">{l}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="relative w-full flex flex-col gap-3">
        <button onClick={() => { sessionStorage.setItem('moodBefore', String(mood ?? '')); onBegin() }} disabled={loading}
          className="rounded-2xl py-4 text-[18px] btn-psy disabled:opacity-80">{loading ? 'מכין את הצלילים…' : g(a, 'אני מוכן', 'אני מוכנה')}</button>
        <button onClick={onCancel} className="text-[15px] opacity-80 py-2">ביטול</button>
      </div>
    </div>
  )
}
