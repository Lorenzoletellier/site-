import Link from "next/link";
import Can from "@/components/Can";
import BrandHero from "@/components/home/BrandHero";
import Hero from "@/components/home/Hero";
import Messages from "@/components/Messages";
import { ArrowIcon, DropIcon, LeafIcon, RecycleIcon } from "@/components/Icons";
import { getFlavors } from "@/lib/queries";
import { formatPrice } from "@/lib/flavors";


const reasons = [
  { Icon: DropIcon, tint: "bg-citron", title: "Deux fois moins sucré", text: "4 g de sucre pour 100 ml en moyenne, contre 10 g dans un soda classique." },
  { Icon: LeafIcon, tint: "bg-corail", title: "De vrais fruits bio", text: "Des fruits pressés et des plantes infusées, sans arôme artificiel ni colorant." },
  { Icon: RecycleIcon, tint: "bg-framboise text-cream", title: "Une canette qui revient", text: "L'aluminium se recycle à l'infini. Trie-la, elle redevient une canette." },
];

export default async function Home() {
  // Les saveurs viennent de la base : une saveur ajoutée par l'admin apparaît ici
  const flavors = await getFlavors();
  const byId = Object.fromEntries(flavors.map((f) => [f.id, f]));
  const pick = (id: string, index: number) => byId[id] ?? flavors[index % flavors.length];
  const favorites = ["citron-yuzu", "framboise-basilic", "cola-vanille"].map((id, i) => pick(id, i));

  return (
    <>

      {/* Hero de marque : fond bleu électrique, canettes 3D, fruits et bulles */}
      <BrandHero flavors={flavors} />

      <div className="overflow-hidden border-y-2 border-ink bg-citron py-3 text-ink">
        <div className="marquee flex w-max gap-10 font-display text-xl font-bold whitespace-nowrap">
          {Array.from({ length: 2 }).flatMap((_, k) =>
            ["BIO", "PEU SUCRÉ", "VRAIS FRUITS", "FABRIQUÉ EN FRANCE", "100 % RECYCLABLE", "SANS ARÔMES ARTIFICIELS"].map((t) => (
              <span key={`${k}-${t}`}>✦ {t}</span>
            )),
          )}
        </div>
      </div>

      {/* Nos saveurs : une saveur à la fois, canette 3D et explosion de fruits */}
      <Hero flavors={flavors} />

      {/* Pourquoi Pétille */}
      <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <p className="text-sm font-semibold tracking-[0.2em] text-ink/60 uppercase">Pourquoi Pétille ?</p>
        <h2 className="font-display mt-2 max-w-2xl text-4xl font-extrabold sm:text-5xl">
          Tout le plaisir d&apos;un soda, sans ce qu&apos;on n&apos;aime pas.
        </h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {reasons.map(({ Icon, tint, title, text }) => (
            <div key={title} className="rounded-3xl border-2 border-ink bg-white p-8 shadow-[6px_6px_0_var(--color-ink)]">
              <span className={`grid h-14 w-14 rotate-[-6deg] place-items-center rounded-2xl border-2 border-ink ${tint}`}>
                <Icon className="h-7 w-7" />
              </span>
              <h3 className="font-display mt-6 text-2xl font-bold">{title}</h3>
              <p className="mt-2 text-ink/70">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Les plus aimées */}
      <section className="bg-corail/20">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-sm font-semibold tracking-[0.2em] text-ink/60 uppercase">Les plus aimées</p>
              <h2 className="font-display mt-2 text-4xl font-extrabold sm:text-5xl">Par où commencer ?</h2>
            </div>
            <Link href="/saveurs" className="inline-flex items-center gap-2 font-semibold hover:underline">
              Voir les {flavors.length} saveurs <ArrowIcon className="h-5 w-5" />
            </Link>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {favorites.map((f) => (
              <Link
                key={f.id}
                href={`/saveurs#${f.id}`}
                className="group flex items-center gap-6 rounded-3xl p-6 transition hover:-translate-y-1"
                style={{ backgroundColor: `${f.color}26` }}
              >
                <Can
                  {...f}
                  className="h-36 shrink-0 drop-shadow-xl transition duration-500 group-hover:-rotate-6"
                />
                <div>
                  <h3 className="font-display text-2xl font-bold">{f.name}</h3>
                  <p className="text-sm font-medium text-ink/60">{f.tagline}</p>
                  <p className="mt-3 font-semibold">{formatPrice(f.price)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Teaser histoire */}
      <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <div className="grid items-center gap-10 overflow-hidden rounded-[2.5rem] border-2 border-ink bg-electric p-8 text-cream shadow-[8px_8px_0_var(--color-ink)] sm:p-14 md:grid-cols-2">
          <div>
            <p className="text-sm font-semibold tracking-[0.2em] text-citron uppercase">Depuis 2019</p>
            <h2 className="font-display mt-2 text-4xl font-extrabold sm:text-5xl">Né dans une cuisine, pas dans un labo.</h2>
            <p className="mt-4 max-w-md text-cream/85">
              Un voyage au Japon, 47 essais dans une casserole et un premier stand au marché : découvre comment est né
              Pétille.
            </p>
            <Link
              href="/notre-histoire"
              className="mt-8 inline-flex items-center gap-2 btn btn-citron px-7 py-4"
            >
              Lire notre histoire <ArrowIcon className="h-5 w-5" />
            </Link>
          </div>
          <div className="flex items-end justify-center gap-4">
            {["concombre-menthe", "myrtille-lavande", "pasteque-hibiscus"].map((id, i) => {
              const f = pick(id, i);
              return (
                <Can
                  key={id}
                  {...f}
                  className={`drop-shadow-2xl ${i === 1 ? "h-56" : "h-44"}`}
                />
              );
            })}
          </div>
        </div>
      </section>

      <Messages />

      {/* Contact */}
      <section className="mx-auto max-w-3xl px-4 pb-24 text-center sm:px-6">
        <h2 className="font-display text-4xl font-extrabold sm:text-5xl">Une question ? Une envie de bulles ?</h2>
        <p className="mt-4 text-ink/70">Commande pour un événement, revendeur ou simple curiosité : on répond sous 48 heures.</p>
        <Link
          href="/contact"
          className="mt-8 inline-block btn btn-ghost px-7 py-4"
        >
          Nous écrire
        </Link>
      </section>

    </>
  );
}
