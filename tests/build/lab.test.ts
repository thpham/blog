import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
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

// Demo entries (ruling P3). Both carry demo: true, so they ship noindex-ed
// in dist/ and are absent entirely from dist-nodemo/.
const ENTRIES = [
  {
    path: "lab/wordmark-from-font-geometry.html",
    status: "concluded",
    promoted: "/writing/building-this-site",
    repo: "https://github.com/thpham/blog",
  },
  {
    path: "lab/isolines-as-identity.html",
    status: "exploring",
    promoted: null,
    repo: null,
  },
];

describe("StatusBadge", () => {
  const sheet = page(distDir, ENTRIES[0].path);
  const badge = sheet.match(/<span[^>]*class="[^"]*status-badge[^"]*"[^>]*>(?:(?!<\/span>)[\s\S])*<\/span>/)?.[0];

  // All CSS reaching the sheet: bundled stylesheets plus inlined <style>.
  const css = [...sheet.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join("\n");
  /** The (scoped) CSS rule for one status, tolerant to astro-cid selectors
      and to the CSS minifier's dropped attribute quotes. */
  const rule = (status: string, colour: string) =>
    new RegExp(`\\.status-badge(?:\\[[^\\]]*\\])*\\[data-status=["']?${status}["']?\\]\\{color:${colour}\\}`);

  it("labels the status in the mono face", () => {
    expect(css).toMatch(/\.status-badge(?:\[[^\]]*\])*\{font-family:var\(--font-mono\)/);
  });

  it("carries the status as data for its colour", () => {
    expect(badge).toContain('data-status="concluded"');
    expect(page(distDir, ENTRIES[1].path)).toContain('data-status="exploring"');
  });

  it("maps each status to its token", () => {
    expect(css).toMatch(rule("exploring", "var\\(--accent\\)"));
    expect(css).toMatch(rule("paused", "var\\(--muted\\)"));
    expect(css).toMatch(rule("concluded", "var\\(--ok\\)"));
    expect(css).toMatch(rule("abandoned", "var\\(--status-abandoned\\)"));
  });
});

describe.each(ENTRIES)("lab sheet $path", ({ path, status, promoted, repo }) => {
  const html = page(distDir, path);
  const head = region(html, '<header class="lab-head', "header");

  it("sets <html lang> from the entry", () => {
    expect(html).toMatch(/<html lang="en"/);
  });

  it("sets the title in the serif face", () => {
    expect(head).toMatch(/<h1[^>]*class="[^"]*\bserif\b/);
  });

  it("shows the intent as the lede", () => {
    expect(head).toMatch(/class="lede"/);
  });

  it("carries the dates: started and last touched", () => {
    expect(head).toMatch(/Started\s*<\/dt>/);
    expect(head).toMatch(/Last touched\s*<\/dt>/);
    for (const m of head.matchAll(/<time datetime="(\d{4}-\d{2}-\d{2})"/g)) {
      expect(m[1]).toMatch(/^2026-10-1[678]$/);
    }
  });

  it("shows its status as a badge", () => {
    expect(html).toContain(`data-status="${status}"`);
  });

  it("draws its own isoline terrain in the header", () => {
    expect(head).toMatch(/<svg[^>]*class="[^"]*\bisolines\b[\s\S]*?<path/);
  });

  it("ships noindex-ed as demo content", () => {
    expect(html).toMatch(/<meta name="robots" content="noindex, follow"/);
  });

  it("renders the body as prose and never a bare 404", () => {
    expect(html).toMatch(/class="prose"/);
  });

  if (repo) {
    it("links the PoC repository", () => {
      expect(html).toContain(`href="${repo}"`);
      expect(html).toMatch(/Proof of concept/i);
    });
  }

  if (promoted) {
    it("links the writing entry it was promoted to", () => {
      expect(html).toContain(`href="${promoted}"`);
      expect(html).toMatch(/Promoted/i);
    });
  } else {
    it("prints no promoted-to section", () => {
      expect(html).not.toMatch(/class="promoted/i);
    });
  }
});

describe("outcome", () => {
  it("the concluded sheet states its outcome", () => {
    const html = page(distDir, ENTRIES[0].path);
    expect(html).toMatch(/class="outcome/);
    expect(html).toMatch(/>[^<]*wordmark\.py/);
  });

  it("the exploring sheet has none", () => {
    expect(page(distDir, ENTRIES[1].path)).not.toMatch(/class="outcome/);
  });
});

describe("lab list", () => {
  const html = page(distDir, "lab.html");

  it("lists both entries", () => {
    expect(html).toContain('href="/lab/wordmark-from-font-geometry"');
    expect(html).toContain('href="/lab/isolines-as-identity"');
  });

  it("sorts by last activity, most recent first, ties by latest start", () => {
    const wm = html.indexOf("/lab/wordmark-from-font-geometry");
    const iso = html.indexOf("/lab/isolines-as-identity");
    expect(wm).toBeGreaterThan(-1);
    expect(iso).toBeGreaterThan(wm);
  });

  it("shows the status badge in each row", () => {
    expect(html).toContain('data-status="concluded"');
    expect(html).toContain('data-status="exploring"');
  });

  it("lists the entries' intent", () => {
    expect(html).toMatch(/class="summary"/);
  });

  it("appears in the navigation and marks itself current", () => {
    expect(html).toMatch(/href="\/lab"[^>]*aria-current="page"/);
  });
});

describe("reciprocity with the promoted article", () => {
  const html = page(distDir, "writing/building-this-site.html");

  it("links back to the lab entry it came from", () => {
    expect(html).toContain('href="/lab/wordmark-from-font-geometry"');
  });

  it("labels the link as a Lab entry and names it in the end matter", () => {
    const end = region(html, '<footer class="end"', "footer");
    expect(end).toMatch(/class="kind"[^>]*>Lab</);
    expect(end).toMatch(/The wordmark from the font.{0,10}s own geometry/);
  });
});

describe("with no lab at all (dist-nodemo)", () => {
  it("builds /lab with a sober empty state", () => {
    const html = page(noDemoDir, "lab.html");
    expect(html).toMatch(/class="empty/);
    expect(html).not.toMatch(/coming soon/i);
  });

  it("builds no lab page, and drops Lab from the navigation", () => {
    for (const entry of ENTRIES) {
      expect(existsSync(join(noDemoDir, entry.path))).toBe(false);
    }
    const html = page(noDemoDir, "lab.html");
    expect(html).not.toMatch(/href="\/lab"[^>]*aria-current="page"/);
  });

  it("loses the demo article and its related link with it", () => {
    expect(existsSync(join(noDemoDir, "writing/building-this-site.html"))).toBe(false);
  });
});
