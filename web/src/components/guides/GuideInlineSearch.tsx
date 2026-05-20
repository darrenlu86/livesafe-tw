import { AddressSearch } from "@/components/AddressSearch";

interface Props {
  headline?: string;
  helper?: string;
  examples?: string[];
}

export function GuideInlineSearch({
  headline = "立刻查這個地址",
  helper = "輸入縣市 + 行政區 + 路名，30 秒拿到完整 9 維度評分",
  examples,
}: Props) {
  return (
    <section className="glass relative my-12 overflow-hidden rounded-3xl p-6 md:p-8">
      <div
        className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full opacity-30 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(52,211,153,0.6) 0%, transparent 70%)",
        }}
      />
      <div className="relative">
        <h2 className="text-xl font-bold text-white md:text-2xl">{headline}</h2>
        <p className="mt-2 text-sm text-white/60">{helper}</p>
        <div className="mt-5">
          <AddressSearch size="hero" />
        </div>
        {examples && examples.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="text-xs text-white/40">試試看：</span>
            {examples.map((addr) => (
              <a
                key={addr}
                href={`/report?address=${encodeURIComponent(addr)}`}
                className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-white/70 transition hover:border-white/30 hover:bg-white/10 hover:text-white"
              >
                {addr}
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
