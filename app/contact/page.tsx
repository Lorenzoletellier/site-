import type { Metadata } from "next";
import { ContactForm, NewsletterForm } from "@/components/ContactForms";

export const metadata: Metadata = {
  title: "Contact",
  description: "Écris à l'équipe Pétille ou inscris-toi à la newsletter.",
};

const faq = [
  ["Où trouver vos canettes ?", "Sur ce site, dans une sélection d'épiceries fines et sur les marchés où nous sommes présents chaque week-end."],
  ["Livrez-vous les entreprises et les événements ?", "Oui, à partir de 48 canettes. Indique la date et le nombre de personnes dans ton message."],
  ["Vos sodas conviennent-ils aux enfants ?", "Oui : aucune caféine, sauf le Cola Vanille qui contient un peu de noix de kola. Tous sont peu sucrés."],
];

export default function ContactPage() {
  return (
    <>
      <div className="bg-electric text-cream">
        <div className="mx-auto max-w-6xl px-4 pt-8 pb-20 sm:px-6">
          <p className="text-sm font-semibold tracking-[0.2em] text-sky uppercase">Contact</p>
          <h1 className="font-display mt-2 max-w-2xl text-5xl leading-[0.95] font-extrabold sm:text-6xl">
            Une question ? Une envie de bulles ?
          </h1>
          <p className="mt-6 max-w-xl text-lg text-cream/85">
            On répond à tous les messages, en général sous 48 heures.
          </p>
        </div>
      </div>

      <section className="mx-auto grid max-w-6xl gap-12 px-4 py-24 sm:px-6 md:grid-cols-5">
        <ContactForm />

        <aside className="space-y-8 md:col-span-2">
          <div className="rounded-3xl bg-ink p-8 text-cream">
            <h2 className="font-display text-2xl font-bold">Reste dans la bulle.</h2>
            <p className="mt-2 text-cream/70">Nouvelles saveurs, éditions limitées et offres en avant-première.</p>
            <NewsletterForm />
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold">Questions fréquentes</h2>
            <div className="mt-4 divide-y divide-ink/10">
              {faq.map(([q, a]) => (
                <details key={q} className="group py-4">
                  <summary className="cursor-pointer font-semibold">{q}</summary>
                  <p className="mt-2 text-ink/70">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </aside>
      </section>

    </>
  );
}
