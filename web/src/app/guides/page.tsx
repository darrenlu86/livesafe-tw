import Link from "next/link";

const PILLAR = {
  href: "/guides/home-safety-checklist",
  category: "Pillar Guide",
  title: "買房前必查的 9 個居住風險：完整評估指南",
  hook: "從地震斷層、淹水到嫌惡設施，9 個維度一次看懂該怎麼查、怎麼判讀。",
};

const DIMENSION_GUIDES = [
  {
    href: "/guides/earthquake-fault-check",
    category: "地震",
    title: "斷層查詢：我家在斷層帶上嗎？",
    hook: "台灣 42 條活動斷層 + USGS 近 5 年地震密度，地址一鍵看清風險。",
  },
  {
    href: "/guides/flood-risk-check",
    category: "淹水",
    title: "我家會淹水嗎？水利署淹水潛勢一鍵查",
    hook: "全台 22 縣市淹水潛勢圖，輸入地址看 24h 650mm 情境下的預估淹水深度。",
  },
  {
    href: "/guides/nuisance-facility-check",
    category: "嫌惡設施",
    title: "嫌惡設施查詢：附近有殯儀館、變電所、垃圾場嗎？",
    hook: "7 類嫌惡設施距離扣分規則拆解，看房前先把房價殺手清出來。",
  },
  {
    href: "/guides/air-quality-check",
    category: "空氣品質",
    title: "買房前查空氣品質：PM2.5 長期評分查詢",
    hook: "為什麼即時 AQI 不適合買房參考？看年均 PM2.5 才看得出長期暴露。",
  },
];

const REGIONAL_GUIDES = [
  {
    href: "/guides/hualien-earthquake-safety",
    category: "花蓮",
    title: "花蓮買房的地震風險：哪些區域相對安全？",
    hook: "2024 地震後花蓮買房的耐震、斷層、區域評估指南。",
  },
  {
    href: "/guides/taichung-flood-risk",
    category: "台中",
    title: "台中淹水危險地區分析：西屯、烏日、大里要注意嗎？",
    hook: "台中近年淹水熱區與排水改善現況，含實際地址範例查詢。",
  },
];

function GuideCard({
  href,
  category,
  title,
  hook,
  size = "normal",
}: {
  href: string;
  category: string;
  title: string;
  hook: string;
  size?: "normal" | "large";
}) {
  return (
    <Link
      href={href}
      className="glass group block rounded-2xl p-6 transition hover:border-white/20 hover:bg-white/[0.06]"
    >
      <div className="text-xs uppercase tracking-[0.2em] text-white/40">
        {category}
      </div>
      <h3
        className={`mt-2 font-semibold text-white ${
          size === "large" ? "text-xl md:text-2xl" : "text-lg"
        }`}
      >
        {title}
      </h3>
      <p className="mt-2 text-sm text-white/65">{hook}</p>
      <p className="mt-4 text-xs text-cyan-300 transition group-hover:text-cyan-200">
        閱讀指南 →
      </p>
    </Link>
  );
}

export default function GuidesIndexPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 pb-24">
      <header className="mt-2">
        <div className="flex items-center gap-2 text-xs text-white/40">
          <Link href="/" className="hover:text-white">
            首頁
          </Link>
          <span>/</span>
          <span className="uppercase tracking-[0.2em]">Guides</span>
        </div>
        <h1 className="mt-4 font-display text-4xl font-bold leading-tight tracking-tight text-white md:text-5xl">
          買房前必查的居住風險指南
        </h1>
        <p className="mt-5 max-w-2xl text-base text-white/70 md:text-lg">
          每個維度的查詢方式、判讀邏輯與決策建議，
          看完直接在文章內輸入你的地址做查核。
        </p>
      </header>

      <section className="mt-10">
        <p className="text-xs uppercase tracking-[0.3em] text-white/40">
          先看這篇
        </p>
        <div className="mt-3">
          <GuideCard
            href={PILLAR.href}
            category={PILLAR.category}
            title={PILLAR.title}
            hook={PILLAR.hook}
            size="large"
          />
        </div>
      </section>

      <section className="mt-12">
        <p className="text-xs uppercase tracking-[0.3em] text-white/40">
          維度別指南
        </p>
        <h2 className="mt-2 text-2xl font-bold text-white">
          各風險維度怎麼查、怎麼看？
        </h2>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {DIMENSION_GUIDES.map((g) => (
            <GuideCard key={g.href} {...g} />
          ))}
        </div>
      </section>

      <section className="mt-12">
        <p className="text-xs uppercase tracking-[0.3em] text-white/40">
          地域別指南
        </p>
        <h2 className="mt-2 text-2xl font-bold text-white">特定縣市風險分析</h2>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {REGIONAL_GUIDES.map((g) => (
            <GuideCard key={g.href} {...g} />
          ))}
        </div>
      </section>

      <section className="mt-16 text-center">
        <p className="text-sm text-white/55">
          沒看到你想了解的主題？歡迎到{" "}
          <a
            href="https://github.com/darrenlu86/livesafe-tw/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-300 hover:text-cyan-200"
          >
            GitHub
          </a>{" "}
          提出建議。
        </p>
      </section>
    </div>
  );
}
