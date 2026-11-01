export function NavIcon({ name, active }: { name: 'journey' | 'album' | 'journal' | 'library'; active: boolean }) {
  const c = active ? '#0E0B18' : '#F2EEE6'
  const common = { fill: 'none', stroke: c, strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (name) {
    case 'journey': // orb with rays
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" {...common}>
          <circle cx="12" cy="12" r="4.5" fill={active ? c : 'none'} fillOpacity={0.9} />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" />
        </svg>
      )
    case 'album': // vinyl / spiral
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" {...common}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5.5" strokeOpacity={0.7} />
          <circle cx="12" cy="12" r="1.6" fill={c} />
        </svg>
      )
    case 'journal': // moon + lines
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" {...common}>
          <path d="M5 4.5h11a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5z" />
          <path d="M8.5 9h5M8.5 12.5h5M8.5 16h3" />
          <path d="M5 4.5v17" />
        </svg>
      )
    case 'library': // layered waves / library
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" {...common}>
          <path d="M4 7c3-2 5 2 8 0s5 2 8 0" />
          <path d="M4 12c3-2 5 2 8 0s5 2 8 0" />
          <path d="M4 17c3-2 5 2 8 0s5 2 8 0" />
        </svg>
      )
  }
}
