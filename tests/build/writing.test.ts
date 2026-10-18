import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const distDir = fileURLToPath(new URL("../../dist", import.meta.url));
const noDemoDir = fileURLToPath(new URL("../../dist-nodemo", import.meta.url));

function page(dir: string, path: string): string {
  return readFileSync(join(dir, path), "utf-8");
}

/** The first element opened by `open` (a regex source) up to its closing tag. */
function region(html: string, open: string, tag: string): string {
  const start = html.search(new RegExp(open));
  expect(start, `region ${open}`).toBeGreaterThan(-1);
  const end = html.indexOf(`</${tag}>`, start);
  return html.slice(start, end);
}

// Article pages, demo content included: this is the set of shipped entries
// while the site carries only demo content (rulings P2/P3).
const ARTICLES = [
  {
    path: "writing/building-this-site.html",
    lang: "en",
    date: "2026-10-18",
    topics: ["astro", "static-sites", "generative-design"],
  },
  {
    path: "writing/agents-join-the-platform.html",
    lang: "en",
    date: "2026-10-15",
    topics: ["platform-engineering", "ai"],
  },
  {
    path: "writing/agents-et-plateformes.html",
    lang: "fr",
    date: "2026-10-15",
    topics: ["ia", "plateformes"],
  },
  {
    path: "writing/welcome.html",
    lang: "en",
    date: "2024-12-18",
    topics: ["infrastructure-as-code", "kubernetes", "cloud", "platform-engineering", "ai", "linux", "nixos", "iot"],
  },
];

describe.each(ARTICLES)("article $path", ({ path, lang, date, topics }) => {
  const html = page(distDir, path);
  const head = region(html, '<header class="article-head', "header");

  it("sets <html lang> from the entry", () => {
    expect(html).toMatch(new RegExp(`<html lang="${lang}"`));
  });

  it("sets the title in the serif face", () => {
    expect(head).toMatch(/<h1[^>]*class="[^"]*\bserif\b/);
  });

  it("carries the metadata: ISO date, language badge, reading time, topic links", () => {
    expect(head).toMatch(new RegExp(`<time[^>]*datetime="${date}"[^>]*>${date}</time>`));
    expect(head).toMatch(new RegExp(`class="lang-badge[^"]*"[^>]*>${lang.toUpperCase()}<`));
    expect(head).toMatch(/>\d+ min</);
    for (const slug of topics) expect(head).toContain(`href="/topics/${slug}"`);
  });

  it("draws its own isoline terrain in the header", () => {
    expect(head).toMatch(/<svg[^>]*class="[^"]*\bisolines\b[\s\S]*?<path/);
  });

  it("never prints an aiNote that the entry does not set", () => {
    expect(html).not.toMatch(/class="ai-note/);
  });
});

describe("Expressive Code", () => {
  const astroDir = join(distDir, "_astro");
  const ecCss = readdirSync(astroDir)
    .filter((f) => /^ec\..*\.css$/.test(f))
    .map((f) => readFileSync(join(astroDir, f), "utf-8"))
    .join("\n");

  it("emits its stylesheet", () => {
    expect(ecCss.length).toBeGreaterThan(0);
  });

  it("switches code themes on the site's html[data-theme]", () => {
    expect(ecCss).toMatch(/\[data-theme=(["']?)dark\1\]/);
    expect(ecCss).toMatch(/\[data-theme=(["']?)light\1\]/);
  });

  it("follows the system preference when no theme has been set", () => {
    expect(ecCss).toMatch(/@media \(prefers-color-scheme: ?dark\)/);
  });

  it("draws frames with the site tokens and no shadow", () => {
    expect(ecCss).toMatch(/--ec-brdCol:var\(--line\)/);
    expect(ecCss).toMatch(/--ec-codeBg:#ebe7de/);
    expect(ecCss).toMatch(/--ec-frm-frameBoxShdCssVal:none/);
  });

  it("keeps its script off pages without code", () => {
    expect(page(distDir, "writing/welcome.html")).not.toMatch(/src="\/_astro\/ec\.[^"]+\.js"/);
  });
});

describe("writing list and static filters", () => {
  it("lists the article on /writing", () => {
    const html = page(distDir, "writing.html");
    expect(html).toContain('href="/writing/welcome"');
    expect(html).toMatch(/<time[^>]*datetime="2024-12-18"/);
  });

  it("links to every filter page from /writing", () => {
    const html = page(distDir, "writing.html");
    for (const href of ["/writing/lang/en", "/writing/lang/fr", "/horizon", "/topics/kubernetes"]) {
      expect(html).toContain(`href="${href}"`);
    }
  });

  it("always builds both language pages, each listing only its language", () => {
    expect(page(distDir, "writing/lang/en.html")).toContain('href="/writing/welcome"');
    const fr = page(distDir, "writing/lang/fr.html");
    expect(fr).toContain('href="/writing/agents-et-plateformes"');
    expect(fr).not.toContain('href="/writing/welcome"');
  });

  it("builds a page for every topic in use", () => {
    for (const article of ARTICLES) {
      for (const slug of article.topics) {
        expect(page(distDir, `topics/${slug}.html`)).toContain(`href="/${article.path.replace(/\.html$/, "")}"`);
      }
    }
  });

  it("builds /horizon with its definition", () => {
    const html = page(distDir, "horizon.html");
    expect(html).toMatch(/class="definition[^"]*"[^>]*>[^<]*where the (ecosystem|industry)/);
  });

  it("keeps Writing current in the navigation on its filter pages", () => {
    for (const p of ["horizon.html", "topics/kubernetes.html", "writing/lang/fr.html"]) {
      expect(page(distDir, p)).toMatch(/href="\/writing"[^>]*aria-current="page"/);
    }
  });
});

// <html lang> follows the content; the English interface around it must
// declare itself English so that a French page does not read it as French.
describe("English UI chrome keeps lang=\"en\"", () => {
  const LANG_EN = /\blang="en"/;

  it.each(["writing/welcome.html", "writing/lang/fr.html", "writing.html"])("%s", (p) => {
    const html = page(distDir, p);
    expect(html).toMatch(/<a[^>]*class="skip-link"[^>]*\blang="en"/);
    expect(html).toMatch(/<header[^>]*class="site-header"[^>]*\blang="en"/);
    expect(html).toMatch(/<footer[^>]*class="site-footer"[^>]*\blang="en"/);
  });

  it("marks the article's English labels (metadata, facts, rail, end matter)", () => {
    const html = page(distDir, "writing/welcome.html");
    for (const open of ['<p class="article-meta"', '<dl class="facts"', '<footer class="end"']) {
      const tag = html.slice(html.indexOf(open), html.indexOf(">", html.indexOf(open)));
      expect(tag, open).toMatch(LANG_EN);
    }
    // The rail (PocCard, TOC) only renders when there is something in it.
    for (const m of html.matchAll(/<aside class="rail"[^>]*>/g)) expect(m[0]).toMatch(LANG_EN);
  });
});

describe("with no writing at all (dist-nodemo)", () => {
  const pages = ["writing.html", "writing/lang/en.html", "writing/lang/fr.html", "horizon.html"];

  it.each(pages)("%s still builds, with a sober empty state", (p) => {
    const html = page(noDemoDir, p);
    expect(html).toMatch(/class="empty/);
    expect(html).not.toMatch(/coming soon/i);
  });

  it("builds no article and no topic page", () => {
    expect(existsSync(join(noDemoDir, "writing/welcome.html"))).toBe(false);
    expect(existsSync(join(noDemoDir, "topics"))).toBe(false);
  });
});

// The Article template's optional branches, exercised by the demo article
// (the T5 coverage ruling: these must be pinned in the build, not left to
// future real content).
describe("the demo article's furniture (ruling T5)", () => {
  const html = page(distDir, "writing/building-this-site.html");
  const rail = region(html, '<aside class="rail"', "aside");
  const facts = region(html, '<dl class="facts"', "dl");
  const end = region(html, '<footer class="end"', "footer");

  it("renders the PoC card: the repo link and the tested versions", () => {
    expect(rail).toMatch(/Proof of concept/);
    expect(rail).toContain('href="https://github.com/thpham/blog"');
    expect(rail).toMatch(/<dt[^>]*>Tested<\/dt>/);
    expect(rail).toMatch(
      />Astro<span class="sep"[^>]*> · <\/span><span class="version"[^>]*>7\.4\.0</,
    );
    expect(rail).toMatch(
      />Node\.js<span class="sep"[^>]*> · <\/span><span class="version"[^>]*>24</,
    );
  });

  it("states what the content was verified against, and when", () => {
    expect(facts).toMatch(/>verified <time[^>]*datetime="2026-10-18"[^>]*>[^<]+<\/time>/);
  });

  it("renders the table of contents past three sections", () => {
    const toc = region(html, '<nav class="toc"', "nav");
    expect([...toc.matchAll(/<li\b/g)].length).toBeGreaterThan(3);
    expect(toc).toMatch(/>The pipeline</);
    expect(toc).toMatch(/>Isolines, in code</);
  });

  it("lists its sources, numbered, in the end matter", () => {
    const sources = region(end, '<section class="sources"', "section");
    expect([...sources.matchAll(/<li\b/g)].length).toBeGreaterThanOrEqual(4);
    expect(sources).toContain('href="https://docs.astro.build/');
    expect(sources).toContain('href="https://en.wikipedia.org/wiki/Marching_squares"');
    expect(sources).toContain('href="https://pagefind.app/"');
  });

  it("links the Lab entry it grew from", () => {
    expect(end).toContain('href="/lab/wordmark-from-font-geometry"');
    expect(end).toMatch(/class="kind"[^>]*>Lab</);
  });
});

// The Horizon mark and the translation link, covered on demo content that
// really carries them (the T5 coverage ruling, branch one).
describe("the Horizon demo essay and its translation", () => {
  const en = page(distDir, "writing/agents-join-the-platform.html");
  const fr = page(distDir, "writing/agents-et-plateformes.html");

  it("carries the Horizon mark in the metadata, linking the definition", () => {
    const head = region(en, '<p class="article-meta"', "p");
    expect(head).toContain('href="/horizon"');
    expect(head).toMatch(/>\s*Horizon\s*</);
  });

  it("lands on /horizon and its filter page keeps Writing current", () => {
    expect(page(distDir, "horizon.html")).toContain('href="/writing/agents-join-the-platform"');
    expect(page(distDir, "horizon.html")).toMatch(/href="\/writing"[^>]*aria-current="page"/);
  });

  it("links its French translation in the end matter, and vice versa", () => {
    const enEnd = region(en, '<footer class="end"', "footer");
    expect(enEnd).toContain('href="/writing/agents-et-plateformes"');
    expect(enEnd).toMatch(/In French/);
    expect(enEnd).toMatch(/hreflang="fr"/);
    const frEnd = region(fr, '<footer class="end"', "footer");
    expect(frEnd).toContain('href="/writing/agents-join-the-platform"');
    expect(frEnd).toMatch(/In English/);
    expect(frEnd).toMatch(/hreflang="en"/);
  });

  it("emits hreflang alternates in <head> for the pair", () => {
    expect(en).toMatch(
      /rel="alternate" hreflang="fr" href="https:\/\/blog\.ithings\.ch\/writing\/agents-et-plateformes"/,
    );
    expect(fr).toMatch(
      /rel="alternate" hreflang="en" href="https:\/\/blog\.ithings\.ch\/writing\/agents-join-the-platform"/,
    );
  });

  it("shows each language of the pair only in its own language filter", () => {
    expect(page(distDir, "writing/lang/fr.html")).toContain('href="/writing/agents-et-plateformes"');
    expect(page(distDir, "writing/lang/fr.html")).not.toContain('href="/writing/agents-join-the-platform"');
    const en = page(distDir, "writing/lang/en.html");
    expect(en).toContain('href="/writing/agents-join-the-platform"');
    expect(en).not.toContain('href="/writing/agents-et-plateformes"');
  });
});
