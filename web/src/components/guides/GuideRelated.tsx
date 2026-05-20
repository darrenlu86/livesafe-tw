import Link from "next/link";

export interface RelatedItem {
  href: string;
  label: string;
  hook: string;
}

interface Props {
  items: RelatedItem[];
  title?: string;
}

export function GuideRelated({ items, title = "延伸閱讀" }: Props) {
  if (items.length === 0) return null;
  return (
    <section className="mt-16">
      <h2 className="text-2xl font-bold text-white">{title}</h2>
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {items.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className="glass group rounded-2xl p-5 transition hover:border-white/20 hover:bg-white/[0.06]"
          >
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-base font-semibold text-white">{it.label}</h3>
              <span className="text-white/30 transition group-hover:translate-x-0.5 group-hover:text-cyan-300">
                →
              </span>
            </div>
            <p className="mt-2 text-sm text-white/60">{it.hook}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
