import type { Metadata } from "next";
import Can from "@/components/Can";
import NewFlavorForm from "@/components/admin/NewFlavorForm";
import { createClient } from "@/lib/supabase/server";
import { toggleProductActive, updateStock } from "@/lib/admin-actions";
import { formatPrice } from "@/lib/format";
import { LOW_STOCK } from "@/lib/flavors";

export const metadata: Metadata = { title: "Saveurs & stocks" };

export default async function AdminProductsPage() {
  const supabase = await createClient();
  const [{ data: categories }, { data: products }] = await Promise.all([
    supabase.from("categories").select("id, name").order("id"),
    supabase
      .from("products")
      .select("id, name, price_cents, stock, is_active, color, accent, secondary, pattern, categories(name)")
      .order("id"),
  ]);

  return (
    <div className="space-y-16">
      <section>
        <h1 className="font-display text-4xl font-extrabold">Saveurs & stocks</h1>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(products ?? []).map((p) => (
            <li key={p.id} className={`flex gap-4 rounded-3xl p-5 ${p.is_active ? "" : "opacity-50"}`} style={{ backgroundColor: `${p.color}22` }}>
              <Can name={p.name} color={p.color} accent={p.accent} secondary={p.secondary} pattern={p.pattern} className="h-28 shrink-0 drop-shadow-xl" />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div>
                  <p className="font-display text-lg leading-tight font-bold">{p.name}</p>
                  <p className="text-xs text-ink/60">{p.categories?.name} · {formatPrice(p.price_cents)}</p>
                </div>
                <form action={updateStock} className="flex items-center gap-2">
                  <input type="hidden" name="product_id" value={p.id} />
                  <label htmlFor={`stock-${p.id}`} className="text-xs font-semibold">Stock</label>
                  <input id={`stock-${p.id}`} name="stock" type="number" min={0} defaultValue={p.stock}
                    className={`w-20 rounded-full border border-ink/20 bg-white px-3 py-1 text-sm tabular-nums ${p.stock <= LOW_STOCK ? "font-bold" : ""}`} />
                  <button className="rounded-full bg-electric px-3 py-1 text-xs font-semibold text-cream">OK</button>
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
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-display text-4xl font-extrabold">Nouvelle saveur</h2>
        <p className="mt-2 mb-6 text-ink/60">La canette est dessinée automatiquement : pas d&apos;image à fournir.</p>
        <NewFlavorForm categories={categories ?? []} />
      </section>
    </div>
  );
}
