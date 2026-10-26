import Link from "next/link";
import type { Metadata } from "next";
import { RankBars, RevenueChart } from "@/components/admin/Charts";
import { createClient } from "@/lib/supabase/server";
import { flavorTone } from "@/lib/color";
import { formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "Tableau de bord" };

// Organisé autour des questions d'un gérant : ça vend ? -> quoi ? -> qu'est-ce qui demande une action ?
export default async function AdminDashboard() {
  const supabase = await createClient();
  const [overview, daily, top, categories, views, lowStock, toShip, products] = await Promise.all([
    supabase.from("kpi_overview").select("*").single(),
    supabase.from("kpi_daily_revenue").select("*"),
    supabase.from("kpi_top_products").select("*").limit(5),
    supabase.from("kpi_category_sales").select("*"),
    supabase.from("kpi_product_views").select("*").limit(6),
    supabase.from("kpi_low_stock").select("*"),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "paid"),
    supabase.from("products").select("id, color"),
  ]);

  const kpi = overview.data;
  const colorById = new Map((products.data ?? []).map((p) => [p.id, p.color]));
  const points = (daily.data ?? []).map((d) => ({ day: d.day ?? "", revenue: d.revenue_cents ?? 0, orders: d.order_count ?? 0 }));

  const tiles = [
    { label: "Chiffre d'affaires", value: formatPrice(kpi?.revenue_cents ?? 0), hint: `${formatPrice(kpi?.revenue_30d_cents ?? 0)} sur 30 jours` },
    { label: "Commandes", value: String(kpi?.order_count ?? 0), hint: `${kpi?.orders_30d ?? 0} sur 30 jours` },
    { label: "Panier moyen", value: formatPrice(kpi?.avg_order_cents ?? 0), hint: `${kpi?.cans_sold ?? 0} canettes vendues` },
    { label: "Clients", value: String(kpi?.customer_count ?? 0), hint: `+${kpi?.new_customers_30d ?? 0} ce mois · ${kpi?.buyer_count ?? 0} acheteurs` },
  ];

  return (
    <div className="space-y-16">
      <section>
        <p className="text-sm font-semibold tracking-[0.2em] text-ink/60 uppercase">Ventes</p>
        <h1 className="font-display mt-2 text-4xl font-extrabold">Ça pétille ?</h1>
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {tiles.map((tile, i) => (
            <div key={tile.label} className={`rounded-3xl p-6 ${i === 0 ? "bg-electric text-cream" : "bg-white ring-1 ring-ink/5"}`}>
              <p className={`text-xs font-semibold tracking-[0.2em] uppercase ${i === 0 ? "text-cream/70" : "text-ink/60"}`}>{tile.label}</p>
              <p className="font-display mt-3 text-3xl font-extrabold tabular-nums">{tile.value}</p>
              <p className={`mt-1 text-xs ${i === 0 ? "text-cream/70" : "text-ink/60"}`}>{tile.hint}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-3xl bg-white p-6 ring-1 ring-ink/5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-xl font-bold">Chiffre d&apos;affaires par jour</h2>
            <p className="text-xs text-ink/60">30 derniers jours · aujourd&apos;hui en noir</p>
          </div>
          <div className="mt-4"><RevenueChart points={points} /></div>
        </div>
      </section>

      <section>
        <p className="text-sm font-semibold tracking-[0.2em] text-ink/60 uppercase">Produits</p>
        <h2 className="font-display mt-2 text-4xl font-extrabold">Qu&apos;est-ce qui se boit ?</h2>
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <div className="rounded-3xl bg-white p-6 ring-1 ring-ink/5">
            <h3 className="font-display mb-4 text-xl font-bold">Top 5 saveurs</h3>
            <RankBars items={(top.data ?? []).map((p) => ({
              label: p.product_name ?? "", value: p.units_sold ?? 0,
              display: `${p.units_sold} · ${formatPrice(p.revenue_cents ?? 0)}`, color: flavorTone(colorById.get(p.product_id ?? 0) ?? "").muted,
            }))} />
          </div>
          <div className="rounded-3xl bg-white p-6 ring-1 ring-ink/5">
            <h3 className="font-display mb-4 text-xl font-bold">CA par famille</h3>
            <RankBars items={(categories.data ?? []).map((c) => ({
              label: c.category_name ?? "", value: c.revenue_cents ?? 0, display: formatPrice(c.revenue_cents ?? 0),
            }))} />
          </div>
          <div className="rounded-3xl bg-white p-6 ring-1 ring-ink/5">
            <h3 className="font-display text-xl font-bold">Les plus consultées</h3>
            <p className="mb-4 text-xs text-ink/60">Ouvertures de fiche · conversion = canettes vendues / vues</p>
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-ink/50"><tr><th className="pb-2 font-medium">Saveur</th><th className="font-medium">Vues</th><th className="font-medium">Conv.</th></tr></thead>
              <tbody className="divide-y divide-ink/10">
                {(views.data ?? []).map((v) => (
                  <tr key={v.product_id}>
                    <td className="py-1.5">{v.product_name}</td>
                    <td className="tabular-nums">{v.views}</td>
                    <td className="tabular-nums">{v.views ? `${Math.round(((v.units_sold ?? 0) / v.views) * 100)} %` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section>
        <p className="text-sm font-semibold tracking-[0.2em] text-ink/60 uppercase">Actions</p>
        <h2 className="font-display mt-2 text-4xl font-extrabold">À traiter.</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Link href="/admin/commandes?statut=paid" className="flex flex-col justify-between rounded-3xl bg-sky p-6 transition hover:-translate-y-1">
            <p className="font-semibold">Commandes à expédier</p>
            <p className="font-display mt-6 text-6xl font-extrabold">{toShip.count ?? 0}</p>
          </Link>
          <Link href="/admin/messages" className="flex flex-col justify-between rounded-3xl bg-ink p-6 text-cream transition hover:-translate-y-1">
            <p className="font-semibold">Messages de contact non traités</p>
            <p className="font-display mt-6 text-6xl font-extrabold text-corail">{kpi?.open_contacts ?? 0}</p>
            <p className="mt-2 text-xs text-cream/60">{kpi?.newsletter_count ?? 0} inscrits à la newsletter</p>
          </Link>
          <div className="rounded-3xl bg-white p-6 ring-1 ring-ink/5">
            <div className="flex items-baseline justify-between">
              <h3 className="font-semibold">Stock faible (≤ 24)</h3>
              <Link href="/admin/produits" className="text-sm font-semibold underline">Réassort</Link>
            </div>
            {!lowStock.data?.length ? (
              <p className="mt-3 text-sm text-ink/50">Aucun stock critique.</p>
            ) : (
              <ul className="mt-3 divide-y divide-ink/10 text-sm">
                {lowStock.data.map((row) => (
                  <li key={row.product_id} className="flex justify-between py-1.5">
                    <span>{row.product_name}</span>
                    <span className={`font-semibold tabular-nums ${row.stock === 0 ? "text-red-700" : ""}`}>{row.stock}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
