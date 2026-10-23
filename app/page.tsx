import Link from "next/link";
import Can from "@/components/Can";
import Messages from "@/components/Messages";
import { ArrowIcon, DropIcon, LeafIcon, RecycleIcon } from "@/components/Icons";
import { getFlavors } from "@/lib/queries";
import { formatPrice } from "@/lib/flavors";


const reasons = [
  { Icon: DropIcon, title: "Deux fois moins sucré", text: "4 g de sucre pour 100 ml en moyenne, contre 10 g dans un soda classique." },
  { Icon: LeafIcon, title: "De vrais fruits bio", text: "Des fruits pressés et des plantes infusées, sans arôme artificiel ni colorant." },
  { Icon: RecycleIcon, title: "Une canette qui revient", text: "L'aluminium se recycle à l'infini. Trie-la, elle redevient une canette." },
];

export default async function Home() {
  // Les saveurs viennent de la base : une saveur ajoutée par l'admin apparaît ici
  const flavors = await getFlavors();
  const byId = Object.fromEntries(flavors.map((f) => [f.id, f]));
  const pick = (id: string, index: number) => byId[id] ?? flavors[index % flavors.length];
  const [lemon, raspberry, peach] = [pick("citron-yuzu", 0), pick("framboise-basilic", 1), pick("peche-gingembre", 2)];
  const favorites = ["citron-yuzu", "framboise-basilic", "cola-vanille"].map((id, i) => pick(id, i));

  return (
    <>

      {/* Hero */}
      <section className="relative overflow-hidden bg-sun">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-12 pb-20 sm:px-6 md:grid-cols-2 md:pt-16">
          <div>
            <p className="inline-block rounded-full bg-ink px-4 py-1 text-xs font-semibold tracking-widest text-cream uppercase">
              Nouveau · Gamme 2026
            </p>
            <h1 className="font-display mt-6 text-5xl leading-[0.95] font-extrabold sm:text-7xl">
              Des bulles qui ont du caractère.
            </h1>
            <p className="mt-6 max-w-md text-lg text-ink/80">
              Pétille, ce sont neuf sodas artisanaux bio et peu sucrés, faits en France avec de vrais fruits. Ouvre,
              écoute le <em>pschitt</em>, savoure.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/saveurs"
                className="inline-flex items-center gap-2 rounded-full bg-ink px-7 py-4 font-semibold text-cream transition hover:scale-105"
              >
                Découvrir les saveurs <ArrowIcon className="h-5 w-5" />
              </Link>
              <Link
                href="/notre-histoire"
                className="rounded-full border-2 border-ink px-7 py-4 font-semibold transition hover:bg-ink hover:text-cream"
              >
                Notre histoire
              </Link>
            </div>
          </div>

          <div className="relative flex h-72 items-end justify-center sm:h-[28rem]">
            <span className="absolute top-1/2 left-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/40 blur-2xl" />
            <Can {...raspberry} className="float-slow relative -mr-10 h-52 -rotate-12 drop-shadow-2xl sm:h-80" />
            <Can {...lemon} className="float relative z-10 h-64 drop-shadow-2xl sm:h-96" />
            <Can {...peach} className="float-slow relative -ml-10 h-52 rotate-12 drop-shadow-2xl sm:h-80" />
          </div>
        </div>

        <div className="overflow-hidden border-y-2 border-ink bg-ink py-3 text-cream">
          <div className="marquee flex w-max gap-10 font-display text-xl font-bold whitespace-nowrap">
            {Array.from({ length: 2 }).flatMap((_, k) =>
              ["BIO", "PEU SUCRÉ", "VRAIS FRUITS", "FABRIQUÉ EN FRANCE", "100 % RECYCLABLE", "SANS ARÔMES ARTIFICIELS"].map((t) => (
                <span key={`${k}-${t}`}>✦ {t}</span>
              )),
            )}
          </div>
        </div>
      </section>

      {/* Pourquoi Pétille */}
      <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <p className="text-sm font-semibold tracking-[0.2em] text-ink/60 uppercase">Pourquoi Pétille ?</p>
        <h2 className="font-display mt-2 max-w-2xl text-4xl font-extrabold sm:text-5xl">
          Tout le plaisir d&apos;un soda, sans ce qu&apos;on n&apos;aime pas.
        </h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {reasons.map(({ Icon, title, text }) => (
            <div key={title} className="rounded-3xl bg-white p-8 shadow-[0_1px_0_rgba(0,0,0,0.04)] ring-1 ring-ink/5">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-sun">
                <Icon className="h-7 w-7" />
              </span>
              <h3 className="font-display mt-6 text-2xl font-bold">{title}</h3>
              <p className="mt-2 text-ink/70">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Les plus aimées */}
      <section className="bg-sun/30">
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
        <div className="grid items-center gap-10 overflow-hidden rounded-[2.5rem] bg-ink p-8 text-cream sm:p-14 md:grid-cols-2">
          <div>
            <p className="text-sm font-semibold tracking-[0.2em] text-cream/50 uppercase">Depuis 2019</p>
            <h2 className="font-display mt-2 text-4xl font-extrabold sm:text-5xl">Né dans une cuisine, pas dans un labo.</h2>
            <p className="mt-4 max-w-md text-cream/70">
              Un voyage au Japon, 47 essais dans une casserole et un premier stand au marché : découvre comment est né
              Pétille.
            </p>
            <Link
              href="/notre-histoire"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-sun px-7 py-4 font-semibold text-ink transition hover:scale-105"
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
          className="mt-8 inline-block rounded-full border-2 border-ink px-7 py-4 font-semibold transition hover:bg-ink hover:text-cream"
        >
          Nous écrire
        </Link>
      </section>

    </>
  );
}
