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

const SLUG = "earthquake-fault-check";
const TITLE = "斷層查詢：我家在斷層帶上嗎？地震風險評分一鍵看";
const DESC =
  "輸入地址查距活動斷層距離 + 近 5 年地震密度。台灣 42 條活動斷層、距離分級扣分、921 後耐震規範差異全整理。";

export const metadata: Metadata = {
  title: "斷層查詢：我家在斷層帶上嗎？地震風險評分查詢",
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

const FAULT_SCORE_TABLE = [
  ["< 0.5 公里", "5 分", "極度危險：建築物 15m 禁建紅線、需特殊耐震設計"],
  ["0.5 – 1 公里", "25 分", "高度危險：建議避開或挑 921 後新建案"],
  ["1 – 3 公里", "50 分", "中度風險：注意建築年代 + 耐震規範版本"],
  ["3 – 5 公里", "75 分", "輕度風險：一般購屋可接受，但仍是「斷層帶區」"],
  ["> 5 公里", "85 分", "低風險：保留台灣島基準震災風險"],
];

const MAJOR_FAULTS = [
  ["山腳斷層", "北部", "台北盆地西北邊緣，五股—泰山—新莊—樹林一線"],
  ["新城斷層", "北部", "桃園市新屋—觀音—大園"],
  ["新竹斷層", "北部", "新竹市區—竹北延伸"],
  ["三義斷層", "中部", "苗栗三義—大湖"],
  ["車籠埔斷層", "中部", "921 地震主因，台中豐原—南投草屯—竹山"],
  ["大尖山斷層", "中部", "南投國姓—集集"],
  ["梅山斷層", "南部", "嘉義梅山—竹崎—大林"],
  ["中洲斷層", "南部", "台南新化—永康—關廟"],
  ["新化斷層", "南部", "台南新化—左鎮"],
  ["旗山斷層", "南部", "高雄旗山—甲仙—六龜"],
  ["米崙斷層", "東部", "花蓮市區西側，2018、2024 花蓮地震主因之一"],
  ["嶺頂斷層", "東部", "花蓮吉安—壽豐"],
  ["玉里斷層", "東部", "花蓮玉里—瑞穗"],
];

const FAQS = [
  {
    q: "我家在斷層帶上嗎？怎麼查？",
    a: "輸入你的地址，LiveSafe 會顯示距最近活動斷層的距離（單位公里）、斷層名稱與類型（正斷層、逆斷層、走向滑移）。如果距離小於 1 公里，會在卡片上紅色標註「斷層極近」，5 公里內仍屬中度風險範圍。",
  },
  {
    q: "距斷層多遠才算安全？",
    a: "建築技術規則第 262 條規定距斷層 15 公尺內為「建築物禁建範圍」，但這只是法定下限。實務上 500 公尺內地震時地表錯動風險很高、1 公里內也應視為高風險區。3-5 公里仍屬「斷層帶區」，超過 5 公里影響顯著降低，但台灣本島仍有島嶼級基準震災風險。",
  },
  {
    q: "沒地震紀錄就是安全嗎？",
    a: "不是。LiveSafe 的計分公式是斷層距離 70% + 近 5 年地震密度 30%——斷層存在就是潛在風險，即使近期沒有大震，活動斷層的應力仍在累積。新城斷層、新化斷層這些近代沒有大震紀錄的斷層仍被列為「活動斷層」，買房時不該因為「最近沒搖」就放心。",
  },
  {
    q: "921 之前的房子可以買嗎？",
    a: "可以但要看建照年份對應的耐震規範。台灣建築耐震規範重大修訂：1997 年（首次納入近斷層放大係數）、1999 年（921 後緊急修訂）、2005 年（區域分區精細化）、2011 年（依新的活動斷層資料）。1999 年之前的建案在斷層帶上要特別小心；2011 年之後的建案耐震標準明顯較嚴。",
  },
  {
    q: "斷層類型對風險有差嗎？",
    a: "有。逆斷層（thrust）的地表錯動最劇烈（如 921 車籠埔斷層）、正斷層（normal，如山腳斷層）次之、走向滑移（strike-slip）水平錯動較大。但對一般住宅來說，距離仍然是最關鍵的判讀指標，類型是參考。",
  },
  {
    q: "為什麼有些斷層在地圖上看到，LiveSafe 卻沒列入？",
    a: "LiveSafe 用的是 GEM（Global Earthquake Model）全球活動斷層資料庫的台灣 42 條活動斷層，這是國際地震研究使用的標準資料。地調所額外標示的「存疑性活動斷層」、「第二類活動斷層」可能不在 42 條清單內。要看完整版可參考地調所活動斷層查詢系統。",
  },
];

const RELATED = [
  {
    href: "/guides/hualien-earthquake-safety",
    label: "花蓮買房的地震風險：哪些區域相對安全？",
    hook: "東部地震頻率全台最高，米崙、嶺頂、玉里三條斷層怎麼避。",
  },
  {
    href: "/guides/home-safety-checklist",
    label: "買房前必查的 9 個居住風險完整指南",
    hook: "斷層只是其中一項，看完整 9 維度怎麼評估。",
  },
  {
    href: "/guides/flood-risk-check",
    label: "我家會淹水嗎？水利署淹水潛勢一鍵查",
    hook: "另一個不可逆的安全層維度。",
  },
];

export default function EarthquakeFaultCheckPage() {
  return (
    <GuideArticle
      slug={SLUG}
      title={TITLE}
      description={DESC}
      datePublished="2026-05-21"
    >
      <GuideHero
        category="地震 · 安全層"
        title={TITLE}
        intro="台灣有 42 條活動斷層，距斷層 1 公里內的房子，地震時地表錯動與建築毀損風險都明顯較高。但這件事仲介不會主動講、政府網站介面又不友善。這篇把你需要知道的距離分級、各縣市重要斷層、耐震規範差異一次講完。"
        updatedAt="2026-05-21"
      />

      <GuideSection title="台灣活動斷層分布速覽">
        <p>
          <strong>台灣有 42 條活動斷層，分布於北、中、南、東四區。</strong>{" "}
          資料來自 GEM Global Active Faults Database，這是國際地震研究使用的標準清單。
          以下是各區較常被房地產買家詢問的代表性斷層：
        </p>
        <GuideTable headers={["斷層名稱", "區域", "位置"]} rows={MAJOR_FAULTS} />
        <p className="text-sm text-white/55">
          ※ 完整 42 條斷層清單請參考地調所活動斷層查詢系統（faultgis.gsmma.gov.tw）。
        </p>
      </GuideSection>

      <GuideInlineSearch
        headline="先查你的地址"
        helper="輸入縣市 + 行政區 + 路名，查距最近活動斷層的距離"
        examples={[
          "新北市新莊區中華路二段",
          "台中市豐原區圓環南路",
          "花蓮縣花蓮市中山路",
          "高雄市旗山區中正路",
        ]}
      />

      <GuideSection title="距斷層多遠算危險？LiveSafe 的計分標準">
        <p>
          <strong>LiveSafe 把距斷層距離分成 5 個級別，並考慮近 5 年地震密度。</strong>
        </p>
        <GuideTable headers={["距斷層距離", "斷層分數", "風險說明"]} rows={FAULT_SCORE_TABLE} />
        <p>
          地震計分另加入「近 5 年 5 公里內 M≥5 地震次數」，0 次給 100 分、1 次 75 分、
          5 次以上只給 15 分。最終地震維度 = 斷層分數 × 70% + 地震次數分數 × 30%。
        </p>
        <GuideCallout variant="info">
          為什麼斷層權重 70%？因為斷層存在就是潛在風險。即使近期沒有大震，
          應力仍在累積——以「沒搖過 = 安全」做決策會誤判。
        </GuideCallout>
      </GuideSection>

      <GuideSection title="法規與耐震規範：建照年份很重要">
        <p>
          <strong>建照年份決定建築耐震規格，買斷層帶上的房子尤其要查。</strong>
        </p>
        <ul className="ml-6 list-disc space-y-2">
          <li>
            <strong>1997 年前</strong>：耐震規範未納入「近斷層放大係數」，斷層帶 1km 內
            建案應特別審視結構安全。
          </li>
          <li>
            <strong>1997 年版</strong>：首次納入近斷層效應，但仍以分區劃分（甲乙丙區）。
          </li>
          <li>
            <strong>1999 年（921 後緊急修訂）</strong>：分區精細化，斷層帶設計係數提高。
          </li>
          <li>
            <strong>2005 年版</strong>：再次精細化分區並加入土壤液化考量。
          </li>
          <li>
            <strong>2011 年至今</strong>：依新的活動斷層調查資料更新分區，耐震設計門檻
            最嚴格。
          </li>
        </ul>
        <p>
          以實際買房而言，<strong>建照核發年份在 1999 年（921）以後</strong> 是基本門檻；
          斷層帶 1 公里內建案最好挑 2005 年後或 2011 年後。
        </p>
      </GuideSection>

      <GuideSection title="各縣市高風險區概覽">
        <ul className="ml-6 list-disc space-y-2">
          <li>
            <strong>花蓮市</strong>：米崙斷層貫穿市區西側，2018、2024 花蓮地震均與其相關。
            花蓮市區大部分區域距米崙斷層 &lt; 2 公里。
          </li>
          <li>
            <strong>南投草屯、竹山</strong>：車籠埔斷層通過，921 主震破裂面就在此。
          </li>
          <li>
            <strong>台北五股、泰山、新莊（西北部）</strong>：山腳斷層延伸帶，斷層距離通常
            1-3 公里。
          </li>
          <li>
            <strong>台南新化、永康</strong>：中洲斷層 + 新化斷層交會區，距離 0-2 公里。
          </li>
          <li>
            <strong>高雄旗山、甲仙</strong>：旗山斷層帶，距離常 &lt; 1 公里。
          </li>
          <li>
            <strong>嘉義梅山</strong>：梅山斷層，1906 梅山地震主因。
          </li>
        </ul>
      </GuideSection>

      <GuideInlineSearch
        headline="現在查一下你的地址"
        helper="距斷層 &lt; 1 公里會在卡片上紅色標註，5 公里內仍屬中度風險"
      />

      <GuideSection title="買房前的斷層查詢 SOP">
        <ol className="ml-6 list-decimal space-y-2">
          <li>輸入地址，看 LiveSafe 地震維度分數與距斷層距離。</li>
          <li>
            如果距離 &lt; 5 公里，再去地調所活動斷層查詢系統交叉確認斷層線實際位置。
          </li>
          <li>查建照核發年份（不是完工年份），對照上面的耐震規範時間表。</li>
          <li>距離 &lt; 1 公里 + 建照早於 1999 年的物件，建議避開。</li>
          <li>把這份資料當議價籌碼或淘汰判據，不是「絕對安全 / 絕對危險」二分。</li>
        </ol>
      </GuideSection>

      <GuideFAQ id={SLUG} faqs={FAQS} />

      <GuideRelated items={RELATED} />
    </GuideArticle>
  );
}
