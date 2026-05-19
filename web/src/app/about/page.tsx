import Link from "next/link";

export const metadata = {
  title: "關於 LiveSafe.tw — 算法與資料來源",
  description: "5 個維度的評分公式、資料來源與已知限制",
};

const DIMENSIONS = [
  {
    key: "earthquake",
    label: "地震風險",
    color: "from-purple-500 to-fuchsia-500",
    formula: `fault_score = 距斷層 < 0.5km → 5
            0.5-1km    → 25
            1-3km      → 50
            3-5km      → 75
            > 5km      → 95

quake_score = 近 5 年 5km 內 M≥5 地震次數
              0 → 100  1 → 75  2 → 55
              3-4 → 35  ≥5 → 15

score = round((fault_score + quake_score) / 2)`,
    sources: [
      "USGS Earthquake Catalog（M≥4，台灣方框，近 5 年）",
      "GEM Global Active Faults Database（台灣 42 條）",
    ],
  },
  {
    key: "air_quality",
    label: "空氣品質",
    color: "from-cyan-400 to-sky-500",
    formula: `AQI ≤ 50  → 100   ≤ 100 → 80
≤ 150 → 55    ≤ 200 → 30
≤ 300 → 15    > 300 → 0`,
    sources: ["環境部 aqx_p_432（即時 AQI，每小時更新）"],
  },
  {
    key: "healthcare",
    label: "醫療可近性",
    color: "from-rose-400 to-pink-500",
    formula: `base      = min(70, 5km 內急救醫院數 × 20)
proximity = max(0, 30 - 最近急救醫院距離(km) × 3)
score     = round(min(100, base + proximity))`,
    sources: ["健保署特約醫事機構（急救責任醫院）"],
  },
  {
    key: "amenities",
    label: "生活機能",
    color: "from-amber-300 to-orange-400",
    formula: `conv_pts  = min(50, 500m 內超商數 × 10)
pharm_pts = min(30, 500m 內藥局數 × 10)
park_pts  = min(20, 500m 內公園數 × 10)
score     = conv_pts + pharm_pts + park_pts`,
    sources: ["OpenStreetMap Overpass API"],
  },
  {
    key: "transit",
    label: "交通便利",
    color: "from-emerald-400 to-teal-500",
    formula: `rail_pts = min(60, 500m 內 rail × 60 + 500-1000m × 30)
bus_pts  = min(40, 500m 內公車站 × 8)
score    = min(100, rail_pts + bus_pts)`,
    sources: ["OpenStreetMap Overpass API"],
  },
];

const COMING = [
  {
    key: "flood",
    label: "淹水潛勢",
    plan: "水利署淹水潛勢圖（650mm/24hr 情境）→ shapefile → PMTiles → R2 hosting",
    status: "需要 PMTiles 工程 spike（規格估時 12h）",
  },
  {
    key: "school_district",
    label: "學區資訊",
    plan: "各縣市教育局學區劃分 CSV（新北、台中已開放，台北市較零散）",
    status: "資料源整合中",
  },
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
          5 個維度等權重平均，每個維度 0-100 分，映射為 A/B/C/D（≥80 A、60-79 B、40-59 C、&lt;40 D）。
        </p>
      </div>

      <section className="mt-12 space-y-6">
        {DIMENSIONS.map((d) => (
          <article
            key={d.key}
            className="glass relative overflow-hidden rounded-2xl p-6"
          >
            <div className="flex items-center gap-3">
              <div
                className={`size-3 rounded-full bg-gradient-to-r ${d.color}`}
              />
              <h2 className="text-xl font-semibold text-white">{d.label}</h2>
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
        <h2 className="text-xl font-bold text-white">即將加入的維度</h2>
        <div className="mt-4 space-y-4">
          {COMING.map((c) => (
            <div key={c.key} className="glass rounded-2xl p-5 opacity-70">
              <h3 className="font-semibold text-white">{c.label}</h3>
              <p className="mt-1 text-sm text-white/60">{c.plan}</p>
              <p className="mt-2 text-xs text-white/40">狀態：{c.status}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-bold text-white">已知限制</h2>
        <ul className="mt-4 space-y-3 text-sm text-white/70">
          <li className="border-l-2 border-white/10 pl-4">
            <strong className="text-white">地理編碼精度</strong>：
            Nominatim 對台灣門牌覆蓋差，僅支援街道級查詢。報告精度為街廓等級。
          </li>
          <li className="border-l-2 border-white/10 pl-4">
            <strong className="text-white">醫院地址解析率</strong>：
            部分急救醫院地址解析失敗，會被排除於計算外，報告會標註。
          </li>
          <li className="border-l-2 border-white/10 pl-4">
            <strong className="text-white">OSM 資料覆蓋</strong>：
            偏鄉地區的超商/藥局/公園/公車站標記可能不完整。
          </li>
          <li className="border-l-2 border-white/10 pl-4">
            <strong className="text-white">即時 vs 歷史</strong>：
            AQI 是即時值（每小時更新），不是年均；長期評估需累積歷史。
          </li>
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-bold text-white">免責聲明</h2>
        <p className="mt-4 text-sm text-white/60">
          本站所有資料均來自政府公開資料平台、USGS、OSM、GEM。
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
