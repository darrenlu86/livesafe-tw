import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "買房前必查的居住風險指南",
    template: "%s | 居住安全透視鏡",
  },
  description:
    "買房、租屋前必查的居住風險完整指南：地震斷層、淹水潛勢、嫌惡設施、空氣品質、學區、醫療一次看懂。",
  alternates: { canonical: "/guides" },
};

export default function GuidesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
