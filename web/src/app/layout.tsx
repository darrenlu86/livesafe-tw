import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LiveSafe.tw — 臺灣居住風險分析",
  description:
    "輸入地址，30 秒看懂你家的醫療可近性、生活機能。純粹的居住安全評估，不賣房、不估價。",
  openGraph: {
    title: "LiveSafe.tw — 臺灣居住風險分析",
    description: "純粹的居住安全評估，不賣房、不估價。",
    locale: "zh_TW",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant-TW">
      <body>{children}</body>
    </html>
  );
}
