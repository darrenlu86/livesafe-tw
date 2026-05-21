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

const SLUG = "flood-risk-check";
const TITLE = "我家會淹水嗎？水利署淹水潛勢一鍵查";
const DESC =
  "輸入地址查淹水潛勢等級。22 縣市淹水深度查詢、各區常見淹水熱點、買到淹水區房子的處理方式。";

export const metadata: Metadata = {
  title: "淹水潛勢查詢：我家會淹水嗎？台灣 22 縣市深度評分",
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

const DEPTH_TABLE = [
  ["0 – 0.3 公尺", "70 分", "淹腳踝以下，多為短時積水"],
  ["0.3 – 0.5 公尺", "50 分", "淹小腿，機車熄火、低樓層進水"],
  ["0.5 – 1 公尺", "30 分", "淹腰部，一樓家具受損"],
  ["1 – 2 公尺", "15 分", "淹胸口以上，停車場、地下室淹沒"],
  ["2 – 3 公尺", "8 分", "嚴重淹水，一樓全淹"],
  ["> 3 公尺", "3 分", "極嚴重淹水，二樓也可能受影響"],
];

const HOT_ZONES = [
  ["雙北汐止、北投、文山", "基隆河、新店溪流域低地"],
  ["桃園海山、觀音、新屋", "西部沖積平原 + 排水量不足"],
  ["新竹竹北、新豐", "頭前溪、鳳山溪沖積平原"],
  ["雲林口湖、麥寮、北港", "西部濱海低地 + 地層下陷"],
  ["嘉義朴子、東石、布袋", "八掌溪、朴子溪流域"],
  ["台南低地廣域", "鹽水溪、曾文溪、二仁溪流域，低地面積極大"],
  ["高雄左營、岡山、大寮", "愛河、典寶溪流域"],
  ["屏東林邊、佳冬、東港", "林邊溪、東港溪沖積平原 + 地層下陷"],
  ["台中烏日、大里、太平", "大肚溪、大里溪流域，近年有改善"],
];

const FAQS = [
  {
    q: "「淹水潛勢區」跟「實際淹過水」是同一件事嗎？",
    a: "不完全。淹水潛勢圖是水利署用水文模型模擬「假設 24 小時下 650mm」會在哪裡淹、淹多深。它代表「最壞情境下的風險」，不代表每年都會淹。實際淹水紀錄可以參考國家災害防救科技中心（NCDR）的歷史災害資料。兩者一起看比較完整。",
  },
  {
    q: "為什麼臺北市跟其他縣市的淹水資料不一樣？",
    a: "全台 22 縣市資料來自不同源。其他 21 縣市為水利署 25766 dataset（24 小時累積 650mm 最壞情境）；臺北市因水利署公開檔案缺漏，改用 data.taipei 降雨積水模擬圖（130mm/h 短延時強降雨情境）。兩者皆為各自的最壞情境，但概念不完全等同——臺北版較貼近瞬間豪雨積水，其他縣市版較貼近長時間連續降雨。",
  },
  {
    q: "買到淹水潛勢區的房子怎麼辦？",
    a: "1) 確認樓層：一樓、地下室高風險，3 樓以上影響低；2) 查實際淹水紀錄（地方政府防災網或鄰里訪查）；3) 確認房屋是否墊高、有無止水閘門設備；4) 議價時把這個維度當議價籌碼；5) 評估住宅綜合險（含洪水險）保費。",
  },
  {
    q: "「不在潛勢區 = 95 分」是真的安全嗎？",
    a: "「在水利署模擬下、24h 650mm 情境內不淹」這件事是真的。但仍有風險：短時間極端降雨（如 200mm/h）、上游潰堤、人為排水阻塞都可能造成模擬外的淹水。95 分代表「在政府最壞情境模擬下安全」，不是「絕對不會淹」。",
  },
  {
    q: "梅雨季、颱風季是什麼時候要特別注意？",
    a: "梅雨季是 5 月中到 6 月中，颱風季是 7 月到 10 月。這兩段時間台灣中南部、東部出現 24h 累積 300mm 以上的大豪雨機率較高。若你的地址落在潛勢區內，可在這段時間特別注意氣象署的豪雨特報。",
  },
  {
    q: "二樓以上的房子也要看淹水嗎？",
    a: "要，但風險不同。二樓以上室內淹水機率極低，但仍要考慮：1) 一樓停車場是否會淹（車險很貴）；2) 電梯機房是否會泡水（修復可能數十萬）；3) 社區公設、健身房如果在地下室會受影響；4) 緊急應變（淹水時可能斷電斷水）。",
  },
];

const RELATED = [
  {
    href: "/guides/taichung-flood-risk",
    label: "台中淹水危險地區分析：西屯、烏日要注意嗎？",
    hook: "台中近年淹水熱區與排水改善現況。",
  },
  {
    href: "/guides/home-safety-checklist",
    label: "買房前必查的 9 個居住風險完整指南",
    hook: "淹水只是其中一項，看完整 9 維度怎麼評估。",
  },
  {
    href: "/guides/earthquake-fault-check",
    label: "斷層查詢：我家在斷層帶上嗎？",
    hook: "另一個不可逆的安全層維度。",
  },
];

export default function FloodRiskCheckPage() {
  return (
    <GuideArticle
      slug={SLUG}
      title={TITLE}
      description={DESC}
      datePublished="2026-05-21"
    >
      <GuideHero
        category="淹水 · 安全層"
        title={TITLE}
        intro="淹水是少數「住進去之後幾乎無法改善」的居住風險。水利署的淹水潛勢圖把每個縣市最壞降雨情境下會淹的範圍、深度都模擬好了，但介面不友善、座標系統不直覺。這篇直接告訴你怎麼用、怎麼讀、看到分數低該怎麼判斷。"
        updatedAt="2026-05-21"
      />

      <GuideSection title="淹水潛勢圖到底是什麼？">
        <p>
          <strong>淹水潛勢圖是水利署用水文模型模擬「假設下這麼大雨會淹哪裡」的地圖。</strong>{" "}
          官方版本（25766 dataset）採用「24 小時累積 650mm」作為最壞情境——這是台灣
          歷史極端降雨的參考點（莫拉克、賀伯、納莉等都曾突破）。
        </p>
        <p>
          模型考慮地形、排水管網、河川滯洪量、堤防高度。結果以多邊形圖層表示，每個區域
          標記預估淹水深度。在 LiveSafe 上，你輸入地址，系統用「點落在哪個多邊形內」
          直接判讀對應深度。
        </p>
      </GuideSection>

      <GuideInlineSearch
        headline="先查你的地址"
        helper="輸入縣市 + 行政區 + 路名，看是否落入水利署淹水潛勢區"
        examples={[
          "台南市永康區中正路",
          "雲林縣口湖鄉",
          "新北市汐止區大同路",
          "高雄市左營區崇德路",
        ]}
      />

      <GuideSection title="淹水深度分級與計分">
        <p>
          <strong>LiveSafe 把深度分 6 個級別，越深扣分越重。</strong>
        </p>
        <GuideTable headers={["淹水深度", "對應分數", "實際情境"]} rows={DEPTH_TABLE} />
        <p>
          地址不在任何潛勢區內則直接給 95 分（保留 5 分緩衝給「政府模擬外的極端
          情境」）。
        </p>
      </GuideSection>

      <GuideSection title="台灣常見淹水熱點">
        <p>
          <strong>這些區域歷史淹水紀錄較多，買房前特別要查。</strong>{" "}
          以下不是完整清單，只列各區買家較常詢問的熱區：
        </p>
        <GuideTable headers={["區域", "成因"]} rows={HOT_ZONES} />
      </GuideSection>

      <GuideSection title="臺北市的特殊情境說明">
        <p>
          <strong>臺北市淹水資料用的是 130mm/h 短延時強降雨情境，跟其他縣市不同。</strong>
        </p>
        <p>
          水利署的 22 縣市 dataset 中，臺北市檔案是空的（公開檔缺漏）。我們改用
          data.taipei 開放資料平台的「降雨積水模擬圖」130mm/h 情境作為替代。
          兩個情境的差異：
        </p>
        <ul className="ml-6 list-disc space-y-1.5">
          <li>
            <strong>水利署 24h 650mm</strong>：長時間累積大雨情境，類似颱風持續灌雨。
          </li>
          <li>
            <strong>data.taipei 130mm/h</strong>：短時間極端豪雨情境，類似午後雷雨、
            雷雨胞滯留。
          </li>
        </ul>
        <p>
          兩者皆為「最壞情境」但模擬假設不同，臺北市的淹水分數不應與其他縣市直接比較
          絕對值，但同一份報告內各維度的相對風險判讀仍有效。
        </p>
        <GuideCallout variant="info">
          臺北市使用者注意：報告卡片上的「proxy_note」會說明用的是哪個情境，
          確保資料來源透明可追溯。
        </GuideCallout>
      </GuideSection>

      <GuideSection title="保險與議價：知道淹水風險可以怎麼用？">
        <p>
          住宅綜合險中的「洪水險」附加保費，產險公司會看你的地址是否落入淹水潛勢區。
          落入潛勢區的地址：
        </p>
        <ul className="ml-6 list-disc space-y-1.5">
          <li>洪水險保費通常高 30-100%</li>
          <li>部分公司不承保 1 公尺以上深度的地址</li>
          <li>可以作為議價籌碼：拿水利署官方潛勢圖截圖跟仲介談</li>
          <li>銀行貸款 LTV 可能略受影響</li>
        </ul>
      </GuideSection>

      <GuideInlineSearch
        headline="現在查你的地址"
        helper="0-0.3m 算輕度、0.5m 以上要警覺、1m 以上應避開"
      />

      <GuideFAQ id={SLUG} faqs={FAQS} />

      <GuideRelated items={RELATED} />
    </GuideArticle>
  );
}
