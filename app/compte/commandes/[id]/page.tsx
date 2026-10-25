import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Can from "@/components/Can";
import StatusBadge from "@/components/StatusBadge";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "Ma commande" };

export default async function OrderPage({ params, searchParams }: PageProps<"/compte/commandes/[id]">) {
  const [{ id }, { confirmee }] = await Promise.all([params, searchParams]);
  const orderId = Number(id);
  if (!Number.isInteger(orderId)) notFound();

  await requireUser(`/compte/commandes/${id}`);
  const supabase = await createClient();
  // La RLS garantit qu'un client ne lit que ses propres commandes
  const { data: order } = await supabase
    .from("orders")
    .select("*, order_items(id, product_name, unit_price_cents, quantity, products(name, color, accent, secondary, pattern))")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) notFound();

  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      {confirmee && (
        <div role="status" className="mb-10 rounded-3xl bg-sky p-8">
          <p className="font-display text-3xl font-extrabold">Pschitt ! Commande confirmée.</p>
          <p className="mt-2 text-ink/80">Tes canettes partent sous 48 h. Tu pourras ensuite noter chaque saveur depuis sa fiche.</p>
        </div>
      )}
      <Link href="/compte" className="text-sm font-semibold opacity-60 hover:opacity-100">← Mes commandes</Link>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <h1 className="font-display text-4xl font-extrabold">Commande n° {order.id}</h1>
        <StatusBadge status={order.status} />
      </div>
      <p className="mt-1 text-ink/60">Passée le {formatDate(order.created_at)}</p>

      <ul className="mt-8 space-y-3">
        {order.order_items.map((item) => (
          <li key={item.id} className="flex items-center gap-4 rounded-2xl bg-white p-4 ring-1 ring-ink/5">
            {item.products && <Can {...item.products} className="h-16 shrink-0" />}
            <div className="flex-1">
              <p className="font-semibold">{item.product_name}</p>
              <p className="text-sm text-ink/60">{item.quantity} × {formatPrice(item.unit_price_cents)}</p>
            </div>
            <p className="font-semibold">{formatPrice(item.unit_price_cents * item.quantity)}</p>
          </li>
        ))}
      </ul>

      <div className="mt-8 grid gap-6 rounded-3xl bg-white p-6 ring-1 ring-ink/5 sm:grid-cols-2">
        <div className="text-sm">
          <p className="text-xs font-semibold tracking-[0.2em] text-ink/50 uppercase">Livraison</p>
          <p className="mt-2">{order.shipping_name}</p>
          <p>{order.shipping_address}</p>
          <p>{order.shipping_zip} {order.shipping_city}</p>
        </div>
        <dl className="space-y-1.5 text-sm">
          <div className="flex justify-between"><dt>Sous-total</dt><dd>{formatPrice(order.subtotal_cents)}</dd></div>
          {order.discount_cents > 0 && (
            <div className="flex justify-between"><dt>Réduction {order.coupon_code}</dt><dd>−{formatPrice(order.discount_cents)}</dd></div>
          )}
          <div className="flex justify-between"><dt>Livraison</dt><dd>{order.shipping_cents === 0 ? "Offerte" : formatPrice(order.shipping_cents)}</dd></div>
          <div className="flex justify-between border-t border-ink/10 pt-1.5 text-base font-bold"><dt>Total</dt><dd>{formatPrice(order.total_cents)}</dd></div>
        </dl>
      </div>
    </section>
  );
}
