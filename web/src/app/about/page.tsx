import Link from "next/link";

export const metadata = {
  title: "關於 LiveSafe.tw — 算法與資料來源",
  description: "9 個維度的評分公式、雙層加權架構、資料來源與已知限制",
};

const SAFETY_DIMS = [
  {
    key: "earthquake",
    label: "地震風險",
    color: "from-purple-500 to-fuchsia-500",
    formula: `fault_score = 距活動斷層
            < 0.5km → 5    0.5-1km → 25
            1-3km   → 50   3-5km   → 75
            > 5km   → 85   (台灣島基準震災風險，不給滿)

quake_score = 近 5 年 5km 內 M≥5 地震次數
              0 → 100   1 → 75   2 → 55
              3-4 → 35  ≥5 → 15

score = round(fault_score × 0.7 + quake_score × 0.3)

設計：斷層存在即「潛在風險」（即使無震），故 fault 主導 70%。`,
    sources: [
      "USGS Earthquake Catalog（M≥4，台灣方框，近 5 年）",
      "GEM Global Active Faults Database（台灣 42 條）",
    ],
  },
  {
    key: "flood",
    label: "淹水潛勢",
    color: "from-blue-500 to-cyan-500",
    formula: `落入水利署淹水潛勢圖（24h 累積 650mm 最壞情境）
   depth 0-0.3m → 70    0.3-0.5m → 50
        0.5-1m → 30    1-2m    → 15
        2-3m   → 8     >3m     → 3

不在潛勢區內 → 95

涵蓋 19/22 縣市。臺北市資料源缺漏（公開 7z 是空檔），
此地區標示為「資料不可用 (N/A)」並從總評排除，
不再假裝為「不在潛勢區 = 95」。`,
    sources: [
      "水利署 25766 dataset（22 縣市 shapefile，pre-process dissolve + simplify）",
    ],
  },
  {
    key: "landslide",
    label: "坊地災害",
    color: "from-amber-600 to-rose-600",
    formula: `距最近土石流潛勢溪流距離（point-to-polyline）
   < 0.1km → 20   0.1-0.3km → 40
   0.3-0.5km → 55  0.5-1km   → 70
   1-2km   → 82   2-3km     → 90
   > 3km   → 95

1km 內每條「高風險」溪流額外 -5（cap -15）`,
    sources: ["農業部水土保持署 147916（111 年度 1729 條潛勢溪流）"],
  },
  {
    key: "air_quality",
    label: "空氣品質",
    color: "from-cyan-400 to-sky-500",
    formula: `base（PM2.5 年均，μg/m³）：
   ≤12 → 100   ≤15 → 85   ≤25 → 70
   ≤35 → 50    ≤50 → 25   >50 → 10

扣分：
   橘色 101-150  AQI  : -0.4/day  (cap -12)
   紅色 151-200  AQI  : -2/day    (cap -20)
   紫爆 >200     AQI  : -3/day    (cap -15)

採近 1 年長期統計，非即時值。`,
    sources: ["環境部 aqx_p_488（測站歷史日資料）"],
  },
];

const CONV_DIMS = [
  {
    key: "healthcare",
    label: "醫療可近性",
    color: "from-rose-400 to-pink-500",
    formula: `base      = min(60, 10 × ln(1 + n))   // 對數飽和
                                           // n=5 ≈ 18, n=10 ≈ 24
                                           // n=30 ≈ 34, n=100 ≈ 46
proximity = max(0, 30 - 最近醫院距離(km) × 3)
mc_bonus  = min(9, 5km 內醫學中心 × 3)
score     = round(min(100, base + proximity + mc_bonus))

5km 內 0 家 → 0 分 + 「無大型醫療機構」標註`,
    sources: [
      "健保署急救責任醫院（337）",
      "OpenStreetMap 醫院（343），合併去重 → 680 家",
    ],
  },
  {
    key: "amenities",
    label: "生活機能",
    color: "from-amber-300 to-orange-400",
    formula: `conv_pts  = min(50, 500m 內超商  × 5)   // 10 家頂滿
pharm_pts = min(30, 500m 內藥局  × 5)   // 6  家頂滿
park_pts  = min(20, 500m 內公園  × 5)   // 4  個頂滿
score     = conv_pts + pharm_pts + park_pts`,
    sources: ["OpenStreetMap（pre-process bundled）"],
  },
  {
    key: "transit",
    label: "交通便利",
    color: "from-emerald-400 to-teal-500",
    formula: `rail_pts = min(60, 500m 內 rail × 30 + 500m-1km × 15)
            // 2 站 500m 內才滿；1 站直接吃滿的天花板效應已修
bus_pts  = min(40, 500m 內公車站 × 4)   // 10 站才滿
score    = min(100, rail_pts + bus_pts)

rail 採嚴格 OSM tag 過濾：必須有
train/subway/light_rail/tram=yes 子類型。`,
    sources: ["OpenStreetMap（pre-process bundled）"],
  },
  {
    key: "school_district",
    label: "學校密度",
    color: "from-violet-400 to-purple-500",
    formula: `base = 30
1km 內國小 ≥1 → +25      國小 ≥2 → +10
1km 內國中 ≥1 → +20      幼兒園 ≥1 → +10
1km 內 K-12 ≥3 → +5

註：周邊密度代理，非各縣市實際劃定學區。`,
    sources: ["OpenStreetMap（依 OSM tag + 名稱啟發式分類學制）"],
  },
  {
    key: "nuisance",
    label: "嫌惡設施",
    color: "from-zinc-400 to-slate-500",
    formula: `base 100，按距離扣分（七類，總扣分 cap -60）：
  變電所:  <100m -25  <300m -10  <500m  -5
  殯儀館:  <300m -20  <500m -12  <1km   -5
  火葬場:  <500m -25  <1km  -15  <2km   -5
  墓地:    <200m -10  <500m  -5
  垃圾場:  <500m -25  <1km  -12  <2km   -5
  焚化廠:  <1km  -25  <2km  -12
  監獄:    <500m -15  <1km   -8`,
    sources: ["OpenStreetMap（7 類嫌惡設施，pre-process bundled）"],
  },
];

const PIPELINE = [
  "data-pipeline/ Python ETL：每月手動排程，把所有政府開放資料 / OSM Overpass 抓回來清洗（去除 disused、tag 語意過濾、同名同址去重），輸出到 worker/src/data/*.json。",
  "worker/ Cloudflare Workers（Hono + TypeScript）：bundle 內含所有清洗過的靜態資料集，對外只做 in-memory spatial lookup（haversine / point-in-polygon / point-to-segment + bbox prefilter），無任何 OSM live call。",
  "web/ Next.js 16 + Recharts + OpenNext：每張維度卡 progressive loading，獨立 fetch /api/dim/:key，使用者可勾選不計入總評（localStorage 持久化）。",
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 pb-24">
      <div className="mt-4">
        <p className="text-xs uppercase tracking-[0.3em] text-white/40">
          About
        </p>
        <h1 className="mt-2 text-4xl font-bold text-white md:text-5xl">
          算法與資料來源
        </h1>
        <p className="mt-4 text-base text-white/60">
          9 個維度，雙層加權：<strong className="text-white">安全層 60% + 便利層 40%</strong>。
          每個維度 0-100 分，總評映射為 A/B/C/D（≥85 A、65-84 B、45-64 C、&lt;45 D）。
          使用者可勾選任一維度不計入總評（層內被排除即不參與該層平均）。
        </p>
        <p className="mt-2 text-sm text-white/50">
          v2 (2026-05-20)：調整便利層為加權平均、地震 baseline、A 級門檻 80→85、flood 缺漏標 N/A。
        </p>
      </div>

      <section className="glass mt-8 rounded-2xl p-6">
        <h2 className="text-xl font-semibold text-white">總評（overall）</h2>
        <pre className="mt-4 overflow-x-auto rounded-lg bg-black/40 p-4 font-mono text-xs leading-relaxed text-emerald-300">{`safety_avg = avg(地震, 淹水, 坊地災害, 空品)       // 等權
              ↳ flood data_available=false 時自動排除

convenience_avg = 加權平均（避免共線維度疊加都市加分）：
                  healthcare 0.35
                  transit    0.25
                  amenities  0.20
                  school     0.10
                  nuisance   0.10

score = round(safety_avg × 0.6 + convenience_avg × 0.4)
若某層全部被排除 → 自動退化為單層。`}</pre>
        <p className="mt-3 text-sm text-white/60">
          安全層含「不可逆 / 人命級」風險（地震、淹水、坊地、長期空污），採等權平均；
          便利層含「生活品質」項目，採加權平均以避免 healthcare/transit/amenities
          三個高度共線的「都市化指標」被計三次。
        </p>
      </section>

      <section className="mt-12">
        <p className="text-xs uppercase tracking-[0.3em] text-white/40">
          Safety 60%
        </p>
        <h2 className="mt-2 text-2xl font-bold text-white">安全層維度</h2>
      </section>

      <section className="mt-6 space-y-6">
        {SAFETY_DIMS.map((d) => (
          <article
            key={d.key}
            className="glass relative overflow-hidden rounded-2xl p-6"
          >
            <div className="flex items-center gap-3">
              <div
                className={`size-3 rounded-full bg-gradient-to-r ${d.color}`}
              />
              <h3 className="text-xl font-semibold text-white">{d.label}</h3>
            </div>
            <pre className="mt-4 overflow-x-auto rounded-lg bg-black/40 p-4 font-mono text-xs leading-relaxed text-emerald-300">
              {d.formula}
            </pre>
            <ul className="mt-3 space-y-1 text-sm text-white/60">
              {d.sources.map((s) => (
                <li key={s}>· {s}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section className="mt-12">
        <p className="text-xs uppercase tracking-[0.3em] text-white/40">
          Convenience 40%
        </p>
        <h2 className="mt-2 text-2xl font-bold text-white">便利層維度</h2>
      </section>

      <section className="mt-6 space-y-6">
        {CONV_DIMS.map((d) => (
          <article
            key={d.key}
            className="glass relative overflow-hidden rounded-2xl p-6"
          >
            <div className="flex items-center gap-3">
              <div
                className={`size-3 rounded-full bg-gradient-to-r ${d.color}`}
              />
              <h3 className="text-xl font-semibold text-white">{d.label}</h3>
            </div>
            <pre className="mt-4 overflow-x-auto rounded-lg bg-black/40 p-4 font-mono text-xs leading-relaxed text-emerald-300">
              {d.formula}
            </pre>
            <ul className="mt-3 space-y-1 text-sm text-white/60">
              {d.sources.map((s) => (
                <li key={s}>· {s}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-bold text-white">資料管線</h2>
        <ol className="mt-4 space-y-3 text-sm text-white/70">
          {PIPELINE.map((p, i) => (
            <li key={i} className="flex gap-3">
              <span className="font-mono text-white/40">{i + 1}.</span>
              <span>{p}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-bold text-white">已知限制</h2>
        <ul className="mt-4 space-y-3 text-sm text-white/70">
          <li className="border-l-2 border-white/10 pl-4">
            <strong className="text-white">天花板效應</strong>：醫療、機能、交通、學校在
            都會密集區普遍接近 100 分，便利層區分度較低。已知議題，待調整。
          </li>
          <li className="border-l-2 border-white/10 pl-4">
            <strong className="text-white">地理編碼精度</strong>：
            Nominatim 對台灣門牌覆蓋差，僅支援街道級查詢。報告精度為街廓等級。
          </li>
          <li className="border-l-2 border-white/10 pl-4">
            <strong className="text-white">臺北市淹水資料缺漏</strong>：
            水利署 22 縣市 7z 中臺北市檔案為空，目前 fallback 視為「不在潛勢區」（可能誤報為安全）。
          </li>
          <li className="border-l-2 border-white/10 pl-4">
            <strong className="text-white">OSM 覆蓋差異</strong>：
            偏鄉地區的超商/藥局/公園/公車站、以及嫌惡設施（殯儀館、變電所）的 OSM 標記可能不完整。
          </li>
          <li className="border-l-2 border-white/10 pl-4">
            <strong className="text-white">尚未納入的維度</strong>：
            土壤液化（中地調所 dataset 尚未取得 22 縣市齊備版本）、治安犯罪率（警政署無 per-district open API）、
            噪音（無公開歷史資料）。
          </li>
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-bold text-white">免責聲明</h2>
        <p className="mt-4 text-sm text-white/60">
          本站所有資料均來自政府公開資料平台（環境部、水利署、農業部水土保持署、健保署）、USGS、OSM、GEM。
          分數僅為參考指標，不構成任何購屋、租屋、投資建議。
          若發現資料錯誤請透過{" "}
          <a
            href="https://github.com/darrenlu86/livesafe-tw/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-300 hover:text-cyan-200"
          >
            GitHub issue
          </a>{" "}
          回報。
        </p>
      </section>

      <div className="mt-12">
        <Link
          href="/"
          className="rounded-xl border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/10"
        >
          ← 回首頁
        </Link>
      </div>
    </div>
  );
}
