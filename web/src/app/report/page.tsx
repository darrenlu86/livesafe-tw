"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import { AddressSearch } from "@/components/AddressSearch";
import { DimensionCard, type DimensionData } from "@/components/DimensionCard";
import { GradeBadge } from "@/components/GradeBadge";
import { RiskRadar } from "@/components/RiskRadar";
import { fetchDimension, fetchGeocode } from "@/lib/api";
import { isInCompare, recordRecent, toggleCompare } from "@/lib/storage";
import {
  DIMENSIONS,
  type DimensionKey,
  type GeocodeResult,
  type Grade,
  type RiskReport,
} from "@/lib/types";
import {
  getDisabledDims,
  resetWeights,
  toggleDimension,
} from "@/lib/weights";

type DimSlot = DimensionData;

function gradeFromScore(score: number): Grade {
  if (score >= 80) return "A";
  if (score >= 60) return "B";
  if (score >= 40) return "C";
  return "D";
}

function ReportInner() {
  const params = useSearchParams();
  const address = params.get("address") ?? "";

  const [geo, setGeo] = useState<GeocodeResult | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [dims, setDims] = useState<Record<DimensionKey, DimSlot>>(initialDims);
  const [inCompare, setInCompare] = useState(false);
  const [savedOnce, setSavedOnce] = useState(false);
  const [disabled, setDisabled] = useState<Set<DimensionKey>>(new Set());

  useEffect(() => {
    setDisabled(getDisabledDims());
  }, []);

  function handleToggleDim(key: DimensionKey) {
    setDisabled(new Set(toggleDimension(key)));
  }

  function handleReset() {
    resetWeights();
    setDisabled(new Set());
  }

  // Step 1: geocode
  useEffect(() => {
    if (!address) return;
    setGeo(null);
    setGeoError(null);
    setDims(initialDims);
    setSavedOnce(false);
    setInCompare(isInCompare(address));
    fetchGeocode(address)
      .then(setGeo)
      .catch((e) => setGeoError(e instanceof Error ? e.message : String(e)));
  }, [address]);

  // Step 2: fan out dimensions
  useEffect(() => {
    if (!geo) return;
    const targets = DIMENSIONS.filter((d) => d.available).map((d) => d.key);
    targets.forEach((key) => {
      fetchDimension(key, geo.lat, geo.lng)
        .then((data) => {
          setDims((prev) => ({
            ...prev,
            [key]: { kind: key, data } as DimensionData,
          }));
        })
        .catch((e) => {
          setDims((prev) => ({
            ...prev,
            [key]: {
              kind: "error",
              message: e instanceof Error ? e.message : String(e),
            },
          }));
        });
    });
  }, [geo]);

  // Compute overall — only includes available, non-error, non-disabled dims
  const overall = useMemo(() => {
    const scores: number[] = [];
    let stillLoading = 0;
    DIMENSIONS.filter((d) => d.available).forEach((d) => {
      const slot = dims[d.key];
      if (slot.kind === "loading") stillLoading++;
      else if (
        slot.kind !== "error" &&
        slot.kind !== "placeholder" &&
        !disabled.has(d.key)
      ) {
        scores.push((slot as { data: { score: number } }).data.score);
      }
    });
    if (stillLoading > 0) return { ready: false as const, stillLoading };
    if (scores.length === 0) {
      return { ready: true as const, score: 0, grade: "D" as Grade };
    }
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    return { ready: true as const, score: avg, grade: gradeFromScore(avg) };
  }, [dims, disabled]);

  // Persist to localStorage once everything completes
  useEffect(() => {
    if (!geo || !overall.ready || savedOnce) return;
    const dimensions: Partial<Record<DimensionKey, { score: number }>> = {};
    DIMENSIONS.filter((d) => d.available).forEach((d) => {
      const slot = dims[d.key];
      if (slot.kind !== "loading" && slot.kind !== "error" && slot.kind !== "placeholder") {
        dimensions[d.key] = (slot as { data: { score: number } }).data;
      }
    });
    const fakeReport: RiskReport = {
      query: {
        address,
        lat: geo.lat,
        lng: geo.lng,
        geocode_source: "nominatim",
        geocode_display_name: geo.display_name,
        generated_at: new Date().toISOString(),
      },
      overall: { score: overall.score, grade: overall.grade },
      dimensions: dimensions as RiskReport["dimensions"],
      sources: [],
    };
    recordRecent(fakeReport);
    setSavedOnce(true);
  }, [overall, geo, dims, address, savedOnce]);

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

  if (geoError) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <div className="glass rounded-2xl border-rose-500/30 p-6">
          <h2 className="text-lg font-semibold text-rose-300">地理編碼失敗</h2>
          <p className="mt-2 text-sm text-white/70">{geoError}</p>
        </div>
        <div className="mt-8">
          <AddressSearch initial={address} size="hero" />
        </div>
      </div>
    );
  }

  const radarData = DIMENSIONS.filter(
    (d) => d.available && !disabled.has(d.key),
  ).map((d) => {
    const slot = dims[d.key];
    const score =
      slot.kind === "loading" ||
      slot.kind === "error" ||
      slot.kind === "placeholder"
        ? 0
        : (slot as { data: { score: number } }).data.score;
    return { dimension: d.shortLabel, 分數: score };
  });

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
            {address}
          </h1>
          {geo?.display_name && (
            <p className="mt-1 text-sm text-white/40">{geo.display_name}</p>
          )}
          <div className="my-8 flex items-center justify-center lg:justify-start">
            {overall.ready ? (
              <GradeBadge grade={overall.grade} score={overall.score} />
            ) : (
              <LoadingGrade
                progress={
                  DIMENSIONS.filter((d) => d.available).length -
                  overall.stillLoading
                }
                total={DIMENSIONS.filter((d) => d.available).length}
              />
            )}
          </div>
          <button
            disabled={!overall.ready}
            onClick={() => {
              toggleCompare(address);
              setInCompare(isInCompare(address));
            }}
            className={clsx(
              "rounded-xl border px-5 py-2.5 text-sm font-medium transition",
              !overall.ready && "opacity-40",
              overall.ready && inCompare
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
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-white">維度細節</h2>
            <p className="mt-1 text-xs text-white/40">
              不在意的維度可點「✓ 計入」切換為「○ 不計」，總評會即時重算
            </p>
          </div>
          <div className="flex items-center gap-4">
            {disabled.size > 0 && (
              <button
                onClick={handleReset}
                className="text-xs text-white/50 underline-offset-2 hover:text-white hover:underline"
              >
                重設為全部計入
              </button>
            )}
            <ProgressIndicator dims={dims} />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {DIMENSIONS.map((config) => (
            <DimensionCard
              key={config.key}
              config={config}
              value={dims[config.key]}
              included={!disabled.has(config.key)}
              onToggleInclude={
                config.available ? () => handleToggleDim(config.key) : undefined
              }
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function LoadingGrade({
  progress,
  total,
}: {
  progress: number;
  total: number;
}) {
  return (
    <div className="flex flex-col items-center gap-4 lg:items-start">
      <div className="font-mono text-7xl font-black tabular-nums text-white/30">
        — / —
      </div>
      <div className="w-64">
        <div className="flex items-center justify-between text-xs uppercase tracking-widest text-white/40">
          <span>分析中</span>
          <span>
            {progress}/{total}
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-purple-400 transition-all duration-500"
            style={{ width: `${(progress / total) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function ProgressIndicator({ dims }: { dims: Record<DimensionKey, DimSlot> }) {
  const items = DIMENSIONS.filter((d) => d.available);
  const done = items.filter((d) => {
    const s = dims[d.key];
    return s.kind !== "loading";
  }).length;
  if (done === items.length) {
    return (
      <span className="font-mono text-xs uppercase tracking-widest text-emerald-300/80">
        ✓ 全部完成
      </span>
    );
  }
  return (
    <span className="font-mono text-xs uppercase tracking-widest text-white/40">
      {done}/{items.length} 完成
    </span>
  );
}

function initialDims(): Record<DimensionKey, DimSlot> {
  return Object.fromEntries(
    DIMENSIONS.map((d) => [
      d.key,
      d.available ? { kind: "loading" } : { kind: "placeholder" },
    ]),
  ) as Record<DimensionKey, DimSlot>;
}

export default function ReportPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-2xl px-6 py-20 text-white/60">
          載入中…
        </div>
      }
    >
      <ReportInner />
    </Suspense>
  );
}
