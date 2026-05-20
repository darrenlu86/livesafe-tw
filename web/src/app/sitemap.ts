import type { MetadataRoute } from "next";

const SITE_URL = "https://livesafe.oharalab.com";

const GUIDE_SLUGS = [
  "home-safety-checklist",
  "earthquake-fault-check",
  "flood-risk-check",
  "nuisance-facility-check",
  "air-quality-check",
  "hualien-earthquake-safety",
  "taichung-flood-risk",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/compare`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/guides`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    ...GUIDE_SLUGS.map((slug) => ({
      url: `${SITE_URL}/guides/${slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.85,
    })),
  ];
}
