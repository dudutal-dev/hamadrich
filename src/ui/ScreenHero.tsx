/** Image header shared by the main tabs: full-bleed art from the journey's world, a slow drift, and a soft fade
 *  into the page (mask, so it blends with any background). Title and subtitle sit on the lower part of the art. */
export const art = (n: string) => `${import.meta.env.BASE_URL}art/${n}.webp`

export function ScreenHero({ img, title, sub, children, tall }: { img: string; title: string; sub?: React.ReactNode; children?: React.ReactNode; tall?: boolean }) {
  return (
    <header className={`relative -mx-5 -mt-12 ${tall ? 'h-[44vh] min-h-[300px]' : 'h-[32vh] min-h-[220px]'} max-h-[420px] overflow-hidden shrink-0`}>
      <div className="absolute inset-0" style={{ WebkitMaskImage: 'linear-gradient(180deg, #000 62%, transparent 100%)', maskImage: 'linear-gradient(180deg, #000 62%, transparent 100%)' }}>
        <img src={art(img)} alt="" className="absolute inset-0 w-full h-full object-cover kenburns" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(14,12,21,0.55) 0%, rgba(14,12,21,0.05) 30%, rgba(14,12,21,0.15) 55%, rgba(14,12,21,0.8) 90%)' }} />
      </div>
      <div className="absolute bottom-3 right-5 left-5 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[40px] title-psy leading-[1.05] drop-shadow-[0_2px_14px_rgba(0,0,0,0.7)]">{title}</h1>
          {sub && <div className="text-[14.5px] opacity-90 mt-1 leading-relaxed" style={{ textShadow: '0 1px 10px #000' }}>{sub}</div>}
        </div>
        {children}
      </div>
    </header>
  )
}
