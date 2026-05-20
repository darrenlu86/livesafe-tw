import type { Metadata } from "next";
import Link from "next/link";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: "LiveSafe.tw — 住址安心度",
  description:
    "輸入地址，30 秒看懂這個地段的綜合居住評分：地震、空品、醫療、交通、生活機能。純粹的居住安全評估，不賣房、不估價。",
  openGraph: {
    title: "LiveSafe.tw — 住址安心度",
    description: "輸入地址 → 綜合評分 → 並排比較多個物件",
    locale: "zh_TW",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-Hant-TW" className={spaceGrotesk.variable}>
      <body>
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
