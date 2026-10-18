/**
 * Structured data for the site and its articles (spec §9): JSON-LD consumed
 * by search engines, kept free of Astro imports so unit tests exercise the
 * exact shapes. User-mandated: the Person carries no `jobTitle` and no
 * `worksFor` — the profile states what Thomas works on, never a claimed
 * position or employer.
 */
import { SOCIAL_URLS, SITE } from "./site";

/** The structural shape of a writing entry that a BlogPosting needs. */
export interface PostingInput {
  id: string;
  data: {
    title: string;
    description: string;
    date: Date;
    updated?: Date;
    lang: "en" | "fr";
  };
}

/** The site owner as schema.org sees them: name, place, profiles, fields. */
export function personJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: SITE.author,
    url: SITE.url,
    address: { addressLocality: SITE.city },
    sameAs: [SOCIAL_URLS.github, SOCIAL_URLS.linkedin, SOCIAL_URLS.x],
    knowsAbout: [
      "Infrastructure as Code",
      "Platform Engineering",
      "Kubernetes",
      "OpenShift",
      "NixOS",
      "IoT",
      "AI",
    ],
  };
}

/** A writing entry as a schema.org BlogPosting, with its OG image. */
export function postingJsonLd(entry: PostingInput): Record<string, unknown> {
  const { id, data } = entry;
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: data.title,
    description: data.description,
    inLanguage: data.lang,
    datePublished: data.date.toISOString().slice(0, 10),
    dateModified: (data.updated ?? data.date).toISOString().slice(0, 10),
    author: { "@type": "Person", name: SITE.author, url: SOCIAL_URLS.github },
    image: `${SITE.url}/og/writing/${id}.png`,
    mainEntityOfPage: `${SITE.url}/writing/${id}`,
  };
}
