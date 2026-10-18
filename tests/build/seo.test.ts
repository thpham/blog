import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { demoUrls } from "../../src/lib/demo";

const distDir = fileURLToPath(new URL("../../dist", import.meta.url));
const noDemoDir = fileURLToPath(new URL("../../dist-nodemo", import.meta.url));

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

function text(dir: string, path: string): string {
  return readFileSync(join(dir, path), "utf-8");
}

function png(dir: string, path: string): Buffer {
  return readFileSync(join(dir, path));
}

/**
 * Demo URLs, from the same on-disk convention the sitemap filter consumes.
 * Every shipped entry is demo content at this stage, so demo exclusion and
 * emptiness check the same lists from both ends.
 */
const DEMO_URLS = [
  ...[...demoUrls(fileURLToPath(new URL("../../src/content", import.meta.url)))].sort(),
];
// The draft fixture ships in no build, so it is excluded from every
// expectation that reads a built artifact.
const PUBLISHED_DEMO_URLS = DEMO_URLS.filter((url) => !url.endsWith("draft-fixture"));
const FEEDS = ["rss.xml", "rss/en.xml", "rss/fr.xml", "blog/rss.xml", "blog/atom.xml"] as const;
const SITE_URLS = ["https://blog.ithings.ch/writing/welcome", "https://blog.ithings.ch/writing/building-this-site"];

describe("feeds", () => {
  it.each(FEEDS)("ships %s with no demo URL", (path) => {
    const xml = text(distDir, path);
    expect(xml.length).toBeGreaterThan(0);
    for (const url of DEMO_URLS) expect(xml).not.toContain(url);
  });

  it("keeps the Docusaurus-compat feeds in the same global shape", () => {
    const rss = text(distDir, "blog/rss.xml");
    expect(rss).toMatch(/xmlns="http:\/\/backend.userland.com\/rss2|<rss/);
    const atom = text(distDir, "blog/atom.xml");
    expect(atom).toContain('xmlns="http://www.w3.org/2005/Atom"');
  });

  it("marks the per-language feeds with their language", () => {
    expect(text(distDir, "rss/en.xml")).toContain("<language>en</language>");
    expect(text(distDir, "rss/fr.xml")).toContain("<language>fr</language>");
  });

  it.each(FEEDS)("ships an empty-but-valid %s once demo content is deleted", (path) => {
    const xml = text(noDemoDir, path);
    expect(xml).not.toMatch(/<item>/);
    for (const url of SITE_URLS) expect(xml).not.toContain(url);
  });

  it(
    "emits link/guid/pubDate/description per item for a published entry (positive build)",
    () => {
      // Today's shipped content is demo-only, so a real feed item only shows
      // up with a temporary non-demo entry. The build is redirected to
      // dist-smoke (astro.config.mjs) so it never races the dist/ the other
      // tests read concurrently.
      const smokeDir = fileURLToPath(new URL("../../dist-smoke", import.meta.url));
      const entryPath = fileURLToPath(new URL("../../src/content/writing/zz-rss-smoke.md", import.meta.url));
      writeFileSync(
        entryPath,
        [
          "---",
          'title: "RSS smoke entry"',
          'description: "Temporary entry proving the feed layer emits full items."',
          "date: 2026-10-18",
          "lang: en",
          "topics: [Meta]",
          "horizon: false",
          "---",
          "",
          "Body of the RSS smoke entry.",
          "",
        ].join("\n"),
      );
      try {
        execFileSync("yarn", ["astro", "build"], {
          env: { ...process.env, ITHINGS_SMOKE_OUT: "dist-smoke" },
          stdio: "pipe",
        });
        const xml = text(smokeDir, "rss.xml");
        // @astrojs/rss normalises item URLs to a trailing slash.
        const url = "https://blog.ithings.ch/writing/zz-rss-smoke/";
        expect(xml).toContain(`<link>${url}</link>`);
        expect(xml).toContain(`<guid isPermaLink="true">${url}</guid>`);
        expect(xml).toMatch(/<pubDate>[^<]+<\/pubDate>/);
        expect(xml).toMatch(/<description>[^<]+<\/description>/);
        for (const demo of DEMO_URLS) expect(xml).not.toContain(demo);
      } finally {
        rmSync(entryPath, { force: true });
        rmSync(smokeDir, { recursive: true, force: true });
      }
    },
    300_000,
  );
});

describe("llms.txt", () => {
  const llms = text(distDir, "llms.txt");

  it("opens with the site header and a summary", () => {
    expect(llms.startsWith("# ithings")).toBe(true);
    expect(llms).toMatch(/^> /m);
  });

  it("lists no demo article, in a llmstxt.org link list", () => {
    // Published non-demo articles as a link list; there are none today (all
    // shipped content is demo), but no link may ever point at a demo entry.
    for (const url of DEMO_URLS) expect(llms).not.toContain(url);
    expect(llms).toContain("Base URL: https://blog.ithings.ch");
  });

  it("still exists once demo content is deleted", () => {
    expect(text(noDemoDir, "llms.txt").startsWith("# ithings")).toBe(true);
  });
});

describe("markdown endpoint", () => {
  it("serves no demo entry as raw markdown", () => {
    expect(existsSync(join(distDir, "writing/welcome.md"))).toBe(false);
    expect(existsSync(join(distDir, "writing/building-this-site.md"))).toBe(false);
  });

  it("generates no markdown at all once demo content is deleted", () => {
    expect(walk(noDemoDir).filter((f) => f.endsWith(".md") && !f.endsWith("_about.md"))).toEqual([]);
  });
});

describe("meta layer", () => {
  const welcome = text(distDir, "writing/welcome.html");

  it("titles pages `<page> · ithings` and the home `ithings — Thomas Pham`", () => {
    expect(welcome).toContain("<title>Welcome to iThings Blog · ithings</title>");
    expect(text(distDir, "index.html")).toContain("<title>ithings — Thomas Pham</title>");
  });

  it("marks every shipped (demo) entry page noindex", () => {
    expect(PUBLISHED_DEMO_URLS.length).toBeGreaterThan(10);
    for (const url of PUBLISHED_DEMO_URLS) {
      expect(text(distDir, `${url}.html`)).toMatch(/name="robots" content="noindex/);
    }
  });

  it("carries canonical and OG/Twitter on article pages", () => {
    expect(welcome).toMatch(/rel="canonical" href="https:\/\/blog\.ithings\.ch\/writing\/welcome"/);
    expect(welcome).toContain('property="og:site_name" content="ithings"');
    expect(welcome).toMatch(/property="og:image" content="https:\/\/blog\.ithings\.ch\/og\/writing\/welcome\.png"/);
    expect(welcome).toContain('name="twitter:card" content="summary_large_image"');
  });

  it("emits no BlogPosting JSON-LD from a demo page", () => {
    expect(welcome).not.toContain("BlogPosting");
  });

  it("emits hreflang only when a translationOf exists (none today), so none", () => {
    expect(welcome).not.toContain("hreflang");
  });

  it("carries Person JSON-LD, og:image, twitter:card and canonical on the home page", () => {
    const home = text(distDir, "index.html");
    const match = home.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
    expect(match).not.toBeNull();
    const person = JSON.parse((match as RegExpMatchArray)[1]);
    expect(person["@type"]).toBe("Person");
    expect(person.name).toBe("Thomas Pham");
    expect(person.jobTitle).toBeUndefined();
    expect(person.worksFor).toBeUndefined();
    expect(home).toMatch(/property="og:image" content="https:\/\/blog\.ithings\.ch\/og\/home\.png"/);
    expect(home).toContain('name="twitter:card" content="summary_large_image"');
    expect(home).toMatch(/rel="canonical" href="https:\/\/blog\.ithings\.ch\/"/);
  });

  it("ships the home OG card", () => {
    const buffer = png(distDir, "og/home.png");
    expect([...buffer.subarray(0, 4)]).toEqual([137, 80, 78, 71]);
    expect(buffer.readUInt32BE(16)).toBe(1200);
    expect(buffer.readUInt32BE(20)).toBe(630);
  });
});

describe("OG images", () => {
  // Every published entry ships one, demo included (ruling: they serve
  // sharing); the list is derived from the demo convention so a new entry
  // joining the build is caught.
  it("generates a 1200×630 PNG per entry, demo included", () => {
    for (const url of PUBLISHED_DEMO_URLS) {
      const path = `og${url}.png`;
      const buffer = png(distDir, path);
      expect([...buffer.subarray(0, 4)], path).toEqual([137, 80, 78, 71]);
      expect(buffer.readUInt32BE(16), path).toBe(1200);
      expect(buffer.readUInt32BE(20), path).toBe(630);
    }
  });
});

describe("pagefind", () => {
  const pagefindDir = join(distDir, "pagefind");

  it("indexes the site after the build (dist/pagefind/)", () => {
    expect(existsSync(pagefindDir)).toBe(true);
    const files = walk(pagefindDir);
    expect(files.some((f) => f.endsWith("pagefind.js"))).toBe(true);
    expect(files.some((f) => /\.(pf_index|pf_meta)$/.test(f))).toBe(true);
  });

  it("keeps demo entries out of the index: no data-pagefind-body, an explicit ignore", () => {
    for (const url of PUBLISHED_DEMO_URLS) {
      const html = text(distDir, `${url}.html`);
      expect(html).not.toContain("data-pagefind-body");
      expect(html).toContain("data-pagefind-ignore");
    }
  });

  it("serves /search wired to the Pagefind UI", () => {
    const search = text(distDir, "search.html");
    expect(search).toMatch(/id="search"/);
    const scripts = [...search.matchAll(/<script[^>]*src="([^"]+)"/g)].map((m) => m[1]);
    expect(scripts.length).toBeGreaterThan(0);
    const bundled = scripts.map((s) => readFileSync(join(distDir, s.replace(/^\//, "")), "utf-8")).join("\n");
    expect(bundled).toContain("PagefindUI");
  });
});

describe("analytics hook", () => {
  it("injects no GoatCounter when the code is unset", () => {
    for (const dir of [distDir, noDemoDir]) {
      for (const f of walk(dir).filter((f) => f.endsWith(".html"))) {
        expect(readFileSync(f, "utf-8").toLowerCase()).not.toContain("goatcounter");
      }
    }
  });
});

describe("sitemaps", () => {
  it("robots.txt points at the sitemap index", () => {
    expect(text(distDir, "robots.txt")).toContain("Sitemap: https://blog.ithings.ch/sitemap-index.xml");
  });

  it("builds a sitemap index with no demo URL", () => {
    expect(existsSync(join(distDir, "sitemap-index.xml"))).toBe(true);
    const urls = [...walk(distDir).filter((f) => /sitemap-\d+\.xml$/.test(f))]
      .map((f) => readFileSync(f, "utf-8"))
      .join("\n");
    expect(urls).toContain("https://blog.ithings.ch/search");
    for (const url of DEMO_URLS) expect(urls).not.toContain(`https://blog.ithings.ch${url}`);
  });
});

describe("draft fixture (AI guard-rail)", () => {
  it("ships nowhere: no file in any production build mentions it", () => {
    for (const dir of [distDir, noDemoDir]) {
      for (const f of walk(dir)) {
        const raw = readFileSync(f);
        const asText = raw.length < 2_000_000 && !/\.(png|woff2?|webp|svg|ttf)$/.test(f)
          ? raw.toString("utf-8")
          : "";
        expect(asText.includes("Draft fixture"), f).toBe(false);
        expect(asText.includes("draft-fixture"), f).toBe(false);
      }
    }
  });

  it("is fixture data that satisfies the writing schema's demo convention", () => {
    const raw = text(fileURLToPath(new URL("../../src/content/writing/demo", import.meta.url)), "draft-fixture.md");
    expect(raw).toMatch(/^status:\s*draft$/m);
    expect(raw).toMatch(/^demo:\s*true$/m);
    expect(raw).toContain("Draft fixture");
  });
});
