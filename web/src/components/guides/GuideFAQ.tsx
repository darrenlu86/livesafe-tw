import Script from "next/script";

export interface QA {
  q: string;
  a: string;
}

interface Props {
  id: string;
  faqs: QA[];
  title?: string;
}

export function GuideFAQ({ id, faqs, title = "常見問題" }: Props) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  return (
    <section className="mt-16">
      <Script
        id={`ld-faq-${id}`}
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <h2 className="text-2xl font-bold text-white">{title}</h2>
      <div className="mt-6 space-y-3">
        {faqs.map((f, i) => (
          <details
            key={i}
            className="glass group rounded-2xl px-5 py-4 open:bg-white/[0.05]"
          >
            <summary className="cursor-pointer list-none text-base font-semibold text-white marker:hidden">
              <span className="mr-2 text-white/40">Q.</span>
              {f.q}
            </summary>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-white/75">
              {f.a}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
