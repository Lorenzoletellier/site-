import { ORDER_STATUS_LABELS } from "@/lib/format";
import type { Enums } from "@/lib/supabase/database.types";

const STATUS_STYLES: Record<Enums<"order_status">, string> = {
  pending: "bg-ink/10 text-ink",
  paid: "bg-sun text-ink",
  shipped: "bg-[#d9e3f0] text-[#23436e]",
  delivered: "bg-[#c4f5d9] text-[#06200f]",
  cancelled: "bg-[#ffd9dc] text-[#8a1c24]",
};

export default function StatusBadge({ status }: { status: Enums<"order_status"> }) {
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[status]}`}>
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}
