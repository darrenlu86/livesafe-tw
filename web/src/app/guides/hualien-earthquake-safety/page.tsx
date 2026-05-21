import Link from "next/link";
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

const SLUG = "hualien-earthquake-safety";
const TITLE = "花蓮買房的地震風險：哪些區域相對安全？";
const DESC =
  "花蓮地震頻率全台最高 + 米崙、嶺頂、玉里三條斷層 + 2018/2024 地震回顧。各鄉鎮風險評估、921 後耐震規範與花蓮老屋議題。";

export const metadata: Metadata = {
  title: "花蓮買房的地震風險：哪些區域相對安全？",
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

const TOWN_RISK = [
  ["花蓮市", "高", "市區西側緊鄰米崙斷層，2018、2024 地震主災區"],
  ["吉安鄉", "中高", "南側部分區域近嶺頂斷層"],
  ["新城鄉", "中", "距米崙斷層較遠但仍在斷層延伸帶"],
  ["壽豐鄉", "中", "嶺頂斷層通過部分區域"],
  ["鳳林鎮", "中", "縱谷帶，距米崙、嶺頂斷層皆中距離"],
  ["光復鄉", "中", "縱谷帶"],
  ["瑞穗鄉", "中高", "玉里斷層北段通過"],
  ["玉里鎮", "高", "玉里斷層通過市區"],
  ["富里鄉", "中", "玉里斷層南段"],
];

const QUAKES = [
  ["2018-02-06", "M6.0", "花蓮地震", "雲門翠堤大樓倒塌，米崙斷層"],
  ["2024-04-03", "M7.2", "0403 花蓮地震", "天王星大樓倒塌，太魯閣國家公園落石"],
  ["2022-09-18", "M6.8", "池上地震", "玉里、瑞穗地區災情，玉里斷層"],
];

const FAQS = [
  {
    q: "花蓮真的不能買房嗎？",
    a: "不是不能買，是要查清楚再買。花蓮地震頻率全台最高，但只有距斷層 1 公里內 + 1999 年前的建案才是真正高風險。距斷層 2 公里以上 + 921 後（尤其 2005 年後）新建案，耐震規格已經考慮花蓮的地震特性。把「絕對避開」改成「精準避開」，選對地段反而能買到便宜又安全的房子。",
  },
  {
    q: "2024 花蓮 0403 地震後，買花蓮房子要注意什麼？",
    a: "1) 建照核發年份必須在 2005 年後（更嚴格的耐震規範）；2) 避開米崙、嶺頂、玉里三條斷層 1 公里內；3) 確認建物結構為 RC 結構而非加強磚造（特別是 1990 年前老屋）；4) 看是否經過 0403 地震，有的話查鄰里結構勘查紀錄；5) 距太魯閣山區較近的地段要考慮邊坡落石風險。",
  },
  {
    q: "花蓮哪個區段相對安全？",
    a: "縱谷帶中段（鳳林、光復）距三條主要斷層都有 5-10 公里緩衝；新城北側距米崙較遠。沿海地段如七星潭附近受米崙斷層影響大、市區西側緊鄰斷層。山區（秀林、卓溪）地震風險小但土石流風險高。整體較安全的組合：鳳林、光復 + 縱谷帶 + 921 後新建案。",
  },
  {
    q: "0403 地震後花蓮房價跌了嗎？",
    a: "整體跌幅約 5-15%（依區位）。米崙斷層直接影響區（花蓮市區西側、北濱）跌幅較大；縱谷帶、市區東側影響較小。長期看，地震後 1-2 年通常會逐步回穩。如果預算夠買 921 後新建案 + 避開斷層 1 公里內，這時機反而可能議價空間大。",
  },
  {
    q: "想搬到花蓮但擔心地震，租屋是不是比較好？",
    a: "短期（1-3 年）租屋是合理選擇——你可以實際體驗一兩個颱風季 + 一兩次有感地震，再決定是否買房。但租屋一樣要查斷層距離跟建物年代（地震時人在屋裡的安危跟所有權無關）。LiveSafe 的查詢結果對租屋一樣適用。",
  },
  {
    q: "花蓮老屋（建照 1990 前）完全不能買嗎？",
    a: "不是完全不能，但要做兩件事：1) 委託結構技師做耐震評估（花費約 3-8 萬）；2) 評估是否符合「老屋重建」或「危老重建」條件——如果符合，可以拿政府補助拆掉重建，反而是好標的。完全不做這兩件事就買的話，地震時風險真的很高。",
  },
];

const RELATED = [
  {
    href: "/guides/earthquake-fault-check",
    label: "斷層查詢：我家在斷層帶上嗎？",
    hook: "全台 42 條活動斷層分布 + 距離分級判讀。",
  },
  {
    href: "/guides/home-safety-checklist",
    label: "買房前必查的 9 個居住風險完整指南",
    hook: "地震只是其中一項，看完整 9 維度怎麼評估。",
  },
  {
    href: "/guides/flood-risk-check",
    label: "我家會淹水嗎？水利署淹水潛勢一鍵查",
    hook: "花蓮其實淹水風險相對低，但仍應確認。",
  },
];

export default function HualienEarthquakeSafetyPage() {
  return (
    <GuideArticle
      slug={SLUG}
      title={TITLE}
      description={DESC}
      datePublished="2026-05-21"
    >
      <GuideHero
        category="地震 · 花蓮"
        title={TITLE}
        intro="花蓮地震頻率全台最高，2018 與 2024 兩次大地震讓「花蓮買房是不是太危險」變成關鍵問題。實際上花蓮並不是「不能買」，而是要「精準避開」——避開三條活動斷層 1 公里內 + 921 前老屋，剩下的地段反而因價格低而有不錯的 CP 值。"
        updatedAt="2026-05-21"
      />

      <GuideSection title="花蓮的三條活動斷層">
        <p>
          <strong>花蓮主要受三條活動斷層影響：米崙斷層、嶺頂斷層、玉里斷層。</strong>
        </p>
        <ul className="ml-6 list-disc space-y-2">
          <li>
            <strong>米崙斷層</strong>：花蓮市西側，貫穿七星潭—市區北側—吉安。
            2018、2024 兩次大地震主因之一。市區內距斷層 0-2 公里。
          </li>
          <li>
            <strong>嶺頂斷層</strong>：吉安南—壽豐—鳳林一線。台 9 線縱谷帶。
          </li>
          <li>
            <strong>玉里斷層</strong>：瑞穗—玉里—富里。2022 池上地震主因。玉里鎮市區
            直接位於斷層帶。
          </li>
        </ul>
      </GuideSection>

      <GuideInlineSearch
        headline="先查花蓮地址"
        helper="輸入縣市 + 行政區 + 路名，看距最近斷層的距離"
        examples={[
          "花蓮縣花蓮市中山路",
          "花蓮縣吉安鄉中央路",
          "花蓮縣鳳林鎮中正路",
          "花蓮縣玉里鎮中山路",
        ]}
      />

      <GuideSection title="花蓮各鄉鎮地震風險概覽">
        <GuideTable
          headers={["鄉鎮", "風險等級", "說明"]}
          rows={TOWN_RISK}
        />
        <GuideCallout variant="info">
          風險等級只是大致參考，實際分數依「該地址的具體 GPS 座標距斷層的距離」而定。
          同一個鄉鎮內東邊跟西邊可能差很多。
        </GuideCallout>
      </GuideSection>

      <GuideSection title="近年大地震回顧">
        <GuideTable
          headers={["日期", "規模", "事件", "災情"]}
          rows={QUAKES}
        />
        <p>
          這三次都是花蓮活動斷層直接活動造成。 從 LiveSafe 的角度，這些地震都進入
          USGS 近 5 年 M≥5 統計，所以花蓮市區、玉里地區的地震維度分數會被進一步扣減。
        </p>
      </GuideSection>

      <GuideSection title="2024 0403 地震後的買房注意事項">
        <ol className="ml-6 list-decimal space-y-2">
          <li>
            <strong>建照年份必須 ≥ 2005 年</strong>（更嚴格的耐震規範）；理想 ≥ 2011 年。
          </li>
          <li>
            <strong>避開米崙、嶺頂、玉里斷層 1 公里內</strong>（用 LiveSafe 距離一查即知）。
          </li>
          <li>
            <strong>結構必須是 RC（鋼筋混凝土）</strong>，避開加強磚造、無筋磚造的舊房。
          </li>
          <li>
            <strong>看是否經過 0403 地震</strong>，有經歷的查鄰里結構勘查紀錄。建物管委會
            或地政事務所通常有資料。
          </li>
          <li>
            <strong>山邊地段查邊坡安全</strong>（太魯閣山區、和平、銅門等地，0403 後落石嚴重）。
          </li>
        </ol>
      </GuideSection>

      <GuideSection title="921 後耐震規範與花蓮老屋">
        <p>
          台灣建築技術規則中的耐震設計規範重大修訂：1997 → 1999（921 後緊急修訂）→ 2005
          → 2011。對花蓮這種高震區，2005 年後的建案有相當大的差異——分區精細化讓
          東部地區的設計係數明顯提高。
        </p>
        <p>
          花蓮市區仍有大量 1980-1990 年代的老建築，這些是 2018 雲門翠堤、2024 天王星倒塌
          的主因（不是地震太大，是建築太老）。買花蓮房子時：
        </p>
        <ul className="ml-6 list-disc space-y-1.5">
          <li>1990 年前老屋：除非結構技師評估或重建，否則不建議</li>
          <li>1990-1999 年：耐震規格不足，斷層帶 1 公里內慎入</li>
          <li>1999-2005 年：基本門檻，斷層帶 1 公里內仍應評估</li>
          <li>2005-2011 年：較安全，斷層帶 1 公里內可考慮</li>
          <li>2011 年後：耐震規格最完整</li>
        </ul>
      </GuideSection>

      <GuideSection title="租屋 vs 買房的風險差異">
        <p>
          <strong>地震時人身安全跟所有權無關，但長期承擔不同。</strong>
        </p>
        <ul className="ml-6 list-disc space-y-2">
          <li>
            <strong>租屋</strong>：建物若毀損你只損失押金 + 搬家成本，不必承擔重建。
            適合移居花蓮觀察期（1-3 年）。
          </li>
          <li>
            <strong>買房</strong>：要承擔建物全損的風險。住宅綜合險的「地震險」必保——
            最高賠付 150 萬，可加保到 1000 萬。年保費約 1500-5000 元。
          </li>
          <li>
            <strong>共同點</strong>：地震時人在屋裡的危險程度跟所有權無關，斷層距離跟建物
            耐震規格才是關鍵。租屋一樣要查。
          </li>
        </ul>
      </GuideSection>

      <GuideInlineSearch
        headline="現在查花蓮的地址"
        helper="會直接顯示距米崙、嶺頂或玉里斷層的距離"
      />

      <GuideFAQ id={SLUG} faqs={FAQS} />

      <GuideRelated items={RELATED} />
    </GuideArticle>
  );
}
