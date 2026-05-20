import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "地址居住風險評分報告",
  description:
    "查看這個地址的地震斷層距離、淹水潛勢、空氣品質、嫌惡設施等 9 維度安全評分報告。",
  alternates: { canonical: "/report" },
  openGraph: {
    title: "居住風險報告 — 居住安全透視鏡",
    description: "9 維度居住安全評分：地震、淹水、空品、嫌惡設施一次看清楚。",
    type: "website",
    locale: "zh_TW",
  },
  robots: { index: false, follow: true },
};

export default function ReportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
