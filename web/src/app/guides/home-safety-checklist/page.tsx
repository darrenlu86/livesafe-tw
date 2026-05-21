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

const SLUG = "home-safety-checklist";
const TITLE = "買房前必查的 9 個居住風險：完整評估指南";
const DESC =
  "看房之前先把這 9 件事查清楚：地震斷層、淹水潛勢、坊地災害、空品、醫療、機能、交通、學校、嫌惡設施。整合政府公開資料，30 秒看完一個地址。";

export const metadata: Metadata = {
  title: "買房前必查的 9 個居住風險完整評估指南",
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

const DIMENSIONS = [
  {
    label: "地震斷層",
    layer: "安全",
    proxy: "距離 + 近 5 年地震密度",
    source: "USGS Earthquake Catalog + GEM 全球活動斷層資料庫",
    href: "/guides/earthquake-fault-check",
  },
  {
    label: "淹水潛勢",
    layer: "安全",
    proxy: "落入水利署 / data.taipei 淹水模擬區的深度",
    source: "水利署 25766 dataset（22 縣市）+ data.taipei（北市）",
    href: "/guides/flood-risk-check",
  },
  {
    label: "坊地災害",
    layer: "安全",
    proxy: "距土石流潛勢溪流距離 + 高風險等級數量",
    source: "農業部水土保持署 147916（1729 條溪流）",
    href: null,
  },
  {
    label: "空氣品質",
    layer: "安全",
    proxy: "近 1 年 PM2.5 年均 + 紅紫橘色天數",
    source: "環境部 aqx_p_488 測站歷史日資料",
    href: "/guides/air-quality-check",
  },
  {
    label: "醫療可近性",
    layer: "便利",
    proxy: "5 公里內醫院總數 + 最近距離 + 醫學中心加成",
    source: "健保署急救責任醫院 + OpenStreetMap",
    href: null,
  },
  {
    label: "生活機能",
    layer: "便利",
    proxy: "500 公尺內超商、藥局、公園密度",
    source: "OpenStreetMap",
    href: null,
  },
  {
    label: "交通便利",
    layer: "便利",
    proxy: "1 公里內軌道站、500 公尺內公車站",
    source: "OpenStreetMap（嚴格 OSM tag 過濾）",
    href: null,
  },
  {
    label: "學校密度",
    layer: "便利",
    proxy: "1 公里內國小、國中、幼兒園數量",
    source: "OpenStreetMap",
    href: null,
  },
  {
    label: "嫌惡設施",
    layer: "便利",
    proxy: "7 類設施距離扣分（變電所/殯儀館/火葬場等）",
    source: "OpenStreetMap",
    href: "/guides/nuisance-facility-check",
  },
];

const FAQS = [
  {
    q: "為什麼要查 9 個維度？只看房價跟坪數不夠嗎？",
    a: "因為房價跟坪數可以買賣，但「地段風險」幾乎是住進去之後才會發現。斷層、淹水、嫌惡設施、空品這些都不會寫在合約上，也不會被仲介主動提；買房後才知道，等於把幾百萬綁在一個你還沒查清楚的賭注上。9 維度是把「不可逆風險」（安全層 60%）+「生活品質」（便利層 40%）一次掃完。",
  },
  {
    q: "9 維度都要 A 才能買嗎？哪些是必須過的底線？",
    a: "不用，但「安全層」的維度要特別小心。地震斷層 < 1 公里、淹水深度 > 1 公尺、土石流潛勢溪流 < 0.3 公里，這三項只要任一觸發都該重新評估；便利層偏低（醫療、機能、交通）可以靠通勤、捷運、新建設改善，安全層的災害風險改不了。",
  },
  {
    q: "看了報告分數很低怎麼辦？要放棄這間嗎？",
    a: "不一定。先看分低的是「安全」還是「便利」維度。安全層低（地震、淹水、土石流）是不可逆風險，建議避開；便利層低（醫療、機能、交通）若你預算有限、能接受通勤，就不一定是 deal breaker。把這份報告當「議價素材」比「絕對淘汰」更實用。",
  },
  {
    q: "要怎麼比較兩三間房子？",
    a: "查完一間之後勾選「比較」，把另外幾間也查完再勾選。多址比較頁可以最多 4 個地址並排，雷達圖一眼看出強弱差異，逐項分數對照。",
  },
  {
    q: "資料多久更新一次？",
    a: "USGS 地震每日抓取；環境部空品為近 1 年滾動年均；OSM POI 每月批次重新清洗；政府災害圖層（淹水、土石流、活動斷層）依官方更新節奏，目前為最新公開版本。",
  },
  {
    q: "支援門牌號嗎？",
    a: "目前不支援。地理編碼使用 OSM Nominatim，僅支援街道級（縣市 + 行政區 + 路名）。報告精度為街廓等級，同一條路上的房子分數可能視為一樣。",
  },
];

const RELATED = [
  {
    href: "/guides/earthquake-fault-check",
    label: "斷層查詢：我家在斷層帶上嗎？",
    hook: "台灣 42 條活動斷層分布 + 距離分級判讀。",
  },
  {
    href: "/guides/flood-risk-check",
    label: "我家會淹水嗎？水利署淹水潛勢一鍵查",
    hook: "22 縣市淹水深度查詢與情境差異說明。",
  },
  {
    href: "/guides/nuisance-facility-check",
    label: "嫌惡設施查詢：附近有殯儀館、變電所嗎？",
    hook: "7 類嫌惡設施距離扣分規則與房價影響分析。",
  },
  {
    href: "/guides/air-quality-check",
    label: "買房前查空氣品質：PM2.5 長期評分",
    hook: "為什麼買房要看年均不是即時 AQI？",
  },
];

export default function HomeSafetyChecklistPage() {
  return (
    <GuideArticle
      slug={SLUG}
      title={TITLE}
      description={DESC}
      datePublished="2026-05-21"
    >
      <GuideHero
        category="Pillar Guide"
        title={TITLE}
        intro="看房一個月、價格殺一輪、銀行貸款排好之後，才發現對街是變電所、樓下淹過水、隔壁就是斷層。這篇把買房前必查的 9 個居住風險逐項拆解，告訴你看什麼、怎麼判讀、政府哪些開放資料是真的可用。"
        updatedAt="2026-05-21"
      />

      <GuideSection title="為什麼政府網站分散查詢不夠用？">
        <p>
          台灣的居住風險資料其實絕大部分都是公開的。問題是分散在六、七個機關網站：地震去中央氣象署，斷層去地調所，淹水去水利署，土石流去水保署，空品去環境部，醫院去健保署。每個站的介面、座標系統、查詢邏輯都不一樣。對工程師來說是一週的整合工，對一般買房人來說是「查完一輪我已經放棄」。
        </p>
        <p>
          這裡的做法是反過來：先把 9 個維度全部抓回來預清洗、合併、評分，輸入地址只跑一次就好。每張卡片旁邊都有「資料來源」按鈕，可以追到原始政府資料源，不靠捏造、不靠估算。
        </p>
      </GuideSection>

      <GuideInlineSearch
        headline="先查一個你看上的地址"
        helper="輸入縣市 + 行政區 + 路名，30 秒拿到 9 維度評分報告"
        examples={[
          "台北市信義區松壽路",
          "新北市板橋區文化路一段",
          "台中市西屯區市政路",
          "高雄市鳳山區",
        ]}
      />

      <GuideSection title="9 個必查維度一覽">
        <p>
          總評採雙層加權：<strong>安全層 60% + 便利層 40%</strong>。安全層是
          「住進去後改不了」的硬風險；便利層是「會影響日常生活品質」的軟條件。
          總分映射為 A/B/C/D（A ≥ 85、B 65-84、C 45-64、D &lt; 45）。
        </p>
        <GuideTable
          headers={["維度", "層級", "判讀代理", "資料來源"]}
          rows={DIMENSIONS.map((d) => [
            d.label,
            d.layer,
            d.proxy,
            d.source,
          ])}
        />
      </GuideSection>

      <GuideSection title="1. 地震斷層（安全層）">
        <p>
          <strong>距活動斷層越近、近 5 年地震越多，分數越低。</strong>{" "}
          台灣有 42 條活動斷層（以 GEM Global Active Faults 為準）。距斷層
          0.5 公里以內直接給 5 分（極度危險）、5 公里以上才給 85 分（85 而非
          100 是保留台灣島基準震災風險）。公式裡斷層權重 70%、近 5 年地震密度 30%
          ——這個比例是因為「斷層存在就是潛在風險」，即使近期沒有大震，斷層帶上的房子
          仍要按耐震規範重看。
        </p>
        <p>
          完整斷層分布、各縣市風險區分析請看{" "}
          <Link href="/guides/earthquake-fault-check" className="text-cyan-300 hover:text-cyan-200">
            斷層查詢指南
          </Link>
          。
        </p>
      </GuideSection>

      <GuideSection title="2. 淹水潛勢（安全層）">
        <p>
          <strong>落入水利署淹水潛勢區的深度直接對應扣分。</strong>{" "}
          全台 22 縣市皆有資料。其他 21 縣市為水利署 24 小時累積 650mm 最壞情境；
          臺北市資料來自 data.taipei 130mm/h 短延時強降雨情境（情境不同，但同為各自的最壞情境）。
          0-0.3m → 70 分；2-3m → 8 分；超過 3 公尺 → 3 分。不在潛勢區則 95 分。
        </p>
        <p>
          詳細查詢方式、台灣常見淹水熱區請看{" "}
          <Link href="/guides/flood-risk-check" className="text-cyan-300 hover:text-cyan-200">
            淹水查詢指南
          </Link>
          。
        </p>
      </GuideSection>

      <GuideSection title="3. 坊地災害 / 土石流（安全層）">
        <p>
          <strong>距土石流潛勢溪流越近、附近高風險溪流越多，分數越低。</strong>{" "}
          資料來自農業部水土保持署的 111 年度 1729 條土石流潛勢溪流。距溪流 100m 內
          視為極高風險（20 分）、3 公里以上為 95 分。1 公里內每多一條「高風險」等級
          溪流額外扣 5 分（上限 -15）。對平地都市使用者，這個維度大部分是 95 分；對
          山坡地、近溪流的物件特別重要。
        </p>
        <GuideCallout variant="warn">
          山坡地住宅特別注意：建照時間（民國 86 年水土保持法施行後）、坡度、擋土牆都會
          影響真實風險。LiveSafe 的分數是「距潛勢溪流距離」的代理，不是建築結構評估。
        </GuideCallout>
      </GuideSection>

      <GuideSection title="4. 空氣品質（安全層）">
        <p>
          <strong>採用近 1 年 PM2.5 年均，不是即時 AQI。</strong>{" "}
          買房是長期決策，看即時 AQI 沒意義（每天都在變）。LiveSafe 取最近的環境部測站、
          抓近 365 天的 PM2.5 年均值，再加上紅、紫、橘色不健康天數扣分。台灣 PM2.5
          年均 12 µg/m³ 以下為良好、35 以上為差。中南部工業區周邊（雲林、彰化、台南、
          高雄小港）通常較差，北部、東部較佳。
        </p>
        <p>
          完整查詢與 PM2.5 健康影響見{" "}
          <Link href="/guides/air-quality-check" className="text-cyan-300 hover:text-cyan-200">
            空氣品質指南
          </Link>
          。
        </p>
      </GuideSection>

      <GuideSection title="5. 醫療可近性（便利層）">
        <p>
          <strong>5 公里內醫院總數、最近距離、醫學中心皆計入。</strong>{" "}
          資料來自健保署急救責任醫院（337 家）+ OpenStreetMap 醫院（343 家），
          合併去重後 680 家。計分採對數飽和（避免都會區普遍滿分），最近醫院每多 1 公里
          扣 3 分，5 公里內每多一家醫學中心加 3 分（上限 9）。
        </p>
        <p>
          這個維度對偏鄉、山區特別重要——5 公里內若無大型醫療機構，直接給 0 分並標註
          「無大型醫療機構」。
        </p>
      </GuideSection>

      <GuideSection title="6. 生活機能（便利層）">
        <p>
          <strong>500 公尺內超商、藥局、公園密度。</strong>{" "}
          超商佔 50 分（10 家頂滿）、藥局 30 分（6 家頂滿）、公園 20 分（4 個頂滿）。
          純步行可達範圍評估日常便利度。這個維度在都會區普遍 80+，鄉鎮地區會明顯較低。
        </p>
      </GuideSection>

      <GuideSection title="7. 交通便利（便利層）">
        <p>
          <strong>1 公里內捷運／火車站 + 500 公尺內公車站密度。</strong>{" "}
          軌道站佔 60 分（採階梯計分，單站不會直接滿分）、公車站 40 分（10 站頂滿）。
          軌道站採嚴格 OSM tag 過濾（必須是 train/subway/light_rail/tram 子類型），
          排除廢棄、貨運專用、機廠等非客運站點。
        </p>
      </GuideSection>

      <GuideSection title="8. 學校密度（便利層）">
        <p>
          <strong>1 公里內國小、國中、幼兒園加分（不是縣市教育局劃定學區）。</strong>
          {" "}LiveSafe 的學區維度是「周邊密度」代理，反映就學便利度，不是各縣市教育局
          劃定的實際入學分區。如果你在意「明星學區」應該對照當地教育局公告。
        </p>
      </GuideSection>

      <GuideSection title="9. 嫌惡設施（便利層）">
        <p>
          <strong>7 類嫌惡設施按距離扣分，總扣分上限 -60。</strong>{" "}
          類別：變電所、殯儀館、火葬場、墓地、垃圾掩埋場、焚化廠、監獄。基礎 100 分，
          每類有自己的距離分級。例如殯儀館 300m 內 -20、500m 內 -12、1km 內 -5；
          變電所 100m 內 -25、300m 內 -10。實價登錄研究顯示嫌惡設施距離對房價有明顯
          影響（殯儀館 ~10-15%、變電所 ~5-8%）。
        </p>
        <p>
          詳細類別、影響範圍、健康相關 FAQ 見{" "}
          <Link href="/guides/nuisance-facility-check" className="text-cyan-300 hover:text-cyan-200">
            嫌惡設施查詢指南
          </Link>
          。
        </p>
      </GuideSection>

      <GuideSection title="比較功能：兩三間房一次看完">
        <p>
          看房通常不會只看一間。每個查完的地址都會自動存到本機（不上傳），在報告頁
          勾選「比較」按鈕，最多選 4 個地址，到{" "}
          <Link href="/compare" className="text-cyan-300 hover:text-cyan-200">
            多址比較頁
          </Link>{" "}
          並排對照。雷達圖一眼看出強弱差異，逐項分數對照。
        </p>
        <p>
          常見用法：A 地點安全層 95、便利層 60（鄉下大坪數）vs B 地點安全層 70、便利層
          92（市區小坪數），這時就是用「比較頁」把取捨可視化。
        </p>
      </GuideSection>

      <GuideSection title="地域差異：北、中、南、東各有什麼風險側重？">
        <p>
          <strong>不同區域該優先看不同維度。</strong> 簡單原則：
        </p>
        <ul className="ml-6 list-disc space-y-1.5">
          <li>
            <strong>北部（雙北、桃園、新竹）</strong>：嫌惡設施密度高（殯儀館、變電所、垃圾場）+
            部分淹水（汐止、北投、文山）+ 山腳斷層（北市西北側）。重點看嫌惡 + 淹水。
          </li>
          <li>
            <strong>中部（台中、彰化、雲林）</strong>：車籠埔斷層 + 西部低地淹水（西屯、烏日、員林、北港）+
            空品偏差（六輕、火力電廠）。重點看斷層 + 淹水 + 空品。
          </li>
          <li>
            <strong>南部（嘉義、台南、高雄、屏東）</strong>：嘉義中洲斷層、新化斷層、旗山斷層 +
            台南低地大範圍淹水 + 小港工業區空品。重點看斷層 + 淹水 + 空品。
          </li>
          <li>
            <strong>東部（宜花東）</strong>：地震頻率全台最高 + 米崙、嶺頂、玉里斷層 +
            山坡土石流。重點看地震 + 坊地災害；空品則普遍最佳。
          </li>
        </ul>
      </GuideSection>

      <GuideSection title="建議查詢順序">
        <p>
          <strong>先看安全層、再看便利層；先看不可逆、再看可調整。</strong>
        </p>
        <ol className="ml-6 list-decimal space-y-1.5">
          <li>查斷層距離（&lt; 5km 要警覺、&lt; 1km 應重新評估耐震規格）</li>
          <li>查淹水深度（&gt; 0.5m 是警告、&gt; 1m 應避開）</li>
          <li>查土石流潛勢溪流（&lt; 0.5km 要看建照時間 + 擋土牆）</li>
          <li>查嫌惡設施（影響房價與生活）</li>
          <li>查空品（長期健康影響）</li>
          <li>最後看醫療、機能、交通、學校（可通勤、可改善）</li>
        </ol>
      </GuideSection>

      <GuideInlineSearch
        headline="開始你的查詢"
        helper="輸入地址，30 秒拿到完整報告，可加入比較清單對照"
      />

      <GuideFAQ id={SLUG} faqs={FAQS} />

      <GuideRelated items={RELATED} />
    </GuideArticle>
  );
}
