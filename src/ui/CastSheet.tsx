import { createPortal } from 'react-dom'

type AirPlayMedia = HTMLAudioElement & { webkitShowPlaybackTargetPicker?: () => void }
type RemoteMedia = HTMLAudioElement & { remote?: { prompt: () => Promise<void> } }

/** AirPlay (Safari/iOS) or Remote Playback / Chromecast (Chrome) for the current audio, + TV mode + screen-mirroring help */
export function CastSheet({ getMedia, tv, onTv, onClose }: { getMedia: () => HTMLAudioElement | null; tv: boolean; onTv: (v: boolean) => void; onClose: () => void }) {
  const airplay = typeof window !== 'undefined' && 'WebKitPlaybackTargetAvailabilityEvent' in window
  const media = getMedia() as (AirPlayMedia & RemoteMedia) | null
  const remote = !!media?.remote
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent)

  const pickAirPlay = () => { (getMedia() as AirPlayMedia | null)?.webkitShowPlaybackTargetPicker?.() }
  const pickRemote = () => { void (getMedia() as RemoteMedia | null)?.remote?.prompt().catch(() => {}) }

  return createPortal(
    <div className="fixed inset-0 flex items-end" style={{ zIndex: 1000, background: 'rgba(7,5,16,0.82)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
      data-ui onClick={onClose} onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()}>
      <div className="fade-in sheet w-full rounded-t-[32px] p-6 pb-[calc(env(safe-area-inset-bottom)+24px)] flex flex-col gap-4 max-w-xl mx-auto" onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 rounded-full bg-ink/30 self-center -mt-2" />
        <h2 className="text-[24px] font-semibold">שידור למכשיר</h2>

        {airplay && (
          <button onClick={pickAirPlay} className="btn-ghost rounded-2xl p-4 text-right">
            <div className="text-[17px] font-semibold">AirPlay · רמקול או Apple TV</div>
            <div className="text-[14px] muted mt-0.5">בחירת רמקול, אוזניות או טלוויזיה מהרשימה של המכשיר</div>
          </button>
        )}
        {remote && (
          <button onClick={pickRemote} className="btn-ghost rounded-2xl p-4 text-right">
            <div className="text-[17px] font-semibold">Chromecast · טלוויזיה חכמה</div>
            <div className="text-[14px] muted mt-0.5">שידור המוזיקה למכשיר Cast ברשת</div>
          </button>
        )}

        <label className="card rounded-2xl p-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-[17px] font-semibold">מצב טלוויזיה</div>
            <div className="text-[14px] muted mt-0.5">מסך מלא נקי: האורב והחלל גדולים, בלי כפתורים, המסך לא נכבה. אפשר לסובב לרוחב.</div>
          </div>
          <input type="checkbox" checked={tv} onChange={(e) => onTv(e.target.checked)} />
        </label>

        <div className="text-[14px] muted leading-relaxed">
          <div className="label mb-1">כדי לראות את המסע על הטלוויזיה</div>
          {ios
            ? <>פותחים את <b>מרכז הבקרה</b> (החלקה מהפינה הימנית העליונה) ← <b>שיקוף מסך</b> ← בוחרים Apple TV או טלוויזיה עם AirPlay. גם הקול עובר לטלוויזיה. מומלץ להפעיל מצב טלוויזיה ולסובב את הטלפון לרוחב.</>
            : <>בהגדרות המהירות של אנדרואיד ← <b>שידור מסך / Cast</b> ← בוחרים את הטלוויזיה. מומלץ להפעיל מצב טלוויזיה ולסובב את הטלפון לרוחב.</>}
        </div>
        <button onClick={onClose} className="btn-psy rounded-2xl py-3.5 text-[16px]">סגור</button>
      </div>
    </div>,
    document.body,
  )
}
