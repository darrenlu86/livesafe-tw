import type { Metadata } from "next";
import {
  GuideArticle,
  GuideSection,
  GuideCallout,
  GuideTable,
} from "@/components/guides/GuideArticle";
import { GuideHero } from "@/components/guides/GuideHero";
import { GuideInlineSearch } from "@/components/guides/GuideInlineSearch";
import { GuideFAQ } from "@/components/guides/GuideFAQ";
import { GuideRelated } from "@/components/guides/GuideRelated";

const SLUG = "taichung-flood-risk";
const TITLE = "台中淹水危險地區分析：西屯、烏日、大里要注意嗎？";
const DESC =
  "台中近年淹水熱區、排水改善現況、各行政區風險分級。輸入地址直接查水利署 24h 650mm 情境下的淹水深度。";

export const metadata: Metadata = {
  title: "台中淹水危險地區分析：哪些區域要注意？評分查詢",
  description: DESC,
  alternates: { canonical: `/guides/${SLUG}` },
  openGraph: {
    title: TITLE,
    description: DESC,
    url: `https://livesafe.oharalab.com/guides/${SLUG}`,
    type: "article",
    locale: "zh_TW",
  },
};

const DISTRICT_RISK = [
  ["西屯區", "中高", "近年多次積水（青海路、河南路一帶），地勢偏低"],
  ["南屯區", "中高", "麻園頭溪流域，治水中段優先處理區"],
  ["烏日區", "高", "大肚溪與大里溪匯流區，歷史淹水熱點"],
  ["大里區", "中高", "大里溪流域，2008、2017 有過嚴重淹水"],
  ["太平區", "中", "太平大排周邊，部分區段淹水"],
  ["北屯區", "中", "旱溪、廍子溪部分流域低地"],
  ["北區", "中低", "大致較安全，舊台中市區地勢較高"],
  ["西區", "低", "勤美、忠明、台中公園一帶地勢較高"],
  ["東區", "中", "新建南北段路淹過水"],
  ["龍井區", "中", "靠海低地"],
  ["梧棲區", "中", "靠海低地 + 排水量問題"],
  ["大甲區", "中低", "大甲溪流域部分低地"],
  ["豐原區", "低", "地勢較高"],
];

const FAQS = [
  {
    q: "台中市區到底會不會淹水？",
    a: "舊市區（北區、西區、中區）大致較安全，地勢偏高 + 排水改善較完整。會淹水的主要是西屯、南屯、烏日、大里、太平等近年發展中的區段，這些區域：1) 地勢較低；2) 過去是農田快速都市化，排水系統來不及；3) 大肚溪、大里溪、麻園頭溪等流域低地。",
  },
  {
    q: "西屯區淹水嚴重嗎？",
    a: "西屯區部分區段（青海路、河南路、福星路一帶）近年確實多次積水。但西屯區範圍大，七期重劃區、福科路一帶地勢較高、排水較完整、淹水風險低。買西屯區的房子建議用 LiveSafe 直接查具體地址——同一區可能差很多。",
  },
  {
    q: "烏日區為什麼是淹水高風險區？",
    a: "烏日位於大肚溪與大里溪匯流處，地勢偏低。歷史上 2008 莫拉克、2017 6 月豪雨都曾造成嚴重淹水。近年雖然有排水改善工程（如烏日溪治理），但仍是台中相對高風險的區段。買烏日房子要特別查淹水潛勢深度。",
  },
  {
    q: "台中近年的治水工程有沒有改善淹水？",
    a: "有，特別是大里溪整治、麻園頭溪治水工程、西屯區排水改善都顯著降低淹水機率。但「機率降低」不等於「不會淹」——水利署的潛勢圖反映的是「24 小時下 650mm 最壞情境」會淹哪裡，這仍是長期風險評估的參考標準。新建房屋因為地基墊高，實際淹水機率可能比舊建築低。",
  },
  {
    q: "台中買房只看淹水夠嗎？",
    a: "不夠。台中還要看：1) 車籠埔斷層（豐原、東勢方向）— 921 主震面；2) 空氣品質（沙鹿、龍井受台中火力發電廠影響）；3) 嫌惡設施（烏日焚化廠周邊）。建議用 LiveSafe 完整 9 維度報告一次評估。",
  },
  {
    q: "新建案標榜「不淹水社區」可信嗎？",
    a: "部分可信但要驗證。新建案的「不淹水」通常指：1) 地基墊高 0.5-1 公尺；2) 一樓不做住宅用途（停車場、商業空間）；3) 社區內部排水系統獨立。這些確實能降低住宅單元淹水機率，但社區外的路面、機電房、地下停車場仍可能淹。LiveSafe 的分數反映「地段風險」，不會反映建案個別工程。",
  },
];

const RELATED = [
  {
    href: "/guides/flood-risk-check",
    label: "我家會淹水嗎？水利署淹水潛勢一鍵查",
    hook: "全台 22 縣市淹水查詢方式與深度判讀。",
  },
  {
    href: "/guides/home-safety-checklist",
    label: "買房前必查的 9 個居住風險完整指南",
    hook: "淹水只是其中一項，看完整 9 維度怎麼評估。",
  },
  {
    href: "/guides/earthquake-fault-check",
    label: "斷層查詢：我家在斷層帶上嗎？",
    hook: "台中也有車籠埔斷層，買房時應一併查。",
  },
];

export default function TaichungFloodRiskPage() {
  return (
    <GuideArticle
      slug={SLUG}
      title={TITLE}
      description={DESC}
      datePublished="2026-05-21"
    >
      <GuideHero
        category="淹水 · 台中"
        title={TITLE}
        intro="台中近年快速發展，西屯、南屯、烏日、大里這些「新興都會區」其實是淹水熱區。舊市區（北區、西區）反而較安全。這篇逐個行政區拆解淹水風險，並對照台中近年的治水改善現況。"
        updatedAt="2026-05-21"
      />

      <GuideSection title="台中近年淹水事件回顧">
        <p>
          <strong>2017 年 6 月、2018 年 8 月、2024 年 7 月都有大範圍淹水紀錄。</strong>
        </p>
        <ul className="ml-6 list-disc space-y-1.5">
          <li>
            <strong>2017-06-02 豪雨</strong>：太平、大里、烏日多處淹水 50cm 以上，
            車輛泡水嚴重。
          </li>
          <li>
            <strong>2018-08-23 熱低壓</strong>：西屯青海路、南屯黎明路積水 30-60cm。
          </li>
          <li>
            <strong>2024 年颱風</strong>：海葵、凱米陸續造成中部多處淹水，太平、烏日
            部分區段達 1 公尺以上。
          </li>
        </ul>
      </GuideSection>

      <GuideInlineSearch
        headline="先查台中地址"
        helper="輸入縣市 + 行政區 + 路名，查水利署淹水潛勢深度"
        examples={[
          "台中市西屯區青海路二段",
          "台中市烏日區光明路",
          "台中市大里區國光路",
          "台中市北屯區崇德路",
        ]}
      />

      <GuideSection title="台中各行政區淹水風險">
        <p>
          <strong>下表為各行政區整體風險定性參考，實際分數依具體地址而定。</strong>
        </p>
        <GuideTable
          headers={["行政區", "風險等級", "說明"]}
          rows={DISTRICT_RISK}
        />
        <GuideCallout variant="info">
          風險等級為整體參考，同一個行政區內地勢、排水條件可能差很多。
          西屯區的七期重劃區跟青海路一帶風險就明顯不同。
        </GuideCallout>
      </GuideSection>

      <GuideSection title="台中市排水改善工程現況">
        <p>
          台中市政府近 5 年的主要治水工程：
        </p>
        <ul className="ml-6 list-disc space-y-1.5">
          <li>
            <strong>大里溪整治</strong>：堤防加高 + 滯洪池建設（爽文滯洪池、頂湖滯洪池）。
          </li>
          <li>
            <strong>麻園頭溪治水</strong>：南屯、北屯排水改善。
          </li>
          <li>
            <strong>西屯區排水改善</strong>：青海路一帶箱涵擴建。
          </li>
          <li>
            <strong>烏日溪治理</strong>：堤防加高 + 排水量提升。
          </li>
        </ul>
        <p>
          這些工程把「常見豪雨淹水機率」明顯下降，但水利署的潛勢圖是用「24 小時 650mm
          最壞情境」模擬，這個情境下治水工程的緩衝有限。LiveSafe 分數仍以最壞情境
          為依據。
        </p>
      </GuideSection>

      <GuideSection title="LiveSafe 對台中地址的淹水分級">
        <p>
          台中市使用水利署 24h 650mm 情境（與其他 21 縣市相同）。深度對應分數：
        </p>
        <ul className="ml-6 list-disc space-y-1.5">
          <li>0-0.3m → 70 分（短時積水）</li>
          <li>0.3-0.5m → 50 分（淹小腿）</li>
          <li>0.5-1m → 30 分（淹腰）</li>
          <li>1-2m → 15 分（淹胸口以上）</li>
          <li>2-3m → 8 分（嚴重淹水）</li>
          <li>&gt; 3m → 3 分</li>
          <li>不在潛勢區 → 95 分</li>
        </ul>
        <p>
          台中市區大部分區域不在潛勢區（95 分），但西屯、烏日、大里、太平部分區段
          會落在 30-70 分區間。
        </p>
      </GuideSection>

      <GuideInlineSearch
        headline="現在查台中的地址"
        helper="同一區可能差很多，建議直接查具體地址"
      />

      <GuideFAQ id={SLUG} faqs={FAQS} />

      <GuideRelated items={RELATED} />
    </GuideArticle>
  );
}
