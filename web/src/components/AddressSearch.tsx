"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";

interface Props {
  initial?: string;
  autoFocus?: boolean;
  size?: "hero" | "compact";
}

export function AddressSearch({
  initial = "",
  autoFocus = false,
  size = "hero",
}: Props) {
  const [value, setValue] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = value.trim();
    if (!v) return;
    startTransition(() => {
      router.push(`/report?address=${encodeURIComponent(v)}`);
    });
  }

  const isHero = size === "hero";

  return (
    <form onSubmit={onSubmit} className="w-full">
      <div
        className={clsx(
          "group glass relative flex items-center overflow-hidden rounded-2xl transition",
          "focus-within:border-white/30 focus-within:shadow-[0_0_60px_-20px_rgba(168,85,247,0.6)]",
          isHero ? "p-1.5" : "p-1",
        )}
      >
        <input
          type="text"
          inputMode="search"
          autoFocus={autoFocus}
          placeholder="例：台北市信義區松壽路"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className={clsx(
            "flex-1 bg-transparent px-4 outline-none placeholder:text-white/30",
            isHero ? "py-4 text-lg md:text-xl" : "py-2.5 text-base",
          )}
          required
        />
        <button
          type="submit"
          disabled={isPending || !value.trim()}
          className={clsx(
            "rounded-xl bg-white px-6 font-semibold text-black transition",
            "hover:bg-white/90 active:scale-95",
            "disabled:cursor-not-allowed disabled:opacity-40",
            isHero ? "py-3 text-base" : "py-2 text-sm",
          )}
        >
          {isPending ? "查詢中…" : "查詢"}
        </button>
      </div>
      {isHero && (
        <p className="mt-3 text-center text-sm text-white/40">
          建議輸入「縣市 + 行政區 + 路名」，目前不支援門牌號（地理編碼限制）
        </p>
      )}
    </form>
  );
}
