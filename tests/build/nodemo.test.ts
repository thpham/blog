import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const noDemoDir = fileURLToPath(new URL("../../dist-nodemo", import.meta.url));

function page(path: string): string {
  return readFileSync(join(noDemoDir, path), "utf-8");
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

/**
 * The `dist-nodemo` build is the dry run of the day the demo content is
 * deleted: the site must still build, stay presentable, and keep every
 * machine-facing surface valid with nothing in it (spec §9, "must be
 * tested explicitly").
 */
describe("production build with no demo content (dist-nodemo)", () => {
  it("builds at all", () => {
    expect(existsSync(join(noDemoDir, "index.html"))).toBe(true);
  });

  it("reduces the navigation to Writing and About — no Lab, no Radar", () => {
    const index = page("index.html");
    const header = index.slice(0, index.indexOf("</header>"));
    const nav = header.slice(header.indexOf("<nav"), header.indexOf("</nav>"));
    expect(nav).toMatch(/href="\/writing"[^>]*>Writing</);
    expect(nav).toMatch(/href="\/about"[^>]*>About</);
    expect(nav, "nav must not offer empty sections").not.toMatch(/href="\/(lab|radar)"/);
  });

  it("renders no feed item and no preview panel anywhere", () => {
    const htmls = walk(noDemoDir).filter((f) => f.endsWith(".html"));
    for (const f of htmls) {
      const html = readFileSync(f, "utf-8");
      expect(html, f).not.toMatch(/feed-item|<aside class="preview|data-preview-for=/);
    }
  });

  it("never prints a coming-soon tone anywhere", () => {
    const htmls = walk(noDemoDir).filter((f) => f.endsWith(".html"));
    for (const f of htmls) {
      expect(readFileSync(f, "utf-8").toLowerCase(), f).not.toContain("coming soon");
    }
  });

  it("shows sober empty states on /writing, /lab and /radar", () => {
    for (const p of ["writing.html", "lab.html", "radar.html"]) {
      expect(page(p), p).toMatch(/class="empty/);
    }
    expect(page("radar.html")).not.toMatch(/class="[^"]*radar-chart/);
  });

  it("ships a valid, item-less global RSS feed", () => {
    const xml = page("rss.xml");
    expect(xml.startsWith("<?xml")).toBe(true);
    expect(xml).toMatch(/<rss[^>]*version=["']2\.0["']/);
    expect(xml).toMatch(/<channel>/);
    expect(xml).not.toMatch(/<item>/);
    // The Docusaurus-compat feeds stay valid too (spec §9).
    expect(page("blog/rss.xml")).not.toMatch(/<item>/);
    const atom = page("blog/atom.xml");
    expect(atom).toContain('xmlns="http://www.w3.org/2005/Atom"');
    expect(atom).not.toMatch(/<entry>/);
  });

  it("keeps the static pages and the legacy redirects", () => {
    for (const p of [
      "about.html",
      "colophon.html",
      "404.html",
      "search.html",
      "llms.txt",
      "blog.html",
      "blog/welcome.html",
      "robots.txt",
      "CNAME",
    ]) {
      expect(existsSync(join(noDemoDir, p)), p).toBe(true);
    }
  });
});