import type { ReactNode } from "react";
import Script from "next/script";

interface Props {
  slug: string;
  title: string;
  description: string;
  datePublished: string;
  dateModified?: string;
  children: ReactNode;
}

const SITE_URL = "https://livesafe.oharalab.com";

export function GuideArticle({
  slug,
  title,
  description,
  datePublished,
  dateModified,
  children,
}: Props) {
  const url = `${SITE_URL}/guides/${slug}`;
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    url,
    mainEntityOfPage: url,
    datePublished,
    dateModified: dateModified ?? datePublished,
    author: { "@type": "Organization", name: "居住安全透視鏡" },
    publisher: {
      "@type": "Organization",
      name: "居住安全透視鏡",
      url: SITE_URL,
    },
    inLanguage: "zh-TW",
  };
  return (
    <article className="mx-auto max-w-3xl px-6 pb-24">
      <Script
        id={`ld-article-${slug}`}
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      {children}
    </article>
  );
}

interface SectionProps {
  title?: string;
  children: ReactNode;
  id?: string;
}

export function GuideSection({ title, children, id }: SectionProps) {
  return (
    <section id={id} className="mt-12 space-y-4 text-base leading-relaxed text-white/80">
      {title && (
        <h2 className="text-2xl font-bold text-white">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}

interface TableProps {
  headers: string[];
  rows: string[][];
}

export function GuideTable({ headers, rows }: TableProps) {
  return (
    <div className="my-6 overflow-x-auto rounded-2xl border border-white/10">
      <table className="w-full text-sm">
        <thead className="bg-white/[0.03] text-left text-white/60">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="px-4 py-3 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-white/[0.06]">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 text-white/80">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface CalloutProps {
  variant?: "info" | "warn" | "tip";
  children: ReactNode;
}

export function GuideCallout({ variant = "info", children }: CalloutProps) {
  const styles = {
    info: "border-cyan-400/30 bg-cyan-500/[0.08] text-cyan-100",
    warn: "border-amber-400/30 bg-amber-500/[0.08] text-amber-100",
    tip: "border-emerald-400/30 bg-emerald-500/[0.08] text-emerald-100",
  }[variant];
  return (
    <div className={`my-6 rounded-2xl border ${styles} px-5 py-4 text-sm leading-relaxed`}>
      {children}
    </div>
  );
}
