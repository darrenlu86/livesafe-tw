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

const SLUG = "nuisance-facility-check";
const TITLE = "嫌惡設施查詢：附近有殯儀館、變電所、垃圾場嗎？";
const DESC =
  "7 類嫌惡設施距離扣分規則 + 房價影響分析。買房前先把這些「房價殺手」清出來，避免買到對街才發現。";

export const metadata: Metadata = {
  title: "嫌惡設施查詢：附近有殯儀館、變電所、垃圾場嗎？",
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

const NUISANCE_SCORING = [
  ["變電所", "< 100m -25 / < 300m -10 / < 500m -5", "電磁波 + 視覺壓迫感"],
  ["殯儀館", "< 300m -20 / < 500m -12 / < 1km -5", "心理影響 + 出入人車噪音"],
  ["火葬場", "< 500m -25 / < 1km -15 / < 2km -5", "煙塵 + 心理影響"],
  ["墓地（公墓）", "< 200m -10 / < 500m -5", "視覺 + 心理影響（影響半徑小）"],
  ["垃圾掩埋場", "< 500m -25 / < 1km -12 / < 2km -5", "臭味 + 蚊蠅"],
  ["焚化廠", "< 1km -25 / < 2km -12", "戴奧辛 + 廢氣排放（影響半徑大）"],
  ["監獄", "< 500m -15 / < 1km -8", "心理影響 + 治安疑慮"],
];

const PRICE_IMPACT = [
  ["殯儀館 / 火葬場", "10 – 15%", "心理影響最大，500m 內房價明顯偏低"],
  ["焚化廠", "8 – 12%", "視覺 + 健康疑慮"],
  ["變電所（高壓）", "5 – 8%", "電磁波研究結論不一致，但市場確實折價"],
  ["墓地", "5 – 10%", "看視野直接相對否，影響大；不直接看到影響小"],
  ["垃圾掩埋場", "8 – 15%", "依當前是否還在運作而定"],
  ["監獄", "3 – 6%", "影響相對小，但治安心理影響可能放大"],
];

const FAQS = [
  {
    q: "什麼算嫌惡設施？哪些不算？",
    a: "法律沒有正式「嫌惡設施」定義，民間共識是「會明顯影響鄰近房價或居住意願」的設施。LiveSafe 採 7 類：變電所、殯儀館、火葬場、墓地（公墓）、垃圾掩埋場、焚化廠、監獄。實價登錄研究多次驗證這 7 類對房價有顯著負向影響。加油站、宮廟、KTV、夜市等爭議性較大，目前未納入。",
  },
  {
    q: "殯儀館 500 公尺以內真的會影響健康嗎？",
    a: "醫學上沒有直接證據顯示距殯儀館近會影響健康。主要是心理影響：救護車、夜間出入、儀式聲音、視覺感受等。但這些心理影響會「具體反映在房價」，所以仍是買房時的實質考量。",
  },
  {
    q: "變電所的電磁波到底安不安全？",
    a: "WHO 國際非游離輻射防護委員會（ICNIRP）2010 年指引認為「長期低劑量極低頻電磁波與健康影響的因果關係尚未確立」。但 IARC 將其列為 Group 2B「可能致癌」，等同咖啡（後來咖啡已移出）。實務上 100m 內房價確實有 5-8% 折價，這是市場共識，不是健康定論。",
  },
  {
    q: "焚化廠 500m 內的房子完全不能買嗎？",
    a: "看時間。1995-2005 年初代焚化爐戴奧辛排放問題嚴重，當時 1km 內房價慘跌。現在的焚化爐（如北投、木柵、烏日、岡山）排放標準提高很多，但仍有臭味、廢氣的瞬間問題。1km 內仍會扣分；2km 外影響明顯減少。",
  },
  {
    q: "我家附近有公墓但看不到，還算嫌惡設施嗎？",
    a: "技術上算，但市場價差會明顯減少。LiveSafe 對墓地的扣分本來就較輕（< 200m -10、< 500m -5），因為墓地的影響強烈依賴「視覺可見性」。如果有山頭、樹林、建築物遮擋，實際房價影響可能比扣分小很多。",
  },
  {
    q: "為什麼資料用 OpenStreetMap 而不是政府官方？",
    a: "政府單位的嫌惡設施清冊（殯葬處、台電變電所清冊、環保局垃圾場清冊）分散在各機關，且通常以 PDF / 表格形式公開，不是 GIS 圖層。OSM 雖然是社群協作，但嫌惡設施類項通常標記完整且持續更新，是目前最可程式化整合的來源。偏鄉地區覆蓋率較低是已知限制。",
  },
  {
    q: "扣分上限 -60 是什麼意思？",
    a: "嫌惡設施基礎分 100，所有類別累加最多扣 60 分（即最低 40 分）。這是避免某地址同時有多種嫌惡設施時分數歸零失去區分度。實務上很少有地址會同時被 3-4 類觸發扣分。",
  },
];

const RELATED = [
  {
    href: "/guides/home-safety-checklist",
    label: "買房前必查的 9 個居住風險完整指南",
    hook: "嫌惡設施只是便利層其中一項，看完整 9 維度怎麼評估。",
  },
  {
    href: "/guides/flood-risk-check",
    label: "我家會淹水嗎？水利署淹水潛勢一鍵查",
    hook: "另一個會明顯壓低房價的風險。",
  },
  {
    href: "/guides/air-quality-check",
    label: "買房前查空氣品質：PM2.5 長期評分",
    hook: "焚化廠附近通常空品也差，雙重影響。",
  },
];

export default function NuisanceFacilityCheckPage() {
  return (
    <GuideArticle
      slug={SLUG}
      title={TITLE}
      description={DESC}
      datePublished="2026-05-21"
    >
      <GuideHero
        category="嫌惡設施 · 便利層"
        title={TITLE}
        intro="嫌惡設施對房價的影響從 5% 到 15% 不等，但仲介通常只說「附近什麼都有」、不會主動提對街的變電所或下個路口的殯儀館。這篇把 7 類設施的距離分級、實際房價影響、市場常見問題一次整理。"
        updatedAt="2026-05-21"
      />

      <GuideSection title="哪些算嫌惡設施？">
        <p>
          <strong>LiveSafe 採 7 類嫌惡設施：變電所、殯儀館、火葬場、墓地、垃圾掩埋場、焚化廠、監獄。</strong>{" "}
          這 7 類都是實價登錄研究多次驗證會對鄰近房價產生顯著負向影響的類別。
          加油站、宮廟、KTV、夜市等爭議性較大、影響也因人而異，目前未納入。
        </p>
      </GuideSection>

      <GuideInlineSearch
        headline="先查你的地址"
        helper="會列出 1 公里內所有觸發扣分的設施類別 + 距離"
        examples={[
          "台北市文山區木柵路一段",
          "新北市三重區重新路",
          "高雄市鳳山區建國路",
          "桃園市中壢區中山路",
        ]}
      />

      <GuideSection title="各類設施的距離分級扣分">
        <p>
          <strong>每類設施有自己的距離分級，基礎分 100、總扣分上限 -60。</strong>
        </p>
        <GuideTable
          headers={["設施類別", "距離分級扣分", "影響類型"]}
          rows={NUISANCE_SCORING}
        />
        <p>
          焚化廠的影響半徑最大（2km）、墓地最小（500m）。這個設計考慮了視覺
          + 噪音 + 廢氣等不同影響範圍。
        </p>
      </GuideSection>

      <GuideSection title="實際房價影響有多大？">
        <p>
          <strong>不同類型嫌惡設施對房價的影響範圍。</strong>{" "}
          資料根據實價登錄分析、房仲業者公開報告、學術論文整理：
        </p>
        <GuideTable
          headers={["設施類別", "房價影響估計", "備註"]}
          rows={PRICE_IMPACT}
        />
        <p className="text-sm text-white/55">
          ※ 影響範圍是估計值，視個案、距離、視覺可見性、心理影響強度而異。
        </p>
      </GuideSection>

      <GuideSection title="健康疑慮 vs 心理影響：分清楚再決定">
        <p>
          <strong>嫌惡設施的「真實風險」分兩種：實際健康影響 + 心理影響。</strong>
        </p>
        <ul className="ml-6 list-disc space-y-2">
          <li>
            <strong>有明確健康證據</strong>：早期（1995-2005）的焚化爐戴奧辛排放、垃圾掩埋場
            的甲烷與重金屬滲漏、火葬場煙塵。
          </li>
          <li>
            <strong>有爭議但市場仍折價</strong>：變電所電磁波（IARC Group 2B「可能致癌」，
            但 WHO 認為長期低劑量無明確因果）。
          </li>
          <li>
            <strong>主要是心理影響</strong>：殯儀館、墓地、監獄——醫學上沒有直接健康證據，
            但心理因素 + 出入人車噪音 + 視覺感受確實影響居住品質。
          </li>
        </ul>
        <p>
          買房時要釐清「自己在意的是哪一種」。介意心理影響的人，距離拉到 1 公里以上比較安心；
          只在意健康證據的人，焚化廠、垃圾場 2 公里以外問題不大。
        </p>
      </GuideSection>

      <GuideSection title="雙北嫌惡設施密集區">
        <ul className="ml-6 list-disc space-y-2">
          <li>
            <strong>台北市文山區（辛亥路、木柵）</strong>：第二殯儀館 + 富德公墓 + 焚化爐
            集中區，半徑 1km 內可能同時觸發 3 類扣分。
          </li>
          <li>
            <strong>台北市北投區（焚化爐周邊）</strong>：北投焚化爐 + 變電所密集。
          </li>
          <li>
            <strong>新北市新店區（安康一帶）</strong>：殯葬設施 + 公墓密集。
          </li>
          <li>
            <strong>新北市三峽、樹林</strong>：歷史垃圾場 + 變電所。
          </li>
          <li>
            <strong>新北市中和、永和（南勢角）</strong>：殯儀館 + 變電所。
          </li>
        </ul>
        <GuideCallout variant="warn">
          這些區域不代表「不能買」，只代表買之前要查清楚是「對街就有」還是「同行政區但 1km 以外」。
          LiveSafe 報告會列出 1km 內所有觸發扣分的設施 + 距離，可以直接判讀。
        </GuideCallout>
      </GuideSection>

      <GuideInlineSearch
        headline="現在查你的地址"
        helper="會列出 1 公里內的嫌惡設施類別與距離"
      />

      <GuideFAQ id={SLUG} faqs={FAQS} />

      <GuideRelated items={RELATED} />
    </GuideArticle>
  );
}
