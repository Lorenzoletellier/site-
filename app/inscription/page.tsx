import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";
import PageHero from "@/components/PageHero";

export const metadata: Metadata = { title: "Créer un compte" };

export default async function Page({ searchParams }: PageProps<"/inscription">) {
  const { next } = await searchParams;
  const nextPath = typeof next === "string" && next.startsWith("/") ? next : "/compte";

  return (
    <>
      <PageHero eyebrow="Créer un compte" title="Rejoins la bulle.">Ton panier est sauvegardé et ton historique de commandes conservé.</PageHero>
      <section className="mx-auto max-w-md px-4 py-16 sm:px-6">
        <AuthForm mode="signup" next={nextPath} />
      </section>
    </>
  );
}
