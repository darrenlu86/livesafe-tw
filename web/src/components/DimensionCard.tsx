import { clsx } from "clsx";
import { PoiList } from "./PoiList";
import type {
  AirQualityRisk,
  Amenities,
  DimensionConfig,
  EarthquakeRisk,
  FloodRisk,
  HealthcareAccess,
  SchoolDistrict,
  Transit,
} from "@/lib/types";

export type DimensionData =
  | { kind: "earthquake"; data: EarthquakeRisk }
  | { kind: "air_quality"; data: AirQualityRisk }
  | { kind: "healthcare"; data: HealthcareAccess }
  | { kind: "amenities"; data: Amenities }
  | { kind: "transit"; data: Transit }
  | { kind: "flood"; data: FloodRisk }
  | { kind: "school_district"; data: SchoolDistrict }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "placeholder" };

interface Props {
  config: DimensionConfig;
  value: DimensionData;
  className?: string;
  included?: boolean;
  onToggleInclude?: () => void;
}

function scoreBucket(score: number): { color: string; label: string } {
  if (score >= 80) return { color: "text-emerald-300", label: "極佳" };
  if (score >= 60) return { color: "text-amber-300", label: "尚可" };
  if (score >= 40) return { color: "text-orange-400", label: "留意" };
  return { color: "text-rose-400", label: "警示" };
}

export function DimensionCard({
  config,
  value,
  className,
  included = true,
  onToggleInclude,
}: Props) {
  const isLoading = value.kind === "loading";
  const isError = value.kind === "error";
  const isInactive = value.kind === "placeholder" || isLoading || isError;

  return (
    <article
      className={clsx(
        "glass relative overflow-hidden rounded-2xl p-6 transition",
        !isInactive && "hover:border-white/20 hover:bg-white/[0.06]",
        value.kind === "placeholder" && "opacity-60",
        !included && "opacity-50",
        isError && "border-rose-500/30",
        className,
      )}
    >
      <div
        className="absolute -right-12 -top-12 h-40 w-40 rounded-full opacity-30 blur-3xl"
        style={{ backgroundColor: config.colorVar }}
        aria-hidden
      />
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-white/40">
              {config.shortLabel}
            </div>
            <h3 className="mt-1 text-lg font-semibold text-white">
              {config.label}
            </h3>
          </div>
          {!isInactive && (
            <div className="flex flex-col items-end gap-2">
              <ScoreNumber
                score={(value as { data: { score: number } }).data.score}
              />
              {onToggleInclude && (
                <button
                  type="button"
                  onClick={onToggleInclude}
                  className={clsx(
                    "rounded-full border px-3 py-1 text-[10px] uppercase tracking-widest transition",
                    included
                      ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20"
                      : "border-white/15 bg-white/[0.03] text-white/50 hover:border-white/30 hover:text-white/80",
                  )}
                  aria-label={included ? "從總評移除" : "加入總評"}
                >
                  {included ? "✓ 計入" : "○ 不計"}
                </button>
              )}
            </div>
          )}
          {isLoading && (
            <span className="rounded-full border border-white/15 px-3 py-1 text-[10px] uppercase tracking-widest text-white/50">
              載入中
            </span>
          )}
          {isError && (
            <span className="rounded-full border border-rose-500/40 px-3 py-1 text-[10px] uppercase tracking-widest text-rose-300">
              失敗
            </span>
          )}
          {value.kind === "placeholder" && (
            <span className="rounded-full border border-white/15 px-3 py-1 text-[10px] uppercase tracking-widest text-white/50">
              Coming Soon
            </span>
          )}
        </div>
        <div className="mt-5 text-sm leading-relaxed text-white/70">
          {renderDetail(value, config)}
        </div>
      </div>
    </article>
  );
}

function ScoreNumber({ score }: { score: number }) {
  const { color, label } = scoreBucket(score);
  return (
    <div className="text-right">
      <div
        className={clsx(
          "font-mono text-4xl font-bold tabular-nums text-glow",
          color,
        )}
      >
        {score}
      </div>
      <div className="mt-0.5 text-[10px] uppercase tracking-widest text-white/40">
        {label}
      </div>
    </div>
  );
}

function renderDetail(value: DimensionData, config: DimensionConfig) {
  if (value.kind === "loading") {
    return (
      <div className="space-y-2.5">
        <SkeletonLine />
        <SkeletonLine width="80%" />
        <SkeletonLine width="60%" />
        <p className="mt-3 text-xs text-white/40">分析{config.label}中…</p>
      </div>
    );
  }
  if (value.kind === "error") {
    return (
      <div className="space-y-2">
        <p className="text-rose-300/80">{value.message}</p>
        <p className="text-xs text-white/40">此維度載入失敗，其他維度不受影響。</p>
      </div>
    );
  }
  if (value.kind === "placeholder") {
    return (
      <div className="space-y-2">
        <p>{config.description}</p>
        {config.comingSoon && (
          <p className="text-white/40">{config.comingSoon}</p>
        )}
      </div>
    );
  }
  switch (value.kind) {
    case "earthquake": {
      const d = value.data;
      return (
        <ul className="space-y-1.5">
          {d.nearest_fault && (
            <Row
              label="最近活動斷層"
              value={`${d.nearest_fault.name ?? "—"}（${d.nearest_fault.distance_km} km${
                d.nearest_fault.slip_type ? `，${d.nearest_fault.slip_type}` : ""
              }）`}
            />
          )}
          <Row
            label={`近 ${d.window_years} 年 5km 內 M≥5`}
            value={
              d.recent_quakes_within_5km > 0
                ? `${d.recent_quakes_within_5km} 次` +
                  (d.max_magnitude_within_5km
                    ? `（最大 M${d.max_magnitude_within_5km}）`
                    : "")
                : "無紀錄"
            }
          />
        </ul>
      );
    }
    case "air_quality": {
      const d = value.data;
      const s = d.nearest_station;
      if (!s) return <span>無資料</span>;
      return (
        <ul className="space-y-1.5">
          <Row label="最近測站" value={`${s.name}（${s.distance_km} km）`} />
          <Row
            label={`近 ${d.window_days} 天 PM2.5 年均`}
            value={s.avg_pm25 != null ? `${s.avg_pm25} µg/m³` : "—"}
          />
          <Row label="AQI 年均" value={`${s.avg_aqi}`} />
          <Row
            label="對敏感族群不健康"
            value={`${s.orange_days + s.red_days + s.purple_days} 天（${Math.round(s.unhealthy_for_sensitive_rate * 100)}%）`}
          />
          <Row
            label="不健康／紫爆"
            value={`紅 ${s.red_days} · 紫爆 ${s.purple_days}`}
          />
          <Row
            label="AQI 良好率"
            value={`${Math.round(s.good_rate * 100)}%`}
          />
        </ul>
      );
    }
    case "healthcare": {
      const d = value.data;
      if (d.total_hospitals_within_5km === 0) {
        return (
          <div className="space-y-2">
            <p className="text-rose-300/80">5km 內查無大型醫療機構</p>
            {d.note && <p className="text-xs text-white/40">{d.note}</p>}
          </div>
        );
      }
      return (
        <div className="space-y-3">
          <ul className="space-y-1.5">
            <Row
              label="5km 內醫院"
              value={`${d.total_hospitals_within_5km} 家（${d.emergency_hospitals_within_5km} 急救${d.medical_centers_within_5km ? ` · ${d.medical_centers_within_5km} 醫學中心` : ""}）`}
            />
          </ul>
          <PoiList
            items={d.hospitals}
            limit={5}
            showBadge={(p) => {
              const badges: string[] = [];
              if (p.is_medical_center) badges.push("醫學中心");
              else if (p.has_emergency) badges.push("急救");
              return badges.length > 0 ? badges.join(" · ") : null;
            }}
          />
        </div>
      );
    }
    case "amenities": {
      const d = value.data;
      return (
        <div className="space-y-3">
          <ul className="space-y-1.5">
            <Row
              label="500m 內"
              value={`超商 ${d.convenience_stores_500m} · 藥局 ${d.pharmacies_500m} · 公園 ${d.parks_500m}`}
            />
          </ul>
          <PoiList
            items={d.pois}
            limit={6}
            showBadge={(p) =>
              p.category === "convenience"
                ? "超商"
                : p.category === "pharmacy"
                  ? "藥局"
                  : p.category === "park"
                    ? "公園"
                    : null
            }
          />
        </div>
      );
    }
    case "transit": {
      const d = value.data;
      return (
        <div className="space-y-3">
          <ul className="space-y-1.5">
            <Row
              label="1km 內軌道"
              value={`${d.rail_within_500m + d.rail_500m_to_1km} 站`}
            />
            <Row label="500m 內公車" value={`${d.bus_stops_500m} 站`} />
          </ul>
          <PoiList
            items={d.pois}
            limit={5}
            showBadge={(p) =>
              p.category === "rail" ? "軌道" : p.category === "bus" ? "公車" : null
            }
          />
        </div>
      );
    }
    case "flood": {
      const d = value.data;
      return (
        <div className="space-y-3">
          {d.nearest_water && (
            <ul className="space-y-1.5">
              <Row
                label="最近水體"
                value={`${d.nearest_water.name ?? d.nearest_water.type ?? "—"}（${d.nearest_water.distance_km} km）`}
              />
            </ul>
          )}
          <PoiList items={d.pois} limit={4} />
          <p className="text-xs italic text-white/40">{d.proxy_note}</p>
        </div>
      );
    }
    case "school_district": {
      const d = value.data;
      const parts = [
        d.universities_within_1km && `大學 ${d.universities_within_1km}`,
        d.high_schools_within_1km && `高中職 ${d.high_schools_within_1km}`,
        d.junior_schools_within_1km && `國中 ${d.junior_schools_within_1km}`,
        d.primary_schools_within_1km && `國小 ${d.primary_schools_within_1km}`,
        d.kindergartens_within_1km && `幼兒園 ${d.kindergartens_within_1km}`,
      ].filter(Boolean);
      return (
        <div className="space-y-3">
          <ul className="space-y-1.5">
            <Row
              label="1km 內"
              value={parts.length ? parts.join(" · ") : "—"}
            />
          </ul>
          <PoiList
            items={d.pois}
            limit={8}
            showBadge={(p) => {
              const m: Record<string, string> = {
                university: "大學",
                high: "高中職",
                junior: "國中",
                primary: "國小",
                kindergarten: "幼兒園",
                other: "其他學校",
              };
              return m[p.category ?? ""] ?? null;
            }}
          />
          <p className="text-xs italic text-white/40">{d.proxy_note}</p>
        </div>
      );
    }
  }
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-baseline justify-between gap-3 border-b border-dashed border-white/[0.06] py-1 last:border-0">
      <span className="text-white/50">{label}</span>
      <span className="text-right text-white/90">{value}</span>
    </li>
  );
}

function SkeletonLine({ width = "100%" }: { width?: string }) {
  return (
    <div
      className="h-3 animate-pulse rounded-full bg-white/[0.06]"
      style={{ width }}
    />
  );
}
