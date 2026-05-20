import { clsx } from "clsx";
import type { Poi } from "@/lib/types";

interface PoiLike {
  name: string;
  lat: number;
  lng: number;
  distance_km: number;
  category?: string;
  source?: string;
  has_emergency?: boolean;
  is_medical_center?: boolean;
}

interface Props {
  items: PoiLike[];
  emptyLabel?: string;
  limit?: number;
  showBadge?: (p: PoiLike) => string | null;
}

function mapsUrl(p: PoiLike): string {
  const q = encodeURIComponent(p.name);
  return `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}&query_place_id=&q=${q}`;
}

export function PoiList({ items, emptyLabel = "(無)", limit = 8, showBadge }: Props) {
  if (!items || items.length === 0) {
    return <div className="text-sm text-white/40">{emptyLabel}</div>;
  }
  const list = items.slice(0, limit);
  return (
    <ul className="space-y-1.5">
      {list.map((p, i) => {
        const badge = showBadge ? showBadge(p) : null;
        return (
          <li
            key={`${p.lat},${p.lng},${i}`}
            className="flex items-baseline gap-2 border-b border-dashed border-white/[0.06] py-1.5 last:border-0"
          >
            <a
              href={mapsUrl(p)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 truncate text-white/90 transition hover:text-cyan-300 hover:underline"
              title={p.name}
            >
              {p.name}
            </a>
            {badge && (
              <span className="rounded-full border border-white/15 px-1.5 py-px text-[9px] uppercase tracking-widest text-white/60">
                {badge}
              </span>
            )}
            <span className="shrink-0 font-mono text-xs tabular-nums text-white/50">
              {p.distance_km} km
            </span>
          </li>
        );
      })}
      {items.length > limit && (
        <li className="pt-1 text-xs text-white/30">
          + 還有 {items.length - limit} 個…
        </li>
      )}
    </ul>
  );
}

export function poiBadgeClass(category?: string): string {
  return clsx(
    category === "convenience" && "text-amber-300",
    category === "pharmacy" && "text-rose-300",
    category === "park" && "text-emerald-300",
    category === "rail" && "text-cyan-300",
    category === "bus" && "text-purple-300",
    category === "school" && "text-pink-300",
    category === "kindergarten" && "text-pink-200",
  );
}
