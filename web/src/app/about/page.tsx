import Link from "next/link";
import Script from "next/script";

export const metadata = {
  title: "評分標準與資料來源 — 9 維度居住風險如何計算",
  description:
    "居住安全透視鏡 用政府公開資料（水利署、地調所、環境部、健保署、USGS、OSM）計算 9 個居住安全維度，本頁說明每個維度的評分標準與資料出處。",
  alternates: { canonical: "/about" },
};

interface DimDoc {
  key: string;
  label: string;
  shortAnswer: string;
  rubric: string[];
  sources: string[];
}

const SAFETY_DIMS: DimDoc[] = [
  {
    key: "earthquake",
    label: "地震風險",
    shortAnswer: "距活動斷層越近、近 5 年附近發生中強震越多，分數越低。",
    rubric: [
      "距活動斷層 0.5 公里內視為高風險、5 公里內為中度風險。",
      "近 5 年 5 公里內 M≥5 的中強震次數加重扣分。",
      "斷層距離權重 70%，歷史地震權重 30%（斷層存在即潛在風險）。",
    ],
    sources: [
      "USGS Earthquake Catalog（M≥4，台灣方框，近 5 年）",
      "GEM Global Active Faults Database（台灣 42 條活動斷層）",
    ],
  },
  {
    key: "flood",
    label: "淹水潛勢",
    shortAnswer: "落入水利署淹水潛勢區依淹水深度扣分，無資料縣市標示 N/A。",
    rubric: [
      "依水利署 24 小時累積 650mm 最壞情境的淹水深度分級扣分。",
      "深度越深（3m 以上）分數越低；不在潛勢區直接給高分。",
      "目前涵蓋 19/22 縣市；臺北市公開資料缺漏，該地區標示「資料不可用」並從總評排除。",
    ],
    sources: [
      "水利署淹水潛勢圖 dataset 25766（22 縣市 shapefile）",
    ],
  },
  {
    key: "landslide",
    label: "坊地災害",
    shortAnswer: "距土石流潛勢溪流越近、附近高風險溪流越多，分數越低。",
    rubric: [
      "距土石流潛勢溪流 100m 內為極高風險、1 公里內為中度風險。",
      "1 公里內每多一條「高風險」等級溪流再扣分。",
      "平地都市區一般距離超過 3 公里，分數接近滿分。",
    ],
    sources: ["農業部水土保持署 dataset 147916（111 年度 1729 條潛勢溪流）"],
  },
  {
    key: "air_quality",
    label: "空氣品質",
    shortAnswer: "依最近測站近 1 年 PM2.5 年均 + 不健康天數計分，非即時值。",
    rubric: [
      "PM2.5 年均 12 µg/m³ 以下為良好、35 以上為差。",
      "AQI 橘色（敏感族群不健康）、紅色、紫爆天數累加扣分。",
      "取的是長期年度統計，不受單日異常空品影響。",
    ],
    sources: ["環境部 aqx_p_488 dataset（全國測站歷史日資料）"],
  },
];

const CONV_DIMS: DimDoc[] = [
  {
    key: "healthcare",
    label: "醫療可近性",
    shortAnswer: "5 公里內醫院家數、最近醫院距離、醫學中心是否在範圍內三者加總。",
    rubric: [
      "5 公里內醫院總數採對數飽和計分（避免都會區普遍滿分）。",
      "最近醫院越近、加分越多（每多 1 公里扣 3 分）。",
      "5 公里內每有 1 家醫學中心額外加分（上限 9 分）。",
      "5 公里內查無大型醫療機構則為 0 分。",
    ],
    sources: [
      "健保署急救責任醫院（337 家）",
      "OpenStreetMap 醫院 POI（343 家），合併去重後 680 家",
    ],
  },
  {
    key: "amenities",
    label: "生活機能",
    shortAnswer: "500 公尺內超商、藥局、公園密度。",
    rubric: [
      "超商佔 50 分（10 家頂滿）、藥局 30 分（6 家頂滿）、公園 20 分（4 個頂滿）。",
      "純步行可達範圍評估日常便利度。",
    ],
    sources: ["OpenStreetMap（已預清洗）"],
  },
  {
    key: "transit",
    label: "交通便利",
    shortAnswer: "1 公里內捷運／火車站、500 公尺內公車站密度。",
    rubric: [
      "軌道站佔 60 分（採階梯計分，單站不會直接滿分）。",
      "公車站佔 40 分（10 站頂滿）。",
      "軌道站採嚴格分類（必須為 train/subway/light_rail/tram 子類型）。",
    ],
    sources: ["OpenStreetMap"],
  },
  {
    key: "school_district",
    label: "學校密度",
    shortAnswer: "1 公里內國小、國中、幼兒園加分（不是縣市教育局劃定學區）。",
    rubric: [
      "1 公里內國小、國中、幼兒園各自加分。",
      "本維度為「周邊學校密度」代理指標，並非實際學區範圍。",
    ],
    sources: ["OpenStreetMap（依名稱啟發式分類學制）"],
  },
  {
    key: "nuisance",
    label: "嫌惡設施",
    shortAnswer: "周邊變電所、殯儀館、火葬場、墓地、垃圾場、焚化廠、監獄距離扣分。",
    rubric: [
      "基礎 100 分，按設施類別 + 距離分級扣分（總扣分上限 60）。",
      "變電所、殯儀館、火葬場等高敏感類在 100-500m 內扣分最重。",
      "墓地、監獄等中敏感類影響半徑較大但扣分較輕。",
    ],
    sources: ["OpenStreetMap（7 類嫌惡設施標記）"],
  },
];

const FAQS: Array<{ q: string; a: string }> = [
  {
    q: "居住安全透視鏡 是怎麼算分的？",
    a: "我們把 9 個維度分成安全層（地震、淹水、坊地災害、空品）和便利層（醫療、生活機能、交通、學校密度、嫌惡設施）。安全層佔 60%、便利層佔 40%。每個維度都用政府公開資料計算 0-100 分，最後加權成總分並對應 A/B/C/D 等級（A ≥ 85、B 65-84、C 45-64、D < 45）。",
  },
  {
    q: "我家在斷層帶上嗎？怎麼查？",
    a: "輸入你的地址，居住安全透視鏡 會顯示距最近活動斷層的距離（單位公里）、斷層名稱與類型。距離小於 1 公里需要特別注意建築耐震標準，5 公里內仍屬中度風險範圍。",
  },
  {
    q: "我家會淹水嗎？",
    a: "我們以水利署 24 小時累積 650mm 最壞情境的淹水潛勢圖判斷。若你的地址落入潛勢區，會顯示預估淹水深度（如 0.3-0.5m）；若不在潛勢區，分數較高。臺北市的水利署資料缺漏，該地區會標示「資料不可用」而非假定安全。",
  },
  {
    q: "資料多久更新一次？",
    a: "USGS 地震每日抓取，環境部空品 1 年滾動年均，OSM 每月重新批次清洗。政府災害圖層（水利署淹水、水保署土石流、活動斷層）依官方更新節奏，目前為最新公開版本。",
  },
  {
    q: "居住安全透視鏡 會推薦房子或估價嗎？",
    a: "不會。居住安全透視鏡 純粹是評估工具，不販售房屋資訊、不估價、不抽取任何仲介佣金。所有分數僅供參考，不構成購屋投資建議。",
  },
  {
    q: "為什麼我家總分不高但每個維度都不錯？",
    a: "可能因為某個共線維度（例如醫療、機能、交通在偏鄉同時偏低）拉低便利層加權平均，或安全層中某項（如距斷層較近、淹水深度）扣分較重。可以點各維度卡片看詳細數值，或勾選「不計入總評」做敏感度測試。",
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

function DimensionCard({ d, accent }: { d: DimDoc; accent: string }) {
  return (
    <article className="glass relative overflow-hidden rounded-2xl p-6">
      <div className="flex items-center gap-3">
        <div className={`size-3 rounded-full bg-gradient-to-r ${accent}`} />
        <h3 className="text-xl font-semibold text-white">{d.label}</h3>
      </div>
      <p className="mt-3 text-base text-white/85">{d.shortAnswer}</p>
      <ul className="mt-3 space-y-1.5 text-sm text-white/65">
        {d.rubric.map((r, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-white/30">·</span>
            <span>{r}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 border-t border-white/[0.06] pt-3 text-xs text-white/40">
        <span className="font-semibold text-white/60">資料來源：</span>
        {d.sources.join(" · ")}
      </div>
    </article>
  );
}

const SAFETY_ACCENTS: Record<string, string> = {
  earthquake: "from-purple-500 to-fuchsia-500",
  flood: "from-blue-500 to-cyan-500",
  landslide: "from-amber-600 to-rose-600",
  air_quality: "from-cyan-400 to-sky-500",
};

const CONV_ACCENTS: Record<string, string> = {
  healthcare: "from-rose-400 to-pink-500",
  amenities: "from-amber-300 to-orange-400",
  transit: "from-emerald-400 to-teal-500",
  school_district: "from-violet-400 to-purple-500",
  nuisance: "from-zinc-400 to-slate-500",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 pb-24">
      <Script
        id="ld-faq-about"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD_FAQ) }}
      />

      <div className="mt-4">
        <p className="text-xs uppercase tracking-[0.3em] text-white/40">About</p>
        <h1 className="mt-2 text-4xl font-bold text-white md:text-5xl">
          評分標準與資料來源
        </h1>
        <p className="mt-4 text-base text-white/70">
          居住安全透視鏡 用 9 個維度評估居住安全，分成 <strong className="text-white">安全層 (60%)</strong> 與
          <strong className="text-white"> 便利層 (40%)</strong> 加權後得到總分。
          總分對應四個等級：A ≥ 85、B 65–84、C 45–64、D &lt; 45。
        </p>
        <p className="mt-2 text-sm text-white/50">
          所有資料皆來自政府公開資料、USGS、GEM、OpenStreetMap，每月批次更新。
        </p>
      </div>

      <section className="glass mt-8 rounded-2xl p-6">
        <h2 className="text-xl font-semibold text-white">總分怎麼算？</h2>
        <p className="mt-3 text-base text-white/80">
          安全層（地震、淹水、坊地災害、空品）為「不可逆 / 人命級」風險，採等權平均；
          便利層（醫療、機能、交通、學校密度、嫌惡設施）為「生活品質」項目，採加權平均，
          避免醫療／交通／機能等都市化指標被疊加計分。使用者可以勾選任一維度不計入總分。
        </p>
      </section>

      <section className="mt-12">
        <p className="text-xs uppercase tracking-[0.3em] text-white/40">
          Safety Layer · 60%
        </p>
        <h2 className="mt-2 text-2xl font-bold text-white">安全層維度</h2>
      </section>

      <section className="mt-6 space-y-5">
        {SAFETY_DIMS.map((d) => (
          <DimensionCard key={d.key} d={d} accent={SAFETY_ACCENTS[d.key] ?? "from-white to-white/60"} />
        ))}
      </section>

      <section className="mt-12">
        <p className="text-xs uppercase tracking-[0.3em] text-white/40">
          Convenience Layer · 40%
        </p>
        <h2 className="mt-2 text-2xl font-bold text-white">便利層維度</h2>
      </section>

      <section className="mt-6 space-y-5">
        {CONV_DIMS.map((d) => (
          <DimensionCard key={d.key} d={d} accent={CONV_ACCENTS[d.key] ?? "from-white to-white/60"} />
        ))}
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-bold text-white">常見問題</h2>
        <div className="mt-6 space-y-4">
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

      <section className="mt-12">
        <h2 className="text-xl font-bold text-white">已知限制</h2>
        <ul className="mt-4 space-y-3 text-sm text-white/70">
          <li className="border-l-2 border-white/10 pl-4">
            <strong className="text-white">地理編碼精度</strong>：地址查詢採 Nominatim，
            僅支援街道級（縣市 + 行政區 + 路名），不處理門牌號。報告精度為街廓等級。
          </li>
          <li className="border-l-2 border-white/10 pl-4">
            <strong className="text-white">臺北市淹水資料缺漏</strong>：
            水利署公開檔案中臺北市為空檔，目前該地區標示為「資料不可用」並從總評排除，
            而非假定為「不在潛勢區 = 安全」。
          </li>
          <li className="border-l-2 border-white/10 pl-4">
            <strong className="text-white">OSM 標記覆蓋差異</strong>：
            偏鄉地區的超商、藥局、公園、公車站、嫌惡設施等 OpenStreetMap 標記可能不完整。
          </li>
          <li className="border-l-2 border-white/10 pl-4">
            <strong className="text-white">尚未納入的維度</strong>：
            土壤液化潛勢、治安犯罪率、噪音等資料源整合中。
          </li>
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-bold text-white">免責聲明</h2>
        <p className="mt-4 text-sm text-white/60">
          本站所有資料均來自政府公開資料平台（環境部、水利署、農業部水土保持署、健保署）、USGS、GEM 及 OpenStreetMap。
          分數僅為參考指標，不構成任何購屋、租屋、投資建議。若發現資料錯誤請透過{" "}
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
          ← 回首頁查詢地址
        </Link>
      </div>
    </div>
  );
}
