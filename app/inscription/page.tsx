import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";
import BlueHero from "@/components/BlueHero";
import { getFlavors } from "@/lib/queries";

export const metadata: Metadata = { title: "Créer un compte" };

export default async function Page({ searchParams }: PageProps<"/inscription">) {
  const { next } = await searchParams;
  const nextPath = typeof next === "string" && next.startsWith("/") ? next : "/compte";
  const flavors = await getFlavors();
  const flavor = flavors.find((f) => f.id === "pasteque-hibiscus") ?? flavors[0];

  return (
    <>
      <BlueHero eyebrow="Créer un compte" title="Rejoins la bulle." flavor={flavor} overflow={false}>
        Ton panier est sauvegardé et ton historique de commandes conservé.
      </BlueHero>
      <section className="mx-auto max-w-md px-4 py-16 sm:px-6">
        <AuthForm mode="signup" next={nextPath} />
      </section>
    </>
  );
}
