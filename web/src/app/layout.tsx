import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const SITE_URL = "https://livesafe.oharalab.com";
const SITE_NAME = "LiveSafe.tw";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "買房前查地震、淹水、空污風險 — LiveSafe.tw 居住安全評分",
    template: "%s | LiveSafe.tw",
  },
  description:
    "輸入地址，30 秒拿到 9 維度居住安全評分：地震斷層、淹水潛勢、土石流、空品、醫療、嫌惡設施。政府公開資料，不賣房、不估價，純評估工具。",
  keywords: [
    "買房前查詢",
    "租屋前查詢",
    "居住風險評估",
    "地震斷層查詢",
    "淹水潛勢查詢",
    "嫌惡設施查詢",
    "看房 checklist",
    "房屋 安全評估",
    "我家會淹水嗎",
    "我家在斷層帶上嗎",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: "買房前必查：地震、淹水、嫌惡設施 9 維度評分",
    description:
      "輸入台灣任一地址，30 秒拿到居住安全 A/B/C/D 評分。地震斷層、淹水潛勢、空品、嫌惡設施全整合。",
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: "zh_TW",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "買房前必查 9 維度居住風險 — LiveSafe.tw",
    description: "地震斷層、淹水潛勢、空品、嫌惡設施一鍵查",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
    },
  },
};

const JSON_LD_WEBAPP = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "LiveSafe.tw 居住安全評分工具",
  alternateName: "LiveSafe.tw",
  applicationCategory: "UtilitiesApplication",
  description:
    "輸入台灣地址，取得地震斷層、淹水潛勢、土石流、空氣品質、醫療、生活機能、交通、學校密度、嫌惡設施 9 維度居住安全評分",
  url: SITE_URL,
  inLanguage: "zh-TW",
  operatingSystem: "Web",
  isAccessibleForFree: true,
  offers: { "@type": "Offer", price: "0", priceCurrency: "TWD" },
  publisher: { "@type": "Organization", name: "Ohara Lab" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-Hant-TW" className={spaceGrotesk.variable}>
      <body>
        <Script
          id="ld-webapp"
          type="application/ld+json"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD_WEBAPP) }}
        />
        <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.06] bg-black/40 backdrop-blur-xl supports-[backdrop-filter]:bg-black/30">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
            <Link
              href="/"
              className="font-display text-lg font-bold tracking-tight text-white"
            >
              <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
                LiveSafe
              </span>
              <span className="text-white/40">.tw</span>
            </Link>
            <nav className="flex items-center gap-6 text-sm">
              <Link href="/compare" className="text-white/60 hover:text-white">
                多址比較
              </Link>
              <Link href="/about" className="text-white/60 hover:text-white">
                算法說明
              </Link>
            </nav>
          </div>
        </header>
        <main className="pt-20">{children}</main>
        <footer className="mt-32 border-t border-white/[0.06] py-10">
          <div className="mx-auto max-w-6xl px-6 text-center text-xs text-white/40">
            <p>
              LiveSafe.tw · 使用政府公開資料、USGS、OSM 計算 ·
              僅供參考，不構成購屋建議
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
