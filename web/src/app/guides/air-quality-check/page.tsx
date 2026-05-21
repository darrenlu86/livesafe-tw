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

const SLUG = "air-quality-check";
const TITLE = "買房前查空氣品質：PM2.5 長期評分查詢";
const DESC =
  "為什麼買房要看年均 PM2.5 不是即時 AQI？工業區、科技園區、火力電廠周邊空品影響分析。輸入地址 30 秒看年度評分。";

export const metadata: Metadata = {
  title: "空氣品質查詢：PM2.5 年均評分（買房長期評估用）",
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

const PM25_TABLE = [
  ["≤ 12 µg/m³", "100 分", "WHO 建議空品良好標準"],
  ["≤ 15 µg/m³", "85 分", "台灣空品標準上限"],
  ["≤ 25 µg/m³", "70 分", "敏感族群感受到影響"],
  ["≤ 35 µg/m³", "50 分", "明顯偏差"],
  ["≤ 50 µg/m³", "25 分", "差"],
  ["> 50 µg/m³", "10 分", "極差"],
];

const INDUSTRIAL_HOTSPOTS = [
  ["雲林麥寮、台西", "六輕（台塑石化）", "PM2.5、SOx、NOx"],
  ["彰化線西、伸港", "彰濱工業區 + 台中火力下風處", "PM2.5、燃煤排放"],
  ["台中沙鹿、龍井", "台中火力發電廠（全球最大燃煤）下風處", "PM2.5、汞、燃煤"],
  ["高雄小港、林園、大寮", "中油大林煉油廠 + 林園石化", "PM2.5、VOC、SOx"],
  ["高雄前鎮、楠梓", "楠梓加工區 + 中油", "工業排放"],
  ["新竹竹北、湖口", "新竹科學園區 + 湖口工業區", "化學廠 VOC"],
  ["桃園觀音、大園", "觀音工業區", "工業排放"],
];

const FAQS = [
  {
    q: "為什麼買房要看年均 PM2.5 而不是即時 AQI？",
    a: "AQI 每小時都在變，今天紫爆明天藍天是常態。買房是 10-30 年的長期決策，看年均才能反映「住在這裡 1 年平均吸到多少 PM2.5」。LiveSafe 抓最近的環境部測站近 365 天歷史資料計算年均，再加上紅、紫、橘色不健康天數扣分。",
  },
  {
    q: "PM2.5 年均 15 µg/m³ 跟 25 µg/m³ 差很多嗎？",
    a: "差很多。WHO 2021 新指引將 PM2.5 年均建議上限從 10 降到 5 µg/m³（更嚴格）；研究估計 PM2.5 每增加 10 µg/m³，全因死亡率上升 6-8%、肺癌死亡率上升 8-15%、心血管疾病死亡率上升 6-10%。住在 25 µg/m³ 區比住在 15 µg/m³ 區，長期健康成本明顯較高。",
  },
  {
    q: "台灣哪些縣市空品最好 / 最差？",
    a: "最好：台東、宜蘭、花蓮（年均常 8-12 µg/m³）。最差：雲林、彰化、嘉義（年均 18-25 µg/m³ 區段）。中部、南部受工業排放 + 季節東北季風吹拂中央山脈背風面累積汙染影響較大。北部居於中段。",
  },
  {
    q: "住在工業區附近真的差很多嗎？",
    a: "看距離跟下風處。雲林麥寮 6 公里內 + 麥寮下風（東北季風時受東北風吹）的住宅 PM2.5 年均明顯偏高；高雄小港、林園距石化工業區 3 公里內測站數據也明顯較差。但相同行政區的「上風處」住宅可能差異有限。LiveSafe 取的是「最近測站」的數據，所以結果反映該地理位置的實際暴露。",
  },
  {
    q: "科學園區（新竹、台南）周邊空品也差嗎？",
    a: "比想像中差。半導體製程使用大量化學溶劑（VOC、酸氣、矽烷），雖然有處理設備，但仍會在園區下風 1-3 公里形成空污熱區。新竹科學園區東南風時吹向竹北、湖口；台南科學園區則影響新市、善化。空品分數可能比預期低 5-10 分。",
  },
  {
    q: "PM2.5 高的話，買房應該避開嗎？",
    a: "不一定要絕對避開，但要做兩件事：1) 議價（雲林、彰化等空品差區的房價已 partial reflect，但通常還有空間）；2) 預算配置給室內空氣品質（HEPA 空氣清淨機、新風系統、密閉式窗戶），長期 5-10 年的支出大約 5-15 萬。把這個成本納入購屋總成本評估。",
  },
];

const RELATED = [
  {
    href: "/guides/home-safety-checklist",
    label: "買房前必查的 9 個居住風險完整指南",
    hook: "空品只是其中一項，看完整 9 維度怎麼評估。",
  },
  {
    href: "/guides/nuisance-facility-check",
    label: "嫌惡設施查詢：附近有殯儀館、變電所嗎？",
    hook: "焚化廠、垃圾場附近通常空品也差，雙重影響。",
  },
  {
    href: "/guides/flood-risk-check",
    label: "我家會淹水嗎？水利署淹水潛勢一鍵查",
    hook: "另一個安全層維度。",
  },
];

export default function AirQualityCheckPage() {
  return (
    <GuideArticle
      slug={SLUG}
      title={TITLE}
      description={DESC}
      datePublished="2026-05-21"
    >
      <GuideHero
        category="空氣品質 · 安全層"
        title={TITLE}
        intro="買房是 10-30 年的長期決策，看即時 AQI 沒用——今天紫爆明天藍天根本不能拿來比較地段。LiveSafe 取最近環境部測站的近 1 年 PM2.5 年均 + 不健康天數，反映「住在這裡長期吸到多少 PM2.5」。"
        updatedAt="2026-05-21"
      />

      <GuideSection title="即時 AQI vs 年均 PM2.5：買房該看哪個？">
        <p>
          <strong>買房要看年均 PM2.5，不是即時 AQI。</strong>{" "}
          理由：AQI 是每小時動態值，會受當下風向、雨量、車流、季節影響，根本無法做地段比較。
          年均則代表「全年平均暴露」，是 WHO 與台灣環境部評估長期健康影響時使用的指標。
          住在 PM2.5 年均 12 µg/m³ 跟 25 µg/m³ 的差別是真實的健康差距，不是偶發。
        </p>
      </GuideSection>

      <GuideInlineSearch
        headline="先查你的地址"
        helper="會顯示最近測站、近 1 年 PM2.5 年均、AQI 良好率、紅紫橘天數"
        examples={[
          "雲林縣麥寮鄉",
          "高雄市小港區",
          "台中市沙鹿區",
          "宜蘭縣羅東鎮",
        ]}
      />

      <GuideSection title="LiveSafe 的計分標準">
        <p>
          <strong>以 PM2.5 年均為基底分，再扣掉紅紫橘色天數。</strong>
        </p>
        <GuideTable headers={["PM2.5 年均", "基底分", "判讀"]} rows={PM25_TABLE} />
        <p>扣分項目：</p>
        <ul className="ml-6 list-disc space-y-1.5">
          <li>橘色（敏感族群不健康）日 -0.4 分/日（上限 -12）</li>
          <li>紅色（對所有族群不健康）日 -2 分/日（上限 -20）</li>
          <li>紫色（非常不健康）日 -3 分/日（上限 -15）</li>
        </ul>
      </GuideSection>

      <GuideSection title="WHO 與台灣的標準差異">
        <p>
          <strong>WHO 2021 新指引：PM2.5 年均上限 5 µg/m³；台灣標準：15 µg/m³。</strong>
        </p>
        <p>
          WHO 2005 舊標準是 10 µg/m³，2021 年依據新流行病學研究將標準降到 5。台灣目前還用
          15，跟 WHO 新標準有 3 倍差距。LiveSafe 採台灣標準作為基底分（≤15 給 85 而非 100），
          但 ≤12 才給滿分 100，比較接近 WHO 2005。
        </p>
        <GuideCallout variant="info">
          台灣 PM2.5 年均能達到 ≤ 12 的縣市只有東部（宜花東）；中南部多數測站年均 15-22；
          雲林、彰化部分測站可達 20-25。
        </GuideCallout>
      </GuideSection>

      <GuideSection title="工業排放熱點地圖">
        <p>
          <strong>這些區域受工業排放影響，PM2.5 年均明顯偏高。</strong>{" "}
          買房前若要避開空品差的區段，可優先避開這些工業/科技園區的「下風 3 公里」內。
        </p>
        <GuideTable
          headers={["區域", "排放源", "主要污染物"]}
          rows={INDUSTRIAL_HOTSPOTS}
        />
        <p>
          下風方向台灣全年約東北季風（10 月到 3 月），西南季風（5 月到 8 月）。
          中南部工業區秋冬下風南北部、夏季可能影響北方。
        </p>
      </GuideSection>

      <GuideSection title="PM2.5 對健康的長期影響">
        <p>
          根據 WHO、IARC 與多項流行病學研究：
        </p>
        <ul className="ml-6 list-disc space-y-1.5">
          <li>PM2.5 是 IARC Group 1「確定致癌物」（2013）</li>
          <li>PM2.5 每增加 10 µg/m³，肺癌死亡率上升 8-15%</li>
          <li>長期暴露增加心血管疾病、中風、慢性肺病風險</li>
          <li>孕婦長期暴露增加早產、低體重兒風險</li>
          <li>兒童發育期暴露影響肺功能成長</li>
        </ul>
        <p>
          這些影響是「長期累積」，不是單日紫爆造成的。所以 LiveSafe 強調看年均。
        </p>
      </GuideSection>

      <GuideInlineSearch
        headline="現在查你的地址"
        helper="會顯示最近測站、近 1 年 PM2.5 年均、紅紫橘色不健康天數"
      />

      <GuideFAQ id={SLUG} faqs={FAQS} />

      <GuideRelated items={RELATED} />
    </GuideArticle>
  );
}
