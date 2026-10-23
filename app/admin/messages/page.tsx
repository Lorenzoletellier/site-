import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { markContactHandled, toggleWallMessage } from "@/lib/admin-actions";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Messages" };

const SUBJECT_LABELS: Record<string, string> = {
  saveur: "Question sur une saveur",
  commande: "Commande",
  evenement: "Événement / entreprise",
  revendeur: "Revendeur",
  autre: "Autre",
};

export default async function AdminMessagesPage() {
  const supabase = await createClient();
  const [{ data: contacts }, { data: wall }, { count: subscribers }] = await Promise.all([
    supabase.from("contact_messages").select("*").order("is_handled").order("created_at", { ascending: false }).limit(50),
    supabase.from("wall_messages").select("*").order("created_at", { ascending: false }).limit(50),
    supabase.from("newsletter_subscribers").select("email", { count: "exact", head: true }),
  ]);

  return (
    <div className="grid gap-12 lg:grid-cols-5">
      <section className="lg:col-span-3">
        <h1 className="font-display text-4xl font-extrabold">Formulaire de contact</h1>
        <p className="mt-2 text-ink/60">{subscribers ?? 0} inscrits à la newsletter.</p>
        {!contacts?.length ? (
          <p className="mt-6 rounded-3xl bg-white p-8 text-ink/60 ring-1 ring-ink/5">Aucun message reçu.</p>
        ) : (
          <ul className="mt-6 space-y-3">
            {contacts.map((c) => (
              <li key={c.id} className={`rounded-3xl p-6 ${c.is_handled ? "bg-white/60 opacity-60" : "bg-white ring-1 ring-ink/5"}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold">{c.first_name} <span className="font-normal text-ink/60">· {c.email}</span></p>
                  <p className="text-xs text-ink/50">{formatDate(c.created_at)}</p>
                </div>
                <p className="mt-1 text-xs font-semibold tracking-[0.15em] text-ink/50 uppercase">{SUBJECT_LABELS[c.subject] ?? c.subject}</p>
                <p className="mt-3 whitespace-pre-line">{c.message}</p>
                {!c.is_handled && (
                  <form action={markContactHandled} className="mt-4">
                    <input type="hidden" name="id" value={c.id} />
                    <button className="rounded-full bg-ink px-4 py-2 text-xs font-semibold text-cream">Marquer comme traité</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="lg:col-span-2">
        <h2 className="font-display text-4xl font-extrabold">Mur des bulles</h2>
        <p className="mt-2 text-ink/60">Masque un message déplacé : il disparaît de l&apos;accueil.</p>
        <ul className="mt-6 space-y-3">
          {(wall ?? []).map((m) => (
            <li key={m.id} className={`rounded-2xl p-4 ${m.is_hidden ? "bg-ink/5 opacity-60" : "bg-white ring-1 ring-ink/5"}`}>
              <p className="whitespace-pre-line">{m.content}</p>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-xs text-ink/50">{formatDate(m.created_at)}</p>
                <form action={toggleWallMessage}>
                  <input type="hidden" name="id" value={m.id} />
                  <input type="hidden" name="is_hidden" value={String(m.is_hidden)} />
                  <button className="text-xs font-semibold underline">{m.is_hidden ? "Réafficher" : "Masquer"}</button>
                </form>
              </div>
            </li>
          ))}
          {!wall?.length && <li className="text-sm text-ink/50">Aucun message sur le mur.</li>}
        </ul>
      </section>
    </div>
  );
}
