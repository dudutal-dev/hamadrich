import { type Address, setAddress, useAddress } from '../address'

/** "איך לפנות אליך" – masculine / feminine Hebrew for narration and app text */
export function AddressPicker({ compact = false }: { compact?: boolean }) {
  const a = useAddress()
  const opts: [Address, string][] = [['m', 'בלשון זכר'], ['f', 'בלשון נקבה']]
  return (
    <div className={`flex gap-1 p-1 rounded-full chip ${compact ? 'text-[14px]' : 'text-[15px]'}`} role="radiogroup" aria-label="פנייה">
      {opts.map(([k, l]) => (
        <button key={k} role="radio" aria-checked={a === k} onClick={() => void setAddress(k)} className={`flex-1 py-2 rounded-full transition-all ${a === k ? 'btn-psy' : 'opacity-85'}`}>{l}</button>
      ))}
    </div>
  )
}
