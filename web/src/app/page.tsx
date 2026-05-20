import Link from "next/link";
import Script from "next/script";
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
    title: "9 維度 A／B／C／D 評分",
    body: "安全層 60% + 便利層 40% 雙層加權，雷達圖一眼看出強弱項。",
  },
  {
    step: "Step 3",
    title: "並排比較 2-4 個物件",
    body: "看房過程中查過的地址都會留存，可勾選 2-4 個並排比較。",
  },
];

const DIM_CHIPS = [
  { label: "地震斷層", icon: "🏯" },
  { label: "淹水潛勢", icon: "🌊" },
  { label: "坊地災害", icon: "⛰" },
  { label: "空氣品質", icon: "💨" },
  { label: "醫療可近性", icon: "🏥" },
  { label: "生活機能", icon: "🏪" },
  { label: "交通便利", icon: "🚇" },
  { label: "學校密度", icon: "🏫" },
  { label: "嫌惡設施", icon: "⚠️" },
];

const FAQS = [
  {
    q: "居住安全透視鏡怎麼用？",
    a: "在輸入框輸入你的地址（縣市 + 行政區 + 路名），系統會在 30 秒內回傳 9 個維度的居住安全評分，並以 A/B/C/D 等級標示總分。",
  },
  {
    q: "支援台灣全國嗎？",
    a: "支援。台灣 22 縣市皆可查詢，但臺北市的淹水資料因水利署公開檔案缺漏，該維度會標示「資料不可用」並從總評排除。",
  },
  {
    q: "資料準確嗎？來源是哪裡？",
    a: "所有資料皆來自政府公開資料平台（水利署、農業部水土保持署、環境部、健保署）、USGS、GEM 全球活動斷層資料庫與 OpenStreetMap。每月批次更新。",
  },
  {
    q: "需要登入或付費嗎？",
    a: "不需要。居住安全透視鏡完全免費、不需註冊，也不販售房屋資訊或抽取任何仲介佣金。",
  },
];

const JSON_LD_FAQ = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function HomePage() {
  return (
    <div className="mx-auto max-w-3xl px-6 pt-12 pb-16">
      <Script
        id="ld-faq-home"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD_FAQ) }}
      />

      <section className="text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-white/60">
          <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_currentColor]" />
          9 個維度 · 政府公開資料 · 免費工具
        </div>
        <h1 className="font-display text-5xl font-bold leading-tight tracking-tight text-white md:text-7xl">
          買房前的
          <br />
          <span className="bg-gradient-to-r from-emerald-300 via-cyan-300 to-purple-400 bg-clip-text text-transparent">
            一站式查核報告
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base text-white/65 md:text-lg">
          輸入地址，30 秒拿到 9 維度居住安全評分：
          <strong className="text-white/85">地震斷層、淹水潛勢、土石流、空品、醫療、嫌惡設施</strong>。
          政府公開資料整合，不賣房、不估價、不抽佣。
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

      <section className="mt-24">
        <h2 className="mb-3 text-center text-2xl font-bold text-white">
          9 個維度，安全與便利兼顧
        </h2>
        <p className="mb-8 text-center text-sm text-white/55">
          安全層 60%（地震、淹水、坊地、空品）+ 便利層 40%（醫療、機能、交通、學校、嫌惡設施）
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {DIM_CHIPS.map((d) => (
            <span
              key={d.label}
              className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-white/75"
            >
              <span className="mr-1.5">{d.icon}</span>
              {d.label}
            </span>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link
            href="/about"
            className="text-sm text-cyan-300 hover:text-cyan-200"
          >
            看每個維度的評分標準與資料來源 →
          </Link>
        </div>
      </section>

      <section className="mt-24">
        <h2 className="mb-8 text-center text-2xl font-bold text-white">
          常見問題
        </h2>
        <div className="space-y-3">
          {FAQS.map((f, i) => (
            <details
              key={i}
              className="glass group rounded-2xl px-5 py-4 open:bg-white/[0.05]"
            >
              <summary className="cursor-pointer list-none text-base font-semibold text-white marker:hidden">
                <span className="mr-2 text-white/40">Q.</span>
                {f.q}
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-white/75">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
