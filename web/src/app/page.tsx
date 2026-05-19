import { AddressSearch } from "@/components/AddressSearch";
import { RecentList } from "@/components/RecentList";

const EXAMPLE_ADDRESSES = [
  "台北市信義區松壽路",
  "新北市板橋區文化路一段",
  "花蓮縣花蓮市中山路",
  "台中市西區美村路",
  "高雄市鳳山區",
];

const FEATURES = [
  {
    step: "Step 1",
    title: "輸入地址",
    body: "輸入縣市 + 行政區 + 路名，系統自動 geocoding 取得座標。",
  },
  {
    step: "Step 2",
    title: "綜合評分 A／B／C／D",
    body: "5 個維度等權重平均，雷達圖一眼看出強弱項。",
  },
  {
    step: "Step 3",
    title: "比較多個物件",
    body: "看房過程中查過的地址都會留存，可勾選 2-4 個並排比較。",
  },
];

export default function HomePage() {
  return (
    <div className="mx-auto max-w-3xl px-6 pt-12 pb-16">
      <section className="text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-white/60">
          <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_currentColor]" />
          5 個維度 · 政府公開資料
        </div>
        <h1 className="font-display text-5xl font-bold leading-tight tracking-tight text-white md:text-7xl">
          這個地段
          <br />
          <span className="bg-gradient-to-r from-emerald-300 via-cyan-300 to-purple-400 bg-clip-text text-transparent">
            值得搬進來嗎？
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base text-white/60 md:text-lg">
          輸入地址，30 秒看懂地震、空品、醫療、交通、生活機能 ——
          純粹的居住評估，不賣房、不估價。
        </p>

        <div className="mt-10">
          <AddressSearch autoFocus size="hero" />
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs text-white/40">試試看：</span>
          {EXAMPLE_ADDRESSES.map((addr) => (
            <a
              key={addr}
              href={`/report?address=${encodeURIComponent(addr)}`}
              className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-white/60 transition hover:border-white/30 hover:bg-white/10 hover:text-white"
            >
              {addr}
            </a>
          ))}
        </div>
      </section>

      <RecentList />

      <section className="mt-24">
        <h2 className="mb-8 text-center text-2xl font-bold text-white">
          你會看到什麼
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="glass relative overflow-hidden rounded-2xl p-6"
            >
              <div className="text-sm uppercase tracking-widest text-white/40">
                {f.step}
              </div>
              <h3 className="mt-2 text-lg font-semibold text-white">
                {f.title}
              </h3>
              <p className="mt-2 text-sm text-white/60">{f.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
