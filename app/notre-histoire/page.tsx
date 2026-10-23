import type { Metadata } from "next";
import Link from "next/link";
import Can from "@/components/Can";
import { getFlavors } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Notre histoire",
  description: "Comment une recette de soda née dans une cuisine est devenue Pétille.",
};


const timeline = [
  {
    year: "2019",
    title: "Un voyage, un fruit",
    text: "Tout commence au Japon, devant un étal de yuzus. Cet agrume acidulé et floral donne une idée simple : et si on faisait un soda qui a vraiment le goût des fruits ?",
    flavor: "citron-yuzu",
  },
  {
    year: "2020",
    title: "La cuisine devient un labo",
    text: "Une casserole, des bouteilles qui débordent et 47 essais. La recette Citron Yuzu est enfin prête : deux fois moins sucrée qu'un soda classique, sans arôme artificiel.",
    flavor: "citron-yuzu",
  },
  {
    year: "2021",
    title: "Le premier marché",
    text: "Un stand, une glacière et 200 canettes vendues en un week-end. Un soir d'été, entre deux étals, naît le duo Framboise Basilic.",
    flavor: "framboise-basilic",
  },
  {
    year: "2022",
    title: "Le choix de la canette",
    text: "Plutôt que le verre ou le plastique, on choisit l'aluminium : léger à transporter, il protège les arômes de la lumière et se recycle à l'infini.",
    flavor: "pasteque-hibiscus",
  },
  {
    year: "2023",
    title: "Des producteurs partenaires",
    text: "Pêches de la vallée du Rhône, lavande de Provence, pommes de Normandie : chaque fruit vient d'un producteur que l'on connaît par son prénom.",
    flavor: "peche-gingembre",
  },
  {
    year: "2024",
    title: "Notre petite brasserie",
    text: "On quitte la cuisine pour un vrai atelier en France. Les recettes ne changent pas : on presse, on infuse et on met en canette nous-mêmes.",
    flavor: "myrtille-lavande",
  },
  {
    year: "2026",
    title: "Neuf saveurs, la même envie",
    text: "La gamme compte aujourd'hui neuf recettes, du Cola Vanille à l'Ananas Coco. La règle reste la même qu'au premier jour : de vrais fruits, peu de sucre, beaucoup de caractère.",
    flavor: "cola-vanille",
  },
];

const steps = [
  ["01", "Choisir les fruits", "Bio, de saison, auprès de producteurs partenaires."],
  ["02", "Presser et infuser", "Les fruits sont pressés à froid, les plantes infusées doucement."],
  ["03", "Faire pétiller", "On ajoute l'eau gazéifiée et à peine de sucre de canne."],
  ["04", "Mettre en canette", "Remplie et scellée à l'atelier, prête pour ta glacière."],
];

const stats = [
  ["4 g", "de sucre pour 100 ml, en moyenne. Deux fois moins qu'un soda classique."],
  ["100 %", "des fruits issus de l'agriculture biologique et de producteurs partenaires."],
  ["∞", "L'aluminium de nos canettes se recycle à l'infini. Trie-la, elle reviendra."],
];

export default async function NotreHistoirePage() {
  const flavors = await getFlavors();
  const byId = Object.fromEntries(flavors.map((f) => [f.id, f]));
  const pick = (id: string) => byId[id] ?? flavors[0];

  return (
    <>
      {/* Intro */}
      <section className="bg-sun">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-8 pb-24 sm:px-6 md:grid-cols-2">
          <div>
            <p className="text-sm font-semibold tracking-[0.2em] text-ink/60 uppercase">Notre histoire</p>
            <h1 className="font-display mt-2 text-5xl leading-[0.95] font-extrabold sm:text-7xl">
              Né dans une cuisine, pas dans un labo.
            </h1>
            <p className="mt-6 max-w-md text-lg text-ink/80">
              Pétille, c&apos;est l&apos;histoire de deux amis qui trouvaient les sodas trop sucrés et pas assez
              savoureux. Alors ils ont fait les leurs, une casserole à la fois.
            </p>
          </div>
          <div className="relative flex h-80 items-end justify-center sm:h-96">
            <span className="absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/40 blur-2xl" />
            <Can {...pick("citron-yuzu")} className="float relative h-72 drop-shadow-2xl sm:h-96" />
          </div>
        </div>
      </section>

      {/* Frise */}
      <section className="mx-auto max-w-5xl px-4 py-24 sm:px-6">
        <p className="text-sm font-semibold tracking-[0.2em] text-ink/60 uppercase">De 2019 à aujourd&apos;hui</p>
        <h2 className="font-display mt-2 text-4xl font-extrabold sm:text-5xl">Sept moments qui ont tout changé.</h2>

        <ol className="relative mt-16 space-y-16 before:absolute before:top-0 before:bottom-0 before:left-6 before:w-0.5 before:bg-ink/15 md:before:left-1/2">
          {timeline.map((step, i) => {
            const f = pick(step.flavor);
            const left = i % 2 === 0;
            return (
              <li key={step.year} className="relative grid items-center gap-6 pl-16 md:grid-cols-2 md:gap-16 md:pl-0">
                <span
                  className="absolute top-2 left-6 h-5 w-5 -translate-x-1/2 rounded-full border-4 border-cream md:top-1/2 md:left-1/2 md:-translate-y-1/2"
                  style={{ backgroundColor: f.color }}
                />
                <div className={left ? "md:text-right" : "md:order-2"}>
                  <p className="font-display text-5xl font-extrabold" style={{ color: f.color }}>
                    {step.year}
                  </p>
                  <h3 className="font-display mt-2 text-2xl font-bold">{step.title}</h3>
                  <p className="mt-3 text-ink/75">{step.text}</p>
                </div>
                <div
                  className={`flex h-48 items-center justify-center rounded-3xl ${left ? "" : "md:order-1"}`}
                  style={{ backgroundColor: `${f.color}22` }}
                >
                  <Can
                    name={f.name}
                    color={f.color}
                    accent={f.accent}
                    secondary={f.secondary}
                    pattern={f.pattern}
                    className={`h-40 drop-shadow-xl ${left ? "rotate-6" : "-rotate-6"}`}
                  />
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Fabrication */}
      <section className="bg-sun/40">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <p className="text-sm font-semibold tracking-[0.2em] text-ink/60 uppercase">Notre méthode</p>
          <h2 className="font-display mt-2 text-4xl font-extrabold sm:text-5xl">Comment naît une canette.</h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(([n, title, text]) => (
              <div key={n} className="rounded-3xl bg-cream p-6">
                <p className="font-display text-4xl font-extrabold text-ink/20">{n}</p>
                <h3 className="font-display mt-4 text-xl font-bold">{title}</h3>
                <p className="mt-2 text-ink/70">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Engagements */}
      <section className="bg-ink text-cream">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-24 sm:px-6 md:grid-cols-3">
          <div className="md:col-span-3">
            <p className="text-sm font-semibold tracking-[0.2em] text-cream/60 uppercase">Nos engagements</p>
            <h2 className="font-display mt-2 text-4xl font-extrabold">Ce qui ne changera jamais.</h2>
          </div>
          {stats.map(([stat, text]) => (
            <div key={stat} className="border-t border-cream/20 pt-6">
              <p className="font-display text-6xl font-extrabold text-sun">{stat}</p>
              <p className="mt-4 text-cream/80">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Appel à l'action */}
      <section className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
        <h2 className="font-display text-4xl font-extrabold sm:text-5xl">La suite s&apos;écrit avec toi.</h2>
        <p className="mt-4 text-ink/70">Goûte nos neuf recettes et dis-nous laquelle doit devenir la dixième.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link href="/saveurs" className="rounded-full bg-ink px-7 py-4 font-semibold text-cream transition hover:scale-105">
            Découvrir les saveurs
          </Link>
          <Link href="/contact" className="rounded-full border-2 border-ink px-7 py-4 font-semibold transition hover:bg-ink hover:text-cream">
            Nous écrire
          </Link>
        </div>
      </section>

    </>
  );
}
