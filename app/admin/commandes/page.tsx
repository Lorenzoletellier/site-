import Link from "next/link";
import type { Metadata } from "next";
import StatusBadge from "@/components/StatusBadge";
import { createClient } from "@/lib/supabase/server";
import { updateOrderStatus } from "@/lib/admin-actions";
import { formatDate, formatPrice, ORDER_STATUS_LABELS } from "@/lib/format";
import { Constants, type Enums } from "@/lib/supabase/database.types";

export const metadata: Metadata = { title: "Commandes" };

export default async function AdminOrdersPage({ searchParams }: PageProps<"/admin/commandes">) {
  const { statut } = await searchParams;
  const filter = Constants.public.Enums.order_status.find((s) => s === statut) as Enums<"order_status"> | undefined;

  const supabase = await createClient();
  let query = supabase
    .from("orders")
    .select("id, created_at, status, total_cents, shipping_name, shipping_city, order_items(quantity)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (filter) query = query.eq("status", filter);
  const { data: orders } = await query;

  const chip = (active: boolean) =>
    `rounded-full px-5 py-2.5 text-sm font-semibold transition ${active ? "bg-electric text-cream ring-2 ring-ink" : "bg-white ring-1 ring-ink/10 hover:ring-ink/40"}`;

  return (
    <div>
      <h1 className="font-display text-4xl font-extrabold">Commandes</h1>
      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/admin/commandes" className={chip(!filter)}>Toutes</Link>
        {Constants.public.Enums.order_status.map((status) => (
          <Link key={status} href={`/admin/commandes?statut=${status}`} className={chip(filter === status)}>
            {ORDER_STATUS_LABELS[status]}
          </Link>
        ))}
      </div>

      {!orders?.length ? (
        <p className="mt-8 rounded-3xl bg-white p-8 text-ink/60 ring-1 ring-ink/5">Aucune commande pour ce filtre.</p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-3xl bg-white ring-1 ring-ink/5">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-ink/10 text-left text-xs tracking-[0.15em] text-ink/50 uppercase">
              <tr><th className="p-4">N°</th><th>Date</th><th>Client</th><th>Canettes</th><th>Total</th><th>Statut</th><th>Changer</th></tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="p-4 font-semibold">{order.id}</td>
                  <td>{formatDate(order.created_at)}</td>
                  <td>{order.shipping_name} <span className="text-ink/50">· {order.shipping_city}</span></td>
                  <td className="tabular-nums">{order.order_items.reduce((s, i) => s + i.quantity, 0)}</td>
                  <td className="font-semibold tabular-nums">{formatPrice(order.total_cents)}</td>
                  <td><StatusBadge status={order.status} /></td>
                  <td className="pr-4">
                    <form action={updateOrderStatus} className="flex gap-1">
                      <input type="hidden" name="order_id" value={order.id} />
                      <label htmlFor={`status-${order.id}`} className="sr-only">Nouveau statut</label>
                      <select id={`status-${order.id}`} name="status" defaultValue={order.status} className="rounded-full border border-ink/20 bg-white px-3 py-1.5">
                        {Constants.public.Enums.order_status.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>)}
                      </select>
                      <button className="rounded-full bg-electric px-3 py-1.5 text-xs font-semibold text-cream">OK</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
