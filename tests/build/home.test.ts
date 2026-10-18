import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const distDir = fileURLToPath(new URL("../../dist", import.meta.url));
const noDemoDir = fileURLToPath(new URL("../../dist-nodemo", import.meta.url));

const html = readFileSync(join(distDir, "index.html"), "utf-8");
const noDemoHtml = readFileSync(join(noDemoDir, "index.html"), "utf-8");

function region(source: string, open: string, tag: string): string {
  const start = source.search(new RegExp(open));
  expect(start, `region ${open}`).toBeGreaterThan(-1);
  const end = source.indexOf(`</${tag}>`, start);
  return source.slice(start, end);
}

/** The elements opened by `open` up to their closing tag (brace-counted). */
function balancedBlocks(css: string, open: RegExp): string[] {
  return [...css.matchAll(open)].map((m) => {
    const first = css.indexOf("{", m.index!);
    let depth = 1;
    let i = first + 1;
    while (depth > 0 && i < css.length) {
      if (css[i] === "{") depth++;
      else if (css[i] === "}") depth--;
      i++;
    }
    return css.slice(first + 1, i - 1);
  });
}

/** The feed row (the whole `a.feed-item`) that links to `href`. */
function feedRow(source: string, href: string): string {
  const at = source.indexOf(`href="${href}"`);
  expect(at, `row ${href}`).toBeGreaterThan(-1);
  const start = source.lastIndexOf("<a", at);
  return source.slice(start, source.indexOf("</a>", at) + 4);
}

const hero = region(html, '<section class="hero', "section");
const feed = region(html, '<ol[^>]*class="feed', "ol");
const panel = region(html, '<aside class="preview', "aside");

// All CSS that the page ships: its stylesheets plus inlined <style>.
const css = [
  ...[...html.matchAll(/<link[^>]*rel=["']?stylesheet["']?[^>]*href="\/_astro\/([^"]+)"/g)].map(
    (m) => readFileSync(join(distDir, "_astro", m[1]), "utf-8"),
  ),
  ...[...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]),
].join("\n");

// One demo entry per kind pins the feed, newest first (ruled provisional:
// the building-this-site dates are pinned by lab.test.ts as well).
const WRITING_HREFS = ["/writing/building-this-site", "/writing/welcome"];
const LAB_HREFS = ["/lab/wordmark-from-font-geometry", "/lab/isolines-as-identity"];
const FEED_HREFS = [...WRITING_HREFS, ...LAB_HREFS];

describe("index hero", () => {
  it("carries the eyebrow above the display title", () => {
    expect(hero).toMatch(/class="[^"]*eyebrow[^"]*"[^>]*>Thomas Pham · Lausanne</);
  });

  it("sets the display serif title, one word in italic, exact pinned copy", () => {
    const h1 = region(hero, "<h1", "h1");
    expect(h1).toMatch(/class="[^"]*\bdisplay\b/);
    expect(h1).toMatch(
      /Field notes on the systems that\s*<em[^>]*>\s*quietly\s*<\/em>\s*run everything\./,
    );
  });

  it("draws an isoline field with dashed accent links", () => {
    expect(hero).toMatch(/<svg[^>]*class="[^"]*\bisolines\b/);
    // .links is a shared class name (the footer nav uses it too); the isoline
    // rule is the one that both dashes and colours it with the accent.
    const links = [...css.matchAll(/\.links[^{]*\{([^}]*)\}/g)].map((m) => m[1]).find(
      (rule) => rule.includes("stroke-dasharray") && rule.includes("var(--accent)"),
    );
    expect(links, ".links isoline rule").toBeDefined();
  });
});

describe("unified feed", () => {
  it("mixes writing and lab entries", () => {
    for (const href of FEED_HREFS) expect(feed).toContain(`href="${href}"`);
  });

  it.each(WRITING_HREFS)("marks no LAB tag on %s", (href) => {
    expect(feedRow(feed, href)).not.toMatch(/lab-tag/);
  });

  it.each(LAB_HREFS)("marks the LAB tag on %s", (href) => {
    expect(feedRow(feed, href)).toMatch(/class="[^"]*lab-tag/);
  });

  it("badges the language of every row", () => {
    const rows = FEED_HREFS.map((href) => feedRow(feed, href));
    for (const row of rows) expect(row).toMatch(/lang-badge/);
  });

  it("lists the newest entry first and never demotes older lab entries above it", () => {
    const first = feed.indexOf(`href="${FEED_HREFS[0]}"`);
    const last = feed.indexOf(`href="${FEED_HREFS[1]}"`);
    expect(first).toBeGreaterThan(-1);
    expect(last).toBeGreaterThan(first);
  });
});

describe("preview panel", () => {
  it("is pre-filled, without JavaScript, with the newest entry", () => {
    expect(panel).toContain('href="/writing/building-this-site"');
    expect(panel).toMatch(/Building ithings[^<]*</);
  });

  it("renders the entry's own relief in the panel", () => {
    expect(panel).toMatch(/<svg[^>]*class="[^"]*\bisolines\b/);
  });

  it("shows a writing entry's topics, date and reading time", () => {
    for (const topic of ["Astro", "Static sites", "Generative design"]) {
      expect(panel).toContain(topic);
    }
    expect(panel).toMatch(/<time[^>]*datetime="2026-10-18"/);
    expect(panel).toMatch(/\d+ min/);
  });

  it("shows a lab entry's status badge instead of versions or reading time", () => {
    const labTemplate = html.match(
      /<template[^>]*data-preview-for="isolines-as-identity"[\s\S]*?<\/template>/,
    );
    expect(labTemplate, "lab template").not.toBeNull();
    const t = labTemplate![0];
    expect(t).toMatch(/data-status="exploring"/);
    expect(t).not.toMatch(/\d+ min/);
    expect(t).not.toMatch(/tested/);
  });

  it("has one pre-rendered <template data-preview-for> per feed item", () => {
    const items = [...html.matchAll(/<a\b[^>]*data-feed-id="([^"]+)"/g)];
    const templates = [...html.matchAll(/<template[^>]*data-preview-for="([^"]+)"/g)];
    expect(templates.length).toBe(items.length);
    expect(new Set(templates.map((m) => m[1]))).toEqual(new Set(items.map((m) => m[1])));
  });

  it("makes every feed item focusable", () => {
    const items = [...html.matchAll(/<a\b[^>]*data-feed-id="([^"]+)"[^>]*>/g)];
    expect(items.length).toBeGreaterThan(0);
    for (const m of items) {
      expect(m[0]).toMatch(/\shref="/);
      expect(m[0]).toMatch(/data-feed-id="/);
    }
  });
});

describe("preview panel script", () => {
  it("listens to both mouseenter and focusin", () => {
    const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(
      (m) => m[1],
    );
    const panelScript = scripts.find((s) => s.includes("feed-item") || s.includes("preview"));
    expect(panelScript, "preview script").toBeDefined();
    expect(panelScript).toContain("mouseenter");
    expect(panelScript).toContain("focusin");
  });
});

describe("mobile layout", () => {
  it("hides the preview panel and reveals feed summaries under 52rem", () => {
    // The minifier may rewrite the query to its (width<=52rem) form, and the
    // list and the panel each carry their own block.
    const mobile = balancedBlocks(css, /@media\s*\(\s*(?:max-width:\s*52rem|width<=52rem)\s*\)/g)
      .join("\n");
    expect(mobile).toMatch(/\.preview[^{]*\{\s*display:\s*none/);
    expect(mobile).toMatch(/\.summary[^{]*\{\s*display:\s*block/);
  });
});

describe("no coming soon anywhere on the page", () => {
  it("never prints it, with or without a feed", () => {
    expect(html).not.toMatch(/coming soon/i);
    expect(noDemoHtml).not.toMatch(/coming soon/i);
  });
});

describe("with an empty feed (dist-nodemo)", () => {
  it("renders neither the feed list nor the panel", () => {
    expect(noDemoHtml).not.toMatch(/feed-item/);
    expect(noDemoHtml).not.toMatch(/<aside class="preview/);
    expect(noDemoHtml).not.toMatch(/<template data-preview-for=/);
  });

  it("keeps the hero", () => {
    expect(noDemoHtml).toMatch(/class="[^"]*eyebrow[^"]*"[^>]*>Thomas Pham · Lausanne</);
  });
});