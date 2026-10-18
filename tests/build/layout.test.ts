import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const distDir = fileURLToPath(new URL("../../dist", import.meta.url));
const html = readFileSync(join(distDir, "index.html"), "utf-8");
const head = html.slice(0, html.indexOf("</head>"));

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const files = walk(distDir);
const textFiles = files.filter((f) => /\.(html|css|js|xml|txt|svg|json|webmanifest)$/.test(f));

// All CSS that reaches the page: bundled stylesheets plus inlined <style>.
const css = [
  ...files.filter((f) => f.endsWith(".css")).map((f) => readFileSync(f, "utf-8")),
  ...[...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]),
].join("\n");

describe("base layout (dist/index.html)", () => {
  it("runs an inline theme script in <head> before any stylesheet", () => {
    const scripts = [...head.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)];
    const theme = scripts.find((m) => /localStorage/.test(m[1]) && /data-theme|dataset\.theme/.test(m[1]));
    expect(theme, "inline theme script").toBeDefined();
    const at = theme!.index!;
    const firstLink = head.search(/<link[^>]*rel="?stylesheet/);
    const firstStyle = head.search(/<style[\s>]/);
    if (firstLink !== -1) expect(at).toBeLessThan(firstLink);
    if (firstStyle !== -1) expect(at).toBeLessThan(firstStyle);
  });

  it("ships explicit dark rules and the no-JS prefers-color-scheme fallback", () => {
    expect(css).toMatch(/:root\[data-theme=("?)dark\1\]/);
    expect(css).toMatch(/@media\s*\(prefers-color-scheme:\s*dark\)\s*\{\s*:root:not\(\[data-theme\]\)/);
  });

  it("inlines the wordmark as an accessible SVG with tittle and arcs", () => {
    const m = /<svg[^>]*aria-label="ithings"[^>]*>[\s\S]*?<\/svg>/.exec(html);
    expect(m, "inline wordmark svg").not.toBeNull();
    expect(m![0]).toMatch(/role="img"/);
    expect(m![0]).toMatch(/class="tt"/);
    expect(m![0]).toMatch(/class="arc a1"/);
    expect(m![0]).toMatch(/class="arc a2"/);
  });

  it("links the wordmark home and offers search, nav and the theme switch", () => {
    expect(html).toMatch(/<a[^>]*href="\/"[^>]*>\s*<svg[^>]*aria-label="ithings"/);
    expect(html).toMatch(/<a[^>]*href="\/search"[^>]*aria-label="Search"|<a[^>]*aria-label="Search"[^>]*href="\/search"/);
    expect(html).toMatch(/href="\/writing"[^>]*>Writing</);
    expect(html).toMatch(/href="\/about"[^>]*>About</);
    for (const pref of ["auto", "light", "dark"]) {
      expect(html).toMatch(new RegExp(`data-theme-choice="${pref}"`));
    }
  });

  it("has the footer links and copyright", () => {
    expect(html).toContain('href="/rss.xml"');
    expect(html).toContain('href="https://github.com/thpham"');
    expect(html).toContain('href="https://www.linkedin.com/in/thpham"');
    expect(html).toContain('href="https://x.com/ithingsch"');
    expect(html).toContain('href="/colophon"');
    expect(html).toMatch(new RegExp(`© ${new Date().getFullYear()} Thomas Pham`));
  });

  it("uses /favicon.svg, which is standalone and theme-aware", () => {
    expect(head).toMatch(/<link[^>]*rel="icon"[^>]*href="\/favicon\.svg"/);
    expect(html).not.toContain("favicon.ico");
    const svg = readFileSync(join(distDir, "favicon.svg"), "utf-8");
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toMatch(/prefers-color-scheme:\s*dark/);
    expect(svg).not.toMatch(/var\(--/);
  });
});

describe("self-hosted fonts", () => {
  it("never references fonts.googleapis.com anywhere in dist/", () => {
    const offenders = textFiles.filter((f) => readFileSync(f, "utf-8").includes("fonts.googleapis.com"));
    expect(offenders).toEqual([]);
  });

  it("serves the woff2 files from the site itself", () => {
    expect(files.some((f) => f.endsWith(".woff2"))).toBe(true);
    expect(css).toMatch(/--font-serif\s*:/);
    expect(css).toMatch(/--font-sans\s*:/);
    expect(css).toMatch(/--font-mono\s*:/);
  });
});

describe("dist sanity", () => {
  it("still has the favicon and no legacy Docusaurus icon", () => {
    expect(existsSync(join(distDir, "favicon.svg"))).toBe(true);
    expect(existsSync(join(distDir, "favicon.ico"))).toBe(false);
  });
});
