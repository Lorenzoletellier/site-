import Link from "next/link";
import type { Metadata } from "next";
import BlueHero from "@/components/BlueHero";
import { ArrowIcon } from "@/components/Icons";
import ProfileForm from "@/components/ProfileForm";
import StatusBadge from "@/components/StatusBadge";
import { requireUser } from "@/lib/auth";
import { signOut } from "@/lib/auth-actions";
import { getFlavors } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "Mon compte" };

export default async function AccountPage() {
  const user = await requireUser("/compte");
  const supabase = await createClient();
  const [{ data: orders }, flavors] = await Promise.all([
    supabase
      .from("orders")
      .select("id, created_at, status, total_cents, order_items(product_id, quantity)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    getFlavors(),
  ]);

  const items = (orders ?? []).flatMap((o) => o.order_items);
  const cans = items.reduce((sum, item) => sum + item.quantity, 0);
  const spent = (orders ?? []).filter((o) => o.status !== "cancelled").reduce((sum, o) => sum + o.total_cents, 0);

  // Canette du bandeau : la saveur la plus commandée, sinon Citron Yuzu
  const perProduct = new Map<number, number>();
  items.forEach((item) => item.product_id && perProduct.set(item.product_id, (perProduct.get(item.product_id) ?? 0) + item.quantity));
  const favoriteId = [...perProduct].sort((a, b) => b[1] - a[1])[0]?.[0];
  const favorite = flavors.find((f) => f.productId === favoriteId);
  const heroFlavor = favorite ?? flavors.find((f) => f.id === "citron-yuzu") ?? flavors[0];
  const rawFirstName = user.profile?.full_name?.trim().split(" ")[0];
  const firstName = rawFirstName ? rawFirstName.charAt(0).toUpperCase() + rawFirstName.slice(1) : null;

  const stats = [
    { label: "Commandes", value: String(orders?.length ?? 0) },
    { label: "Canettes", value: String(cans) },
    { label: "Dépensé", value: formatPrice(spent) },
    { label: "Ta préférée", value: favorite?.name ?? "À découvrir" },
  ];

  return (
    <>
      <BlueHero eyebrow="Mon compte" title={firstName ? `Salut ${firstName} !` : "Salut !"} flavor={heroFlavor} overflow={false}>
        {cans > 0
          ? `${cans} canette${cans > 1 ? "s" : ""} commandée${cans > 1 ? "s" : ""} depuis ton inscription.`
          : "Ta première canette t'attend."}
      </BlueHero>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        {/* Chiffres clés du compte */}
        <dl className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <div key={stat.label} className={`rounded-3xl p-5 sm:p-6 ${i === 0 ? "bg-electric text-cream" : "bg-white ring-1 ring-ink/5"}`}>
              <dt className={`text-xs font-semibold tracking-[0.2em] uppercase ${i === 0 ? "text-cream/70" : "text-ink/55"}`}>{stat.label}</dt>
              <dd className="font-display mt-2 truncate text-2xl font-extrabold tabular-nums sm:text-3xl">{stat.value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-12 grid gap-10 md:grid-cols-5">
          <div className="md:col-span-3">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="font-display text-3xl font-extrabold">Mes commandes</h2>
              {!!orders?.length && <span className="text-sm text-ink/55">{orders.length} au total</span>}
            </div>
            {!orders?.length ? (
              <div className="mt-6 rounded-3xl border-2 border-dashed border-ink/15 bg-white/60 p-8">
                <p className="font-display text-xl font-bold">Aucune commande pour l&apos;instant.</p>
                <p className="mt-1 text-ink/60">Neuf saveurs t&apos;attendent, toutes peu sucrées.</p>
                <Link href="/saveurs" className="btn btn-primary mt-6 px-6 py-3">
                  Découvrir les saveurs <ArrowIcon className="h-5 w-5" />
                </Link>
              </div>
            ) : (
              <ul className="mt-6 space-y-3">
                {orders.map((order) => {
                  const count = order.order_items.reduce((sum, item) => sum + item.quantity, 0);
                  return (
                    <li key={order.id}>
                      <Link
                        href={`/compte/commandes/${order.id}`}
                        className="group flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl bg-white p-5 ring-1 ring-ink/5 transition hover:-translate-y-0.5 hover:shadow-[0_18px_30px_-22px_rgb(12_12_20/0.4)] hover:ring-ink/20"
                      >
                        <span className="font-display text-xl font-bold">N° {order.id}</span>
                        <span className="text-sm text-ink/60">{formatDate(order.created_at)}</span>
                        <span className="text-sm text-ink/60">{count} canette{count > 1 ? "s" : ""}</span>
                        <StatusBadge status={order.status} />
                        <span className="ml-auto flex items-center gap-2 font-semibold tabular-nums">
                          {formatPrice(order.total_cents)}
                          <ArrowIcon className="h-4 w-4 text-ink/40 transition group-hover:translate-x-0.5 group-hover:text-ink" />
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <aside className="space-y-4 md:col-span-2">
            <div className="rounded-3xl bg-white p-7 ring-1 ring-ink/5">
              <h2 className="font-display text-2xl font-bold">Mon profil</h2>
              <p className="mt-1 mb-6 text-sm text-ink/60">{user.email}</p>
              <ProfileForm fullName={user.profile?.full_name ?? ""} />
            </div>
            <div className="flex flex-wrap gap-3 rounded-3xl bg-sky/40 p-5">
              {user.profile?.role === "admin" && (
                <Link href="/admin" className="btn btn-primary px-5 py-2.5 text-sm">
                  Espace admin <ArrowIcon className="h-4 w-4" />
                </Link>
              )}
              <form action={signOut}>
                <button className="rounded-full border-2 border-ink/15 bg-white/80 px-5 py-2.5 text-sm font-semibold transition hover:border-ink/40">
                  Se déconnecter
                </button>
              </form>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
