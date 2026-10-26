import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";
import BlueHero from "@/components/BlueHero";
import { getFlavors } from "@/lib/queries";

export const metadata: Metadata = { title: "Connexion" };

export default async function Page({ searchParams }: PageProps<"/connexion">) {
  const { next, confirmation } = await searchParams;
  const nextPath = typeof next === "string" && next.startsWith("/") ? next : "/compte";
  const flavors = await getFlavors();
  const flavor = flavors.find((f) => f.id === "peche-gingembre") ?? flavors[0];

  return (
    <>
      <BlueHero eyebrow="Connexion" title="Content de te revoir." flavor={flavor} overflow={false}>
        Ton panier et tes commandes t&apos;attendent.
      </BlueHero>
      <section className="mx-auto max-w-md px-4 py-16 sm:px-6">
        {confirmation === "echec" && (
          <p role="status" className="mb-6 rounded-2xl bg-sky/40 p-4 text-sm font-semibold text-navy">
            Le lien de confirmation a expiré ou a été ouvert dans un autre navigateur. Essaie de te connecter : si ton
            e-mail est confirmé, ça marchera.
          </p>
        )}
        <AuthForm mode="signin" next={nextPath} />
      </section>
    </>
  );
}
