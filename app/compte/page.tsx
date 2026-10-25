import Link from "next/link";
import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import ProfileForm from "@/components/ProfileForm";
import StatusBadge from "@/components/StatusBadge";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "Mon compte" };

export default async function AccountPage() {
  const user = await requireUser("/compte");
  const supabase = await createClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("id, created_at, status, total_cents, order_items(quantity)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const cans = (orders ?? []).flatMap((o) => o.order_items).reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      <PageHero eyebrow="Mon compte" title={`Salut ${user.profile?.full_name?.split(" ")[0] ?? ""} !`}>
        {cans > 0 ? `${cans} canette${cans > 1 ? "s" : ""} commandée${cans > 1 ? "s" : ""} depuis ton inscription.` : "Ta première canette t'attend."}
      </PageHero>

      <section className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 md:grid-cols-5">
        <div className="md:col-span-3">
          <h2 className="font-display text-3xl font-extrabold">Mes commandes</h2>
          {!orders?.length ? (
            <div className="mt-6 rounded-3xl bg-white p-8 ring-1 ring-ink/5">
              <p className="text-ink/60">Aucune commande pour l&apos;instant.</p>
              <Link href="/saveurs" className="mt-4 inline-block btn btn-primary px-6 py-3">
                Découvrir les saveurs
              </Link>
            </div>
          ) : (
            <ul className="mt-6 space-y-3">
              {orders.map((order) => {
                const count = order.order_items.reduce((sum, item) => sum + item.quantity, 0);
                return (
                  <li key={order.id}>
                    <Link href={`/compte/commandes/${order.id}`}
                      className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl bg-white p-5 ring-1 ring-ink/5 transition hover:-translate-y-0.5 hover:ring-ink/30">
                      <span className="font-display text-xl font-bold">N° {order.id}</span>
                      <span className="text-sm text-ink/60">{formatDate(order.created_at)}</span>
                      <span className="text-sm text-ink/60">{count} canette{count > 1 ? "s" : ""}</span>
                      <StatusBadge status={order.status} />
                      <span className="ml-auto font-semibold">{formatPrice(order.total_cents)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <aside className="md:col-span-2">
          <div className="rounded-3xl bg-white p-8 ring-1 ring-ink/5">
            <h2 className="font-display text-2xl font-bold">Mon profil</h2>
            <p className="mt-1 mb-6 text-sm text-ink/60">{user.email}</p>
            <ProfileForm fullName={user.profile?.full_name ?? ""} />
          </div>
        </aside>
      </section>
    </>
  );
}
