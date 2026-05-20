"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { clsx } from "clsx";
import { GradeBadge } from "@/components/GradeBadge";
import { RiskRadar } from "@/components/RiskRadar";
import { fetchReport } from "@/lib/api";
import { listCompare, toggleCompare } from "@/lib/storage";
import { DIMENSIONS, type DimensionKey, type RiskReport } from "@/lib/types";
import { getDisabledDims } from "@/lib/weights";

const SERIES_COLORS = ["#a855f7", "#06b6d4", "#22c55e", "#f59e0b"];

interface Slot {
  address: string;
  report: RiskReport | null;
  error: string | null;
}

function CompareInner() {
  const params = useSearchParams();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const fromUrl = (params.get("addresses") ?? "").split(",").filter(Boolean);
    const stored = listCompare();
    const addresses = (fromUrl.length > 0 ? fromUrl : stored).slice(0, 4);

    setSlots(addresses.map((a) => ({ address: a, report: null, error: null })));
    addresses.forEach((address, idx) => {
      fetchReport(address)
        .then((report) => {
          setSlots((prev) => {
            const next = [...prev];
            if (next[idx]) next[idx] = { ...next[idx], report };
            return next;
          });
        })
        .catch((e) => {
          setSlots((prev) => {
            const next = [...prev];
            if (next[idx])
              next[idx] = {
                ...next[idx],
                error: e instanceof Error ? e.message : String(e),
              };
            return next;
          });
        });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, version]);

  function remove(address: string) {
    toggleCompare(address);
    setVersion((v) => v + 1);
  }

  if (slots.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <h1 className="text-3xl font-bold text-white">比較清單是空的</h1>
        <p className="mt-3 text-white/60">
          先到首頁查詢一些地址，然後勾選「加入比較」。
        </p>
        <div className="mt-8">
          <Link
            href="/"
            className="rounded-xl bg-white px-6 py-3 font-semibold text-black"
          >
            返回首頁
          </Link>
        </div>
      </div>
    );
  }

  const disabled = getDisabledDims();
  const availableDims = DIMENSIONS.filter(
    (d) => d.available && !disabled.has(d.key),
  );
  const radarData = availableDims.map((d) => {
    const point: Record<string, string | number> = { dimension: d.shortLabel };
    slots.forEach((s) => {
      if (s.report) {
        point[shortName(s.address)] = scoreOf(d.key, s.report);
      }
    });
    return point;
  });

  return (
    <div className="mx-auto max-w-7xl px-6 pb-24">
      <header className="mt-2 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">
            多址比較
          </p>
          <h1 className="mt-2 text-3xl font-bold text-white">
            {slots.length} 個地點並排
          </h1>
        </div>
        <Link
          href="/"
          className="rounded-xl border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/10"
        >
          + 新增地址
        </Link>
      </header>

      <section className="glass mt-10 rounded-3xl p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-white/60">
          雷達圖疊加
        </h2>
        <RiskRadar
          data={radarData as Array<{ dimension: string; [k: string]: string | number }>}
          series={slots
            .filter((s) => s.report)
            .map((s, i) => ({
              name: shortName(s.address),
              color: SERIES_COLORS[i % SERIES_COLORS.length],
            }))}
          height={420}
        />
      </section>

      <section className="mt-10 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-white/10">
              <th className="py-4 text-left text-xs uppercase tracking-widest text-white/40">
                維度
              </th>
              {slots.map((s, i) => (
                <th
                  key={s.address}
                  className="min-w-[200px] px-3 py-4 text-left"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div
                        className="font-mono text-xs uppercase tracking-widest"
                        style={{
                          color: SERIES_COLORS[i % SERIES_COLORS.length],
                        }}
                      >
                        Slot {i + 1}
                      </div>
                      <div className="mt-1 text-sm font-semibold text-white">
                        {s.address}
                      </div>
                    </div>
                    <button
                      onClick={() => remove(s.address)}
                      className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/40 transition hover:border-white/30 hover:text-white"
                      aria-label="移除"
                    >
                      ×
                    </button>
                  </div>
                  {s.report ? (
                    <div className="mt-3">
                      <GradeBadge
                        grade={s.report.overall.grade}
                        score={s.report.overall.score}
                        size="sm"
                      />
                    </div>
                  ) : s.error ? (
                    <div className="mt-3 text-xs text-rose-400">{s.error}</div>
                  ) : (
                    <div className="mt-3 text-xs text-white/40">載入中…</div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {availableDims.map((d) => (
              <tr
                key={d.key}
                className="border-b border-white/[0.05] hover:bg-white/[0.02]"
              >
                <td className="py-3 text-sm text-white/70">
                  <div className="font-medium text-white">{d.label}</div>
                  <div className="text-xs text-white/40">{d.description}</div>
                </td>
                {slots.map((s) => {
                  const score = s.report ? scoreOf(d.key, s.report) : null;
                  return (
                    <td key={s.address} className="px-3 py-3">
                      {score == null ? (
                        <span className="text-white/30">—</span>
                      ) : (
                        <ScoreBar score={score} />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="mt-8 text-xs text-white/40">
        提示：比較清單最多 4 個地址。點任一格的 × 移除，或回首頁再勾選新地址。
      </p>
    </div>
  );
}

function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 80
      ? "bg-emerald-400"
      : score >= 60
        ? "bg-amber-300"
        : score >= 40
          ? "bg-orange-400"
          : "bg-rose-400";
  return (
    <div className="flex items-center gap-3">
      <div className="font-mono text-lg font-bold tabular-nums text-white">
        {score}
      </div>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
        <div
          className={clsx("h-full rounded-full", color)}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function scoreOf(key: DimensionKey, r: RiskReport): number {
  switch (key) {
    case "earthquake":
      return r.dimensions.earthquake.score;
    case "air_quality":
      return r.dimensions.air_quality.score;
    case "healthcare":
      return r.dimensions.healthcare.score;
    case "amenities":
      return r.dimensions.amenities.score;
    case "transit":
      return r.dimensions.transit.score;
    case "flood":
      return r.dimensions.flood.score;
    case "school_district":
      return r.dimensions.school_district.score;
    default:
      return 0;
  }
}

function shortName(addr: string): string {
  return addr.length > 8 ? addr.slice(0, 8) + "…" : addr;
}

export default function ComparePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-2xl px-6 py-20 text-white/60">
          載入中…
        </div>
      }
    >
      <CompareInner />
    </Suspense>
  );
}
