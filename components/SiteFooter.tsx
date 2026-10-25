import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="bg-ink text-cream">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-3">
        <div>
          <Link href="/" className="font-display text-2xl font-extrabold">PÉTILLE</Link>
          <p className="mt-3 max-w-xs text-cream/60">
            Sodas artisanaux bio et peu sucrés, en canettes 33 cl recyclables.
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-cream/40 uppercase">Le site</p>
          <ul className="mt-4 space-y-2 font-medium">
            <li><Link href="/saveurs" className="hover:text-citron">Nos saveurs</Link></li>
            <li><Link href="/notre-histoire" className="hover:text-citron">Notre histoire</Link></li>
            <li><Link href="/contact" className="hover:text-citron">Contact</Link></li>
            <li><Link href="/compte" className="hover:text-citron">Mon compte</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-cream/40 uppercase">Restons en contact</p>
          <p className="mt-4 text-cream/60">Nouvelles saveurs et éditions limitées en avant-première.</p>
          <Link href="/contact" className="btn btn-citron mt-4 px-5 py-2.5 text-sm">
            S&apos;inscrire à la newsletter
          </Link>
        </div>
      </div>
      <div className="border-t border-cream/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-cream/50 sm:flex-row sm:justify-between sm:px-6">
          <span>© 2026 Pétille — L&apos;abus de bulles n&apos;est pas dangereux.</span>
          <span>Projet étudiant · paiement simulé, aucune vente réelle.</span>
        </div>
      </div>
    </footer>
  );
}
