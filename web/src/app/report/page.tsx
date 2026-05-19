"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { clsx } from "clsx";
import { AddressSearch } from "@/components/AddressSearch";
import { DimensionCard, type DimensionData } from "@/components/DimensionCard";
import { GradeBadge } from "@/components/GradeBadge";
import { RiskRadar } from "@/components/RiskRadar";
import { fetchReport } from "@/lib/api";
import { isInCompare, recordRecent, toggleCompare } from "@/lib/storage";
import { DIMENSIONS, type DimensionKey, type RiskReport } from "@/lib/types";

function ReportInner() {
  const params = useSearchParams();
  const address = params.get("address") ?? "";

  const [report, setReport] = useState<RiskReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inCompare, setInCompare] = useState(false);

  useEffect(() => {
    if (!address) return;
    setReport(null);
    setError(null);
    fetchReport(address)
      .then((r) => {
        setReport(r);
        recordRecent(r);
        setInCompare(isInCompare(address));
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [address]);

  if (!address) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <h1 className="text-3xl font-bold text-white">尚未輸入地址</h1>
        <p className="mt-3 text-white/60">回首頁輸入一個地址開始分析。</p>
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

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <div className="glass rounded-2xl border-rose-500/30 p-6">
          <h2 className="text-lg font-semibold text-rose-300">查詢失敗</h2>
          <p className="mt-2 text-sm text-white/70">{error}</p>
        </div>
        <div className="mt-8">
          <AddressSearch initial={address} size="hero" />
        </div>
      </div>
    );
  }

  if (!report) {
    return <LoadingState address={address} />;
  }

  const radarData = DIMENSIONS.filter((d) => d.available).map((d) => ({
    dimension: d.shortLabel,
    分數: scoreOf(d.key, report),
  }));

  return (
    <div className="mx-auto max-w-6xl px-6 pb-24">
      <div className="mx-auto max-w-2xl">
        <AddressSearch initial={address} size="compact" />
      </div>

      <section className="mt-12 grid items-center gap-12 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">
            居住安心度
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-white md:text-3xl">
            {report.query.address}
          </h1>
          {report.query.geocode_display_name && (
            <p className="mt-1 text-sm text-white/40">
              {report.query.geocode_display_name}
            </p>
          )}
          <div className="my-8 flex items-center justify-center lg:justify-start">
            <GradeBadge
              grade={report.overall.grade}
              score={report.overall.score}
            />
          </div>
          <button
            onClick={() => {
              toggleCompare(address);
              setInCompare(isInCompare(address));
            }}
            className={clsx(
              "rounded-xl border px-5 py-2.5 text-sm font-medium transition",
              inCompare
                ? "border-white bg-white text-black"
                : "border-white/20 bg-white/5 text-white hover:bg-white/10",
            )}
          >
            {inCompare ? "✓ 已加入比較清單" : "＋ 加入比較"}
          </button>
        </div>
        <div className="glass rounded-3xl p-6">
          <RiskRadar
            data={radarData}
            series={[{ name: "分數" }]}
            height={400}
          />
        </div>
      </section>

      <section className="mt-16">
        <h2 className="mb-6 text-xl font-bold text-white">維度細節</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {DIMENSIONS.map((config) => (
            <DimensionCard
              key={config.key}
              config={config}
              value={dimensionData(config.key, report)}
            />
          ))}
        </div>
      </section>

      <section className="glass mt-16 rounded-2xl p-6">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-white/60">
          資料來源
        </h3>
        <ul className="mt-4 grid gap-2 text-sm text-white/70 md:grid-cols-2">
          {report.sources.map((s) => (
            <li
              key={s.url}
              className="flex items-baseline justify-between gap-3 border-b border-dashed border-white/[0.06] py-1.5 last:border-0"
            >
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white"
              >
                {s.name}
              </a>
              <span className="font-mono text-xs text-white/40">
                {s.updated_at.slice(0, 10)}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-white/40">
          產生於 {new Date(report.query.generated_at).toLocaleString("zh-TW")}
        </p>
      </section>
    </div>
  );
}

function LoadingState({ address }: { address: string }) {
  return (
    <div className="mx-auto max-w-2xl px-6 py-20">
      <p className="text-xs uppercase tracking-[0.3em] text-white/40">分析中</p>
      <h1 className="mt-2 text-2xl font-semibold text-white">{address}</h1>
      <div className="mt-10 space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="glass h-16 animate-pulse rounded-2xl"
            style={{ animationDelay: `${i * 80}ms` }}
          />
        ))}
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
    default:
      return 0;
  }
}

function dimensionData(key: DimensionKey, r: RiskReport): DimensionData {
  switch (key) {
    case "earthquake":
      return { kind: "earthquake", data: r.dimensions.earthquake };
    case "air_quality":
      return { kind: "air_quality", data: r.dimensions.air_quality };
    case "healthcare":
      return { kind: "healthcare", data: r.dimensions.healthcare };
    case "amenities":
      return { kind: "amenities", data: r.dimensions.amenities };
    case "transit":
      return { kind: "transit", data: r.dimensions.transit };
    default:
      return { kind: "placeholder" };
  }
}

export default function ReportPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-2xl px-6 py-20 text-white/60">載入中…</div>
      }
    >
      <ReportInner />
    </Suspense>
  );
}
