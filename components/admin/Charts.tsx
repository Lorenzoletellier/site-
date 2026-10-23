// Graphiques SVG sans dépendance : barres quotidiennes et classements horizontaux
import { formatPrice } from "@/lib/format";

type DailyPoint = { day: string; revenue: number; orders: number };

const dayLabel = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });

export function RevenueChart({ points }: { points: DailyPoint[] }) {
  const width = 720;
  const height = 220;
  const pad = { top: 16, side: 8, bottom: 28 };
  const max = Math.max(...points.map((p) => p.revenue), 1);
  const slot = (width - pad.side * 2) / Math.max(points.length, 1);
  const barWidth = Math.max(slot - 4, 2);
  const chartHeight = height - pad.top - pad.bottom;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img"
      aria-label={`Chiffre d'affaires quotidien sur ${points.length} jours, maximum ${formatPrice(max)}`}>
      <line x1={pad.side} x2={width - pad.side} y1={height - pad.bottom} y2={height - pad.bottom} stroke="#1a1a1a" strokeOpacity="0.15" />
      {points.map((point, index) => {
        const barHeight = (point.revenue / max) * chartHeight;
        const x = pad.side + index * slot + 2;
        const isToday = index === points.length - 1;
        return (
          <g key={point.day}>
            <rect x={x} y={height - pad.bottom - barHeight} width={barWidth} height={Math.max(barHeight, point.revenue > 0 ? 2 : 0)} rx="3"
              fill={isToday ? "#1a1a1a" : "#ffd84d"}>
              <title>{`${dayLabel.format(new Date(point.day))} : ${formatPrice(point.revenue)} (${point.orders} commande(s))`}</title>
            </rect>
            {(index % 5 === 0 || isToday) && (
              <text x={x + barWidth / 2} y={height - 8} textAnchor="middle" fontSize="11" fill="#1a1a1a" fillOpacity="0.6">
                {dayLabel.format(new Date(point.day))}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

type RankItem = { label: string; value: number; display: string; color?: string };

export function RankBars({ items, empty = "Pas encore de ventes." }: { items: RankItem[]; empty?: string }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  if (items.length === 0 || items.every((i) => i.value === 0)) return <p className="text-sm text-ink/50">{empty}</p>;

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.label}>
          <div className="flex justify-between gap-3 text-sm">
            <span className="truncate">{item.label}</span>
            <span className="shrink-0 font-semibold tabular-nums">{item.display}</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-ink/10">
            <div className="h-full rounded-full" style={{ width: `${(item.value / max) * 100}%`, backgroundColor: item.color ?? "#1a1a1a" }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
