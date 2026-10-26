import type { Metadata } from "next";
import Can from "@/components/Can";
import NewFlavorForm from "@/components/admin/NewFlavorForm";
import { createClient } from "@/lib/supabase/server";
import { toggleProductActive, updatePack, updateProductCommerce, updateStock } from "@/lib/admin-actions";
import { formatDate, formatPrice } from "@/lib/format";
import { flavorTone } from "@/lib/color";

export const metadata: Metadata = { title: "Saveurs & stocks" };

const STATUS_LABELS = { active: "En vente", hidden: "Masquée", out_of_stock: "En rupture" } as const;
const REASON_LABELS = { order: "Commande", cancellation: "Annulation", restock: "Réassort", adjustment: "Correction", return: "Retour" } as const;
const euroInput = (cents: number | null) => (cents === null ? "" : (cents / 100).toFixed(2).replace(".", ","));

export default async function AdminProductsPage() {
  const supabase = await createClient();
  const [{ data: categories }, { data: products }, { data: packs }, { data: movements }] = await Promise.all([
    supabase.from("categories").select("id, name").order("id"),
    supabase
      .from("products")
      .select("id, name, sku, price_cents, compare_at_price_cents, stock, low_stock_threshold, status, is_active, color, accent, secondary, pattern, categories(name)")
      .order("id"),
    supabase.from("packs").select("id, name, size, price_cents, status").order("size"),
    supabase
      .from("stock_movements")
      .select("id, delta, reason, note, created_at, products(name)")
      .order("created_at", { ascending: false })
      .limit(15),
  ]);

  return (
    <div className="space-y-16">
      <section>
        <h1 className="font-display text-4xl font-extrabold">Saveurs & stocks</h1>
        <p className="mt-2 text-ink/60">Chaque changement de stock est enregistré dans le journal, avec son motif.</p>
        <ul className="mt-8 grid gap-4 md:grid-cols-2">
          {(products ?? []).map((p) => {
            const low = p.stock <= p.low_stock_threshold;
            return (
              <li key={p.id} className={`flex gap-4 rounded-3xl p-5 ${p.status === "hidden" ? "opacity-60" : ""}`} style={{ backgroundColor: flavorTone(p.color).soft }}>
                <Can name={p.name} color={p.color} accent={p.accent} secondary={p.secondary} pattern={p.pattern} className="h-32 shrink-0 drop-shadow-xl" />
                <div className="flex min-w-0 flex-1 flex-col gap-3">
                  <div>
                    <p className="font-display text-lg leading-tight font-bold">{p.name}</p>
                    <p className="text-xs text-ink/60">{p.categories?.name} · {p.sku} · {STATUS_LABELS[p.status]}</p>
                  </div>

                  <form action={updateProductCommerce} className="flex flex-wrap items-end gap-2 text-xs">
                    <input type="hidden" name="product_id" value={p.id} />
                    <label className="flex flex-col gap-1 font-semibold">
                      Prix (€)
                      <input name="price" inputMode="decimal" defaultValue={euroInput(p.price_cents)} required className="w-20 rounded-full border border-ink/20 bg-white px-3 py-1 text-sm tabular-nums" />
                    </label>
                    <label className="flex flex-col gap-1 font-semibold">
                      Prix barré
                      <input name="compare_at" inputMode="decimal" defaultValue={euroInput(p.compare_at_price_cents)} placeholder="aucun" className="w-20 rounded-full border border-ink/20 bg-white px-3 py-1 text-sm tabular-nums" />
                    </label>
                    <label className="flex flex-col gap-1 font-semibold">
                      Statut
                      <select name="status" defaultValue={p.status} className="rounded-full border border-ink/20 bg-white px-3 py-1 text-sm">
                        {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </label>
                    <button className="rounded-full bg-electric px-3 py-1.5 font-semibold text-cream">Enregistrer</button>
                  </form>

                  <form action={updateStock} className="flex flex-wrap items-end gap-2 text-xs">
                    <input type="hidden" name="product_id" value={p.id} />
                    <label className="flex flex-col gap-1 font-semibold">
                      Stock {low && <span className="text-red-700">· faible</span>}
                      <input name="stock" type="number" min={0} defaultValue={p.stock}
                        className={`w-20 rounded-full border border-ink/20 bg-white px-3 py-1 text-sm tabular-nums ${low ? "font-bold" : ""}`} />
                    </label>
                    <label className="flex flex-col gap-1 font-semibold">
                      Motif
                      <select name="reason" defaultValue="restock" className="rounded-full border border-ink/20 bg-white px-3 py-1 text-sm">
                        <option value="restock">Réassort</option>
                        <option value="adjustment">Correction</option>
                        <option value="return">Retour</option>
                      </select>
                    </label>
                    <button className="rounded-full bg-ink px-3 py-1.5 font-semibold text-cream">Mettre à jour</button>
                  </form>

                  <form action={toggleProductActive}>
                    <input type="hidden" name="product_id" value={p.id} />
                    <input type="hidden" name="is_active" value={String(p.is_active)} />
                    <button className="text-xs font-semibold underline opacity-70 hover:opacity-100">
                      {p.is_active ? "Retirer de la vente" : "Remettre en vente"}
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2 className="font-display text-4xl font-extrabold">Packs à composer</h2>
        <p className="mt-2 text-ink/60">Le client répartit librement les canettes entre les saveurs en vente.</p>
        <ul className="mt-6 grid gap-4 md:grid-cols-3">
          {(packs ?? []).map((pack) => (
            <li key={pack.id} className={`rounded-3xl bg-white p-5 ring-1 ring-ink/5 ${pack.status === "hidden" ? "opacity-60" : ""}`}>
              <p className="font-display text-xl font-bold">{pack.name}</p>
              <p className="text-xs text-ink/60">{formatPrice(Math.round(pack.price_cents / pack.size))} la canette · {STATUS_LABELS[pack.status]}</p>
              <form action={updatePack} className="mt-4 flex flex-wrap items-end gap-2 text-xs">
                <input type="hidden" name="pack_id" value={pack.id} />
                <label className="flex flex-col gap-1 font-semibold">
                  Prix (€)
                  <input name="price" inputMode="decimal" defaultValue={euroInput(pack.price_cents)} required className="w-24 rounded-full border border-ink/20 bg-white px-3 py-1 text-sm tabular-nums" />
                </label>
                <label className="flex flex-col gap-1 font-semibold">
                  Statut
                  <select name="status" defaultValue={pack.status} className="rounded-full border border-ink/20 bg-white px-3 py-1 text-sm">
                    {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                <button className="rounded-full bg-electric px-3 py-1.5 font-semibold text-cream">Enregistrer</button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-display text-4xl font-extrabold">Journal de stock</h2>
        {!movements?.length ? (
          <p className="mt-4 text-ink/60">Aucun mouvement enregistré pour l&apos;instant.</p>
        ) : (
          <table className="mt-6 w-full text-sm">
            <thead className="text-left text-xs text-ink/50">
              <tr><th className="pb-2 font-medium">Date</th><th className="font-medium">Saveur</th><th className="font-medium">Motif</th><th className="text-right font-medium">Écart</th></tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {movements.map((m) => (
                <tr key={m.id}>
                  <td className="py-2">{formatDate(m.created_at)}</td>
                  <td>{m.products?.name}</td>
                  <td>{REASON_LABELS[m.reason]}{m.note ? ` · ${m.note}` : ""}</td>
                  <td className={`text-right font-semibold tabular-nums ${m.delta < 0 ? "text-red-700" : "text-emerald-700"}`}>{m.delta > 0 ? `+${m.delta}` : m.delta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h2 className="font-display text-4xl font-extrabold">Nouvelle saveur</h2>
        <p className="mt-2 mb-6 text-ink/60">La canette est dessinée automatiquement : pas d&apos;image à fournir.</p>
        <NewFlavorForm categories={categories ?? []} />
      </section>
    </div>
  );
}
