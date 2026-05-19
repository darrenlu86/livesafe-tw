"use client";

import { useState } from "react";

type Grade = "A" | "B" | "C" | "D";

interface RiskReport {
  query: {
    address: string;
    lat: number;
    lng: number;
    geocode_display_name?: string;
    generated_at: string;
  };
  overall: { grade: Grade; score: number };
  dimensions: {
    healthcare: {
      score: number;
      emergency_hospitals_within_5km: number;
      nearest_emergency: { name: string; distance_km: number } | null;
      note?: string;
    };
    amenities: {
      score: number;
      convenience_stores_500m: number;
      pharmacies_500m: number;
      parks_500m: number;
    };
  };
  sources: { name: string; url: string; updated_at: string }[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8787";

export default function Home() {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<RiskReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const resp = await fetch(
        `${API_BASE}/api/report?address=${encodeURIComponent(address)}`,
      );
      if (!resp.ok) {
        const body = (await resp.json()) as { error?: string; hint?: string };
        throw new Error(body.hint ?? body.error ?? `HTTP ${resp.status}`);
      }
      setReport((await resp.json()) as RiskReport);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <section className="hero">
        <h1>LiveSafe.tw</h1>
        <p>輸入地址，看看你家的居住風險 — 不賣房，只談安全。</p>
        <form className="search-form" onSubmit={onSubmit}>
          <input
            type="text"
            placeholder="例：台北市信義區松壽路"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? "分析中…" : "查詢"}
          </button>
        </form>
        <p className="hint">
          建議輸入「縣市 + 行政區 + 路名」，目前不支援門牌號（地理編碼限制）
        </p>
      </section>

      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}

      {report && <ReportView report={report} />}

      <footer className="footer">
        <p>
          LiveSafe.tw 使用政府公開資料，僅供參考，不構成購屋建議。
          <br />
          <a href="/about">關於本站與資料來源</a>
        </p>
      </footer>
    </div>
  );
}

function ReportView({ report }: { report: RiskReport }) {
  const { overall, dimensions, sources, query } = report;

  return (
    <section className="report">
      <div className="grade-card">
        <div className={`grade-badge grade-${overall.grade}`}>{overall.grade}</div>
        <div>
          <h2>{query.geocode_display_name ?? query.address}</h2>
          <p className="dim-detail">總評分 {overall.score} / 100</p>
        </div>
      </div>

      <div className="dim-grid">
        <div className="dim-card">
          <h3>🏥 醫療可近性</h3>
          <div className="dim-score">{dimensions.healthcare.score}</div>
          <div className="dim-detail">
            5km 內急救醫院：{dimensions.healthcare.emergency_hospitals_within_5km} 家
            {dimensions.healthcare.nearest_emergency && (
              <>
                <br />最近：{dimensions.healthcare.nearest_emergency.name}（
                {dimensions.healthcare.nearest_emergency.distance_km} km）
              </>
            )}
            {dimensions.healthcare.note && (
              <>
                <br />
                <em>{dimensions.healthcare.note}</em>
              </>
            )}
          </div>
        </div>

        <div className="dim-card">
          <h3>🏪 生活機能</h3>
          <div className="dim-score">{dimensions.amenities.score}</div>
          <div className="dim-detail">
            500m 內：超商 {dimensions.amenities.convenience_stores_500m} / 藥局{" "}
            {dimensions.amenities.pharmacies_500m} / 公園{" "}
            {dimensions.amenities.parks_500m}
          </div>
        </div>
      </div>

      <div className="sources">
        <strong>資料來源：</strong>
        <ul>
          {sources.map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noopener noreferrer">
                {s.name}
              </a>{" "}
              <span>(更新：{s.updated_at.slice(0, 10)})</span>
            </li>
          ))}
        </ul>
        <p style={{ marginTop: "1rem" }}>產生時間：{query.generated_at}</p>
      </div>
    </section>
  );
}
