// Bandeau jaune d'ouverture de page, repris des pages Contact et Notre histoire de Pétille
export default function PageHero({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="bg-sun">
      <div className="mx-auto max-w-6xl px-4 pt-8 pb-16 sm:px-6">
        <p className="text-sm font-semibold tracking-[0.2em] text-ink/60 uppercase">{eyebrow}</p>
        <h1 className="font-display mt-2 max-w-2xl text-5xl leading-[0.95] font-extrabold sm:text-6xl">{title}</h1>
        {children && <div className="mt-6 max-w-xl text-lg text-ink/80">{children}</div>}
      </div>
    </div>
  );
}
