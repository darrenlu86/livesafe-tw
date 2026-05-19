export const metadata = {
  title: "關於 LiveSafe.tw",
  description: "資料來源、評分算法、免責聲明",
};

export default function AboutPage() {
  return (
    <div className="container">
      <h1>關於 LiveSafe.tw</h1>

      <h2 style={{ marginTop: "2rem" }}>為什麼做這個</h2>
      <p>
        既有的房地產站關注的是「價格」，但居住安全很少被量化。LiveSafe.tw
        把政府公開的風險資料整合在一起，讓你在考慮搬家、換屋時能快速掌握該區的真實條件。
        <strong>我們不賣房、不估價、不談投資。</strong>
      </p>

      <h2 style={{ marginTop: "2rem" }}>v1 評估維度</h2>
      <ul style={{ paddingLeft: "1.5rem" }}>
        <li>
          <strong>🏥 醫療可近性</strong> — 5km 內急救責任醫院數量 + 最近急救醫院距離
        </li>
        <li>
          <strong>🏪 生活機能</strong> — 500m 內超商、藥局、公園數量
        </li>
      </ul>
      <p style={{ marginTop: "1rem" }}>
        <em>
          v1.1 將加入「空氣品質」「地震風險」，目前等待相關政府 API 授權碼。
          液化/淹水/斷層維度因 GIS 資料下載管道限制，延後至 v2。
        </em>
      </p>

      <h2 style={{ marginTop: "2rem" }}>評分算法</h2>
      <h3>醫療可近性</h3>
      <pre style={{ background: "#f3f4f6", padding: "1rem", borderRadius: 6 }}>
{`base      = min(70, 5km 內急救醫院數 × 20)
proximity = max(0, 30 - 最近急救醫院距離(km) × 3)
score     = round(min(100, base + proximity))`}
      </pre>
      <h3 style={{ marginTop: "1rem" }}>生活機能</h3>
      <pre style={{ background: "#f3f4f6", padding: "1rem", borderRadius: 6 }}>
{`conv_pts  = min(50, 500m 內超商數 × 10)
pharm_pts = min(30, 500m 內藥局數 × 10)
park_pts  = min(20, 500m 內公園數 × 10)
score     = conv_pts + pharm_pts + park_pts`}
      </pre>
      <h3 style={{ marginTop: "1rem" }}>總評</h3>
      <p>各維度等權重平均，映射為 A/B/C/D 四段（≥80 A、60-79 B、40-59 C、&lt;40 D）。</p>

      <h2 style={{ marginTop: "2rem" }}>資料來源</h2>
      <ul style={{ paddingLeft: "1.5rem" }}>
        <li>
          <a
            href="https://info.nhi.gov.tw/api/iode0000s01/Dataset?rId=A21030000I-D21003-003"
            target="_blank"
            rel="noopener noreferrer"
          >
            衛福部健保署：健保特約醫事機構-地區醫院
          </a>{" "}
          — 每日更新
        </li>
        <li>
          <a href="https://overpass-api.de/" target="_blank" rel="noopener noreferrer">
            OpenStreetMap Overpass API
          </a>{" "}
          — ODbL 授權
        </li>
        <li>
          <a
            href="https://nominatim.openstreetmap.org/"
            target="_blank"
            rel="noopener noreferrer"
          >
            OSM Nominatim Geocoding
          </a>
        </li>
      </ul>

      <h2 style={{ marginTop: "2rem" }}>已知限制</h2>
      <ul style={{ paddingLeft: "1.5rem" }}>
        <li>
          <strong>地理編碼精度</strong>：Nominatim 對台灣門牌覆蓋差，僅支援街道級查詢。
          報告精度為街廓等級（符合我們的隱私原則）。
        </li>
        <li>
          <strong>醫院地址解析率</strong>：部分醫院地址解析失敗，會被排除於計算外。
          報告會標註。
        </li>
        <li>
          <strong>OSM 資料覆蓋</strong>：偏鄉地區的超商/藥局/公園標記可能不完整。
        </li>
      </ul>

      <h2 style={{ marginTop: "2rem" }}>免責聲明</h2>
      <p>
        本站所有資料均來自政府公開資料平台。分數僅為參考指標，
        不構成任何購屋、租屋、投資建議。若發現資料錯誤請透過 GitHub issue 回報。
      </p>

      <p style={{ marginTop: "2rem" }}>
        <a href="/">← 回首頁</a>
      </p>
    </div>
  );
}
