"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";
import Can from "@/components/Can";
import { ArrowIcon } from "@/components/Icons";
import { flavorTone } from "@/lib/color";
import { heroFor } from "@/lib/flavor-hero";
import { formatPrice, type Family, type Flavor } from "@/lib/flavors";

type Mood = "acidulee" | "fruitee" | "douce" | "intense";
type Taste = "agrumes" | "rouges" | "jaunes";
type Strength = "legere" | "vive" | "gourmande";
type Profile = { mood: Mood; taste: Taste; strength: Strength };
type Answers = { mood?: Mood; taste?: Taste; strength?: Strength };

const QUESTIONS = [
  {
    key: "mood",
    title: "Quelle ambiance préfères-tu ?",
    options: [
      { id: "acidulee", label: "Acidulée", hint: "Ça pique, ça réveille", emoji: "🍋" },
      { id: "fruitee", label: "Fruitée", hint: "Plein de fruits pressés", emoji: "🍓" },
      { id: "douce", label: "Douce", hint: "Rond et réconfortant", emoji: "🍑" },
      { id: "intense", label: "Intense", hint: "Du caractère, des épices", emoji: "🔥" },
    ],
  },
  {
    key: "taste",
    title: "Quel goût recherches-tu ?",
    options: [
      { id: "agrumes", label: "Agrumes", hint: "Citron, yuzu, zestes", emoji: "🍊" },
      { id: "rouges", label: "Fruits rouges", hint: "Baies, pastèque, framboise", emoji: "🫐" },
      { id: "jaunes", label: "Fruits jaunes", hint: "Pêche, ananas, pomme", emoji: "🍍" },
    ],
  },
  {
    key: "strength",
    title: "Tu préfères une saveur…",
    options: [
      { id: "legere", label: "Légère", hint: "Pour se désaltérer", emoji: "💧" },
      { id: "vive", label: "Vive", hint: "Bulles franches et peps", emoji: "⚡" },
      { id: "gourmande", label: "Gourmande", hint: "Comme un petit dessert", emoji: "🍰" },
    ],
  },
] as const;

// Profil de chaque recette de la gamme ; une saveur ajoutée depuis l'admin reçoit celui de sa famille
const PROFILES: Record<string, Profile> = {
  "citron-yuzu": { mood: "acidulee", taste: "agrumes", strength: "vive" },
  "concombre-menthe": { mood: "acidulee", taste: "agrumes", strength: "legere" },
  "pasteque-hibiscus": { mood: "acidulee", taste: "rouges", strength: "legere" },
  "framboise-basilic": { mood: "fruitee", taste: "rouges", strength: "vive" },
  "myrtille-lavande": { mood: "intense", taste: "rouges", strength: "legere" },
  "peche-gingembre": { mood: "douce", taste: "jaunes", strength: "vive" },
  "ananas-coco": { mood: "douce", taste: "jaunes", strength: "gourmande" },
  "pomme-cannelle": { mood: "douce", taste: "jaunes", strength: "gourmande" },
  "cola-vanille": { mood: "intense", taste: "agrumes", strength: "gourmande" },
};
const FAMILY_PROFILES: Record<Family, Profile> = {
  fraiches: { mood: "acidulee", taste: "agrumes", strength: "legere" },
  fruitees: { mood: "fruitee", taste: "rouges", strength: "vive" },
  gourmandes: { mood: "douce", taste: "jaunes", strength: "gourmande" },
};

const MOOD_TEXT: Record<Mood, string> = {
  acidulee: "tu aimes quand ça pique un peu",
  fruitee: "tu veux croquer dans le fruit",
  douce: "tu cherches la douceur",
  intense: "il te faut du caractère",
};
const STRENGTH_TEXT: Record<Strength, string> = {
  legere: "une gorgée légère qui désaltère",
  vive: "des bulles vives qui réveillent",
  gourmande: "une pause gourmande",
};

// L'ambiance compte le plus, puis le goût et l'intensité ; une saveur épuisée passe après les autres
function recommend(flavors: Flavor[], answers: Required<Answers>) {
  const score = (f: Flavor) => {
    const p = PROFILES[f.id] ?? FAMILY_PROFILES[f.family];
    return (p.mood === answers.mood ? 3 : 0) + (p.taste === answers.taste ? 2 : 0) + (p.strength === answers.strength ? 2 : 0) + (f.stock > 0 ? 10 : 0);
  };
  return flavors.reduce<Flavor | null>((best, f) => (!best || score(f) > score(best) ? f : best), null);
}

export default function MoodQuiz({ flavors }: { flavors: Flavor[] }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const done = step >= QUESTIONS.length;
  const result = done ? recommend(flavors, answers as Required<Answers>) : null;

  const choose = (key: keyof Answers, value: string) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    setStep((s) => s + 1);
  };
  const restart = () => {
    setAnswers({});
    setStep(0);
  };

  return (
    <section id="quiz" className="scroll-mt-20 bg-navy text-cream">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
        <p className="text-sm font-semibold tracking-[0.2em] text-sky uppercase">Le quiz · 30 secondes</p>
        <h2 className="font-display mt-2 text-4xl font-extrabold sm:text-5xl">C&apos;est quoi ton mood Pétille ?</h2>

        <div className="mt-10 overflow-hidden rounded-[2rem] bg-cream text-ink shadow-[0_30px_60px_-30px_rgb(0_0_0/0.6)]">
          {/* Progression */}
          <div className="flex items-center gap-3 px-6 pt-6 sm:px-10 sm:pt-8" aria-hidden>
            {QUESTIONS.map((q, i) => (
              <span key={q.key} className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/10">
                <span className={`block h-full rounded-full bg-electric transition-[width] duration-500 ${i < step ? "w-full" : "w-0"}`} />
              </span>
            ))}
          </div>

          {!done ? (
            <div key={step} className="quiz-step px-6 pt-6 pb-8 sm:px-10 sm:pb-10">
              <p className="text-sm font-semibold text-ink/50">Question {step + 1} sur {QUESTIONS.length}</p>
              <h3 className="font-display mt-1 text-2xl font-bold sm:text-3xl">{QUESTIONS[step].title}</h3>
              <div className={`mt-6 grid gap-3 sm:grid-cols-2 ${QUESTIONS[step].options.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}>
                {QUESTIONS[step].options.map((o) => {
                  const active = answers[QUESTIONS[step].key] === o.id;
                  return (
                    <button
                      key={o.id}
                      onClick={() => choose(QUESTIONS[step].key, o.id)}
                      aria-pressed={active}
                      className={`group flex items-center gap-4 rounded-2xl border-2 p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:border-electric hover:bg-white active:translate-y-0 active:scale-[0.98] ${active ? "border-electric bg-white" : "border-ink/10 bg-white/60"}`}
                    >
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-sky/50 text-2xl transition group-hover:rotate-[-8deg]" aria-hidden>
                        {o.emoji}
                      </span>
                      <span>
                        <span className="block font-display text-lg font-bold">{o.label}</span>
                        <span className="block text-sm text-ink/60">{o.hint}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              {step > 0 && (
                <button onClick={() => setStep((s) => s - 1)} className="mt-6 text-sm font-semibold text-ink/60 underline-offset-4 hover:text-ink hover:underline">
                  ← Question précédente
                </button>
              )}
            </div>
          ) : result ? (
            <Result flavor={result} answers={answers as Required<Answers>} onRestart={restart} />
          ) : (
            <p className="px-10 py-10 text-ink/70">Aucune saveur n&apos;est disponible pour le moment.</p>
          )}
        </div>
      </div>
    </section>
  );
}

function Result({ flavor, answers, onRestart }: { flavor: Flavor; answers: Required<Answers>; onRestart: () => void }) {
  const tone = flavorTone(flavor.color);
  const hero = heroFor(flavor);
  const fruits = hero.fruits.slice(0, 3);

  return (
    <div className="quiz-step grid items-center gap-8 px-6 pt-6 pb-8 sm:px-10 sm:pb-10 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      {/* Canette mise en scène : halo, fruits et ombre douce */}
      <div
        className="relative grid h-80 place-items-center overflow-hidden rounded-[1.75rem] sm:h-96"
        style={{ background: `radial-gradient(60% 55% at 50% 45%, ${hero.background[1]}, ${tone.soft} 75%)` } as CSSProperties}
      >
        {fruits.map((fruit, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={fruit}
            src={`/fruits/${fruit}.png`}
            alt=""
            aria-hidden
            className={`hero-float pointer-events-none absolute w-24 object-contain drop-shadow-lg sm:w-28 ${["top-6 left-4 -rotate-12", "right-4 bottom-10 rotate-12", "top-10 right-8 w-16 sm:w-20"][i]}`}
            style={{ "--duration": `${6 + i}s`, "--float-delay": `${-i}s` } as CSSProperties}
          />
        ))}
        <span className="absolute bottom-10 h-5 w-32 rounded-[50%] bg-ink/25 blur-md" aria-hidden />
        <Can {...flavor} className="quiz-can relative h-64 rotate-[-6deg] sm:h-80" />
      </div>

      <div>
        <p className="text-sm font-semibold tracking-[0.2em] text-ink/50 uppercase">Ton mood Pétille</p>
        <h3 className="font-display mt-1 text-4xl font-extrabold sm:text-5xl" style={{ color: hero.ink }}>
          {flavor.name}
        </h3>
        <p className="mt-1 font-semibold text-ink/60">{flavor.tagline} · {formatPrice(flavor.price)}</p>
        <p className="mt-5 text-lg leading-relaxed text-ink/80">
          {MOOD_TEXT[answers.mood].charAt(0).toUpperCase() + MOOD_TEXT[answers.mood].slice(1)} et tu cherches {STRENGTH_TEXT[answers.strength]} :{" "}
          {flavor.name} est faite pour toi. {flavor.description}
        </p>
        <p className="mt-3 text-sm text-ink/60">{flavor.sugar} g de sucre pour 100 ml · {flavor.kcal} kcal</p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href={`/saveurs#${flavor.id}`} className="btn btn-primary px-7 py-3.5">
            Découvrir ma saveur <ArrowIcon className="h-5 w-5" />
          </Link>
          <button onClick={onRestart} className="rounded-full px-5 py-3 font-semibold text-ink/70 transition hover:bg-ink/5 hover:text-ink">
            Refaire le quiz
          </button>
        </div>
      </div>
    </div>
  );
}
