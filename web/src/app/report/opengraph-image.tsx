import { ImageResponse } from "next/og";

export const alt = "居住安全透視鏡 — 買房前的一站式查核報告";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface Props {
  searchParams?: Promise<{ address?: string }>;
}

export default async function OgImage({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  const address = params.address?.slice(0, 40) ?? "輸入地址查詢";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background:
            "radial-gradient(ellipse at top left, rgba(168, 85, 247, 0.35), transparent 50%), radial-gradient(ellipse at top right, rgba(6, 182, 212, 0.25), transparent 50%), radial-gradient(ellipse at bottom, rgba(16, 185, 129, 0.18), transparent 50%), #050507",
          padding: "80px",
          color: "#fff",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: 22,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.6)",
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              background: "#10b981",
              boxShadow: "0 0 12px #10b981",
            }}
          />
          居住安全透視鏡 · 買房一站式查核
        </div>

        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 96,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: "-0.04em",
              maxWidth: 1040,
              backgroundImage:
                "linear-gradient(135deg, #6ee7b7 0%, #67e8f9 45%, #c4b5fd 100%)",
              backgroundClip: "text",
              color: "transparent",
              display: "flex",
            }}
          >
            {address}
          </div>
          <div
            style={{
              marginTop: 24,
              fontSize: 32,
              color: "rgba(255,255,255,0.7)",
              display: "flex",
            }}
          >
            30 秒看懂地震、空品、醫療、交通、生活機能、淹水、學區
          </div>
        </div>

        <div
          style={{
            marginTop: 50,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            color: "rgba(255,255,255,0.4)",
            fontSize: 22,
          }}
        >
          <div style={{ display: "flex" }}>
            政府公開資料 · USGS · GEM · OSM
          </div>
          <div style={{ display: "flex", fontFamily: "monospace" }}>
            livesafe.tw
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
