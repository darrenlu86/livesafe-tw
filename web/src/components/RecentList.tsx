"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clsx } from "clsx";
import {
  listCompare,
  listRecent,
  toggleCompare,
  type StoredReport,
} from "@/lib/storage";

const GRADE_BG: Record<StoredReport["overall_grade"], string> = {
  A: "bg-gradient-to-br from-emerald-400/30 to-teal-500/20 text-emerald-200",
  B: "bg-gradient-to-br from-amber-300/30 to-orange-400/20 text-amber-200",
  C: "bg-gradient-to-br from-orange-400/30 to-rose-400/20 text-orange-200",
  D: "bg-gradient-to-br from-rose-400/30 to-fuchsia-500/20 text-rose-200",
};

export function RecentList() {
  const [recent, setRecent] = useState<StoredReport[]>([]);
  const [compare, setCompare] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setRecent(listRecent());
    setCompare(listCompare());
  }, []);

  if (!mounted) return null;
  if (recent.length === 0) return null;

  function onToggle(addr: string) {
    toggleCompare(addr);
    setCompare(listCompare());
  }

  return (
    <section className="mt-20">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">我的查詢</h2>
          <p className="mt-1 text-sm text-white/40">
            最近 {recent.length} 筆 · 勾選後按右上「比較」可並排對照
          </p>
        </div>
        {compare.length >= 2 && (
          <Link
            href={`/compare?addresses=${compare.map(encodeURIComponent).join(",")}`}
            className="rounded-xl border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
          >
            比較 {compare.length} 個地址 →
          </Link>
        )}
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {recent.map((r) => {
          const inCompare = compare.includes(r.address);
          return (
            <li
              key={r.id}
              className="glass group overflow-hidden rounded-2xl p-5 transition hover:border-white/20 hover:bg-white/[0.06]"
            >
              <div className="flex items-start gap-3">
                <Link
                  href={`/report?address=${encodeURIComponent(r.address)}`}
                  className="flex min-w-0 flex-1 items-start gap-4"
                >
                  <div
                    className={clsx(
                      "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl font-black",
                      GRADE_BG[r.overall_grade],
                    )}
                  >
                    {r.overall_grade}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-white">
                      {r.address}
                    </div>
                    {r.display_name && (
                      <div className="truncate text-xs text-white/40">
                        {r.display_name}
                      </div>
                    )}
                    <div className="mt-2 font-mono text-xs tabular-nums text-white/60">
                      {r.overall_score}/100 ·{" "}
                      {new Date(r.saved_at).toLocaleDateString("zh-TW", {
                        month: "numeric",
                        day: "numeric",
                      })}
                    </div>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => onToggle(r.address)}
                  className={clsx(
                    "shrink-0 self-start rounded-full border px-3 py-1 text-[10px] uppercase tracking-widest transition",
                    inCompare
                      ? "border-white bg-white text-black"
                      : "border-white/20 bg-transparent text-white/60 hover:border-white/40 hover:text-white",
                  )}
                >
                  {inCompare ? "已選" : "比較"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
