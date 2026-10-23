import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";
import PageHero from "@/components/PageHero";

export const metadata: Metadata = { title: "Connexion" };

export default async function Page({ searchParams }: PageProps<"/connexion">) {
  const { next } = await searchParams;
  const nextPath = typeof next === "string" && next.startsWith("/") ? next : "/compte";

  return (
    <>
      <PageHero eyebrow="Connexion" title="Content de te revoir.">Ton panier et tes commandes t&apos;attendent.</PageHero>
      <section className="mx-auto max-w-md px-4 py-16 sm:px-6">
        <AuthForm mode="signin" next={nextPath} />
      </section>
    </>
  );
}
