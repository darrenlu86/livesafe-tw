import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "多地址居住安全比較 — 地震、淹水、嫌惡設施並排比對",
  description:
    "最多 4 個地址並排比較地震斷層、淹水潛勢、空氣品質、嫌惡設施等 9 維度評分，找出最安全的居住選項。",
  alternates: { canonical: "/compare" },
  openGraph: {
    title: "兩個地址哪個更安全？9 維度並排比較",
    description: "看中多間房？把地址丟進比較工具，地震、淹水、空品、嫌惡設施一次並排。",
    type: "website",
    locale: "zh_TW",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0f",
};

export default function CompareLayout({ children }: { children: React.ReactNode }) {
  return children;
}
