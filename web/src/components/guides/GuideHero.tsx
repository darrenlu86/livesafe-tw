import Link from "next/link";

interface Props {
  category: string;
  title: string;
  intro: string;
  updatedAt?: string;
}

export function GuideHero({ category, title, intro, updatedAt }: Props) {
  return (
    <header className="mt-2">
      <div className="flex items-center gap-2 text-xs text-white/40">
        <Link href="/" className="hover:text-white">
          首頁
        </Link>
        <span>/</span>
        <Link href="/guides" className="hover:text-white">
          指南
        </Link>
        <span>/</span>
        <span className="uppercase tracking-[0.2em]">{category}</span>
      </div>
      <h1 className="mt-4 font-display text-4xl font-bold leading-tight tracking-tight text-white md:text-5xl">
        {title}
      </h1>
      <p className="mt-5 text-base text-white/70 md:text-lg">{intro}</p>
      {updatedAt && (
        <p className="mt-4 text-xs text-white/40">最後更新：{updatedAt}</p>
      )}
    </header>
  );
}
