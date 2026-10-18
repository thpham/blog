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

// Article pages. `building-this-site` joins this list in Task 11.
const ARTICLES = [
  {
    path: "writing/welcome.html",
    lang: "en",
    date: "2024-12-18",
    topics: ["infrastructure-as-code", "kubernetes", "cloud", "platform-engineering", "nixos", "iot"],
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

  it("always builds both language pages", () => {
    expect(page(distDir, "writing/lang/en.html")).toContain('href="/writing/welcome"');
    const fr = page(distDir, "writing/lang/fr.html");
    expect(fr).not.toContain('href="/writing/welcome"');
    expect(fr).toMatch(/class="empty/);
  });

  it("builds a page for every topic", () => {
    for (const slug of ARTICLES[0].topics) {
      expect(page(distDir, `topics/${slug}.html`)).toContain('href="/writing/welcome"');
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
