import { clsx } from "clsx";
import type { Grade } from "@/lib/types";

const GRADE_STYLES: Record<Grade, string> = {
  A: "from-emerald-400 via-emerald-300 to-teal-400",
  B: "from-amber-300 via-yellow-300 to-orange-300",
  C: "from-orange-400 via-orange-500 to-rose-400",
  D: "from-rose-400 via-pink-500 to-fuchsia-500",
};

const GRADE_LABEL: Record<Grade, string> = {
  A: "宜居",
  B: "尚可",
  C: "留意",
  D: "高風險",
};

interface Props {
  grade: Grade;
  score: number;
  size?: "lg" | "md" | "sm";
  showLabel?: boolean;
}

export function GradeBadge({
  grade,
  score,
  size = "lg",
  showLabel = true,
}: Props) {
  const isLg = size === "lg";
  const isMd = size === "md";
  return (
    <div className={clsx("flex flex-col items-center", isLg && "gap-3")}>
      <div
        className={clsx(
          "relative inline-flex items-center justify-center font-black tracking-tighter",
          "bg-gradient-to-br bg-clip-text text-transparent",
          GRADE_STYLES[grade],
          isLg && "text-[160px] leading-none md:text-[200px]",
          isMd && "text-[80px] leading-none",
          size === "sm" && "text-4xl leading-none",
        )}
        style={{ filter: "drop-shadow(0 0 30px currentColor)" }}
        aria-label={`居住評等 ${grade}`}
      >
        {grade}
      </div>
      {isLg && (
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-2xl tabular-nums text-white/90">
            {score}
          </span>
          <span className="text-sm text-white/40">/ 100</span>
          {showLabel && (
            <span className="ml-2 text-sm uppercase tracking-widest text-white/60">
              {GRADE_LABEL[grade]}
            </span>
          )}
        </div>
      )}
      {!isLg && showLabel && (
        <div className="font-mono text-xs tabular-nums text-white/60">
          {score}/100
        </div>
      )}
    </div>
  );
}
