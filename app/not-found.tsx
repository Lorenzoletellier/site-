import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
      <p className="text-sm font-semibold tracking-[0.2em] text-ink/60 uppercase">Erreur 404</p>
      <h1 className="font-display mt-2 text-5xl font-extrabold sm:text-6xl">Plus de bulles ici.</h1>
      <p className="mt-4 text-ink/70">Cette page n&apos;existe pas ou n&apos;existe plus.</p>
      <Link href="/saveurs" className="mt-8 inline-block rounded-full bg-ink px-7 py-4 font-semibold text-cream transition hover:scale-105">
        Retour aux saveurs
      </Link>
    </section>
  );
}
