import type { Metadata } from "next";
import BlueHero from "@/components/BlueHero";
import { ContactForm, NewsletterForm } from "@/components/ContactForms";
import { getFlavors } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Contact",
  description: "Écris à l'équipe Pétille ou inscris-toi à la newsletter.",
};

const faq = [
  ["Où trouver vos canettes ?", "Sur ce site, dans une sélection d'épiceries fines et sur les marchés où nous sommes présents chaque week-end."],
  ["Livrez-vous les entreprises et les événements ?", "Oui, à partir de 48 canettes. Indique la date et le nombre de personnes dans ton message."],
  ["Vos sodas conviennent-ils aux enfants ?", "Oui : aucune caféine, sauf le Cola Vanille qui contient un peu de noix de kola. Tous sont peu sucrés."],
];

export default async function ContactPage() {
  const flavors = await getFlavors();
  const flavor = flavors.find((f) => f.id === "framboise-basilic") ?? flavors[0];

  return (
    <>
      <BlueHero eyebrow="Contact" title="Une question ? Une envie de bulles ?" flavor={flavor}>
        On répond à tous les messages, en général sous 48 heures.
      </BlueHero>

      <section className="mx-auto grid max-w-6xl gap-12 px-4 pt-40 pb-24 sm:px-6 sm:pt-48 md:grid-cols-5">
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
