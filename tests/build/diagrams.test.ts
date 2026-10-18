import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const distDir = fileURLToPath(new URL("../../dist", import.meta.url));
const noDemoDir = fileURLToPath(new URL("../../dist-nodemo", import.meta.url));
const ARTICLE = "writing/building-this-site.html";

const html = readFileSync(join(distDir, ARTICLE), "utf-8");
const css = readdirSync(join(distDir, "_astro"))
  .filter((f) => f.endsWith(".css"))
  .map((f) => readFileSync(join(distDir, "_astro", f), "utf-8"))
  .join("\n");

/** From the first match of `open` (a regex source) to the matching close of `tag`. */
function element(source: string, open: string, tag: string): string {
  const start = source.search(new RegExp(open));
  expect(start, open).toBeGreaterThan(-1);
  const re = new RegExp(`<${tag}[\\s>]|</${tag}>`, "g");
  re.lastIndex = start;
  let depth = 0;
  for (let m = re.exec(source); m; m = re.exec(source)) {
    depth += m[0].startsWith("</") ? -1 : 1;
    if (depth === 0) return source.slice(start, m.index + m[0].length);
  }
  throw new Error(`unclosed <${tag}>`);
}

/** URLs a browser would fetch, or follow, from SVG markup. XML namespaces are not fetched. */
function externalRefs(svg: string): string[] {
  return [...svg.matchAll(/(?:href|src)\s*=\s*["']\s*(https?:[^"']*)|url\(\s*["']?(https?:[^)"']*)/gi)].map(
    (m) => m[1] ?? m[2],
  );
}

describe("Mermaid in the demo article", () => {
  const diagram = element(html, '<div class="diagram mermaid"', "div");

  it("is rendered at build time: two inline SVGs, one per theme, no code block left", () => {
    expect(diagram.match(/<svg/g)).toHaveLength(2);
    expect(diagram).toMatch(/<div class="only-light"><svg/);
    expect(diagram).toMatch(/<div class="only-dark"><svg/);
    expect(html).not.toMatch(/data-language="mermaid"|language-mermaid/);
  });

  it("uses the dark palette in the dark render, the light one in the light render", () => {
    const light = element(diagram, '<div class="only-light"', "div");
    const dark = element(diagram, '<div class="only-dark"', "div");
    expect(dark).not.toBe(light);
    expect(light).toContain("#16181a");
    expect(dark).toContain("#0f1214");
    expect(dark).toContain("#ece9e2");
    expect(diagram.toLowerCase()).not.toMatch(/#ececff|#9370db/);
  });

  it("keeps every id on the page unique", () => {
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(dupes).toEqual([]);
  });
});

describe("Excalidraw in the demo article", () => {
  const figure = element(html, '<figure class="[^"]*\\bexcalidraw\\b', "figure");
  const imgs = [...figure.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
  const srcOf = (img: string) => /\ssrc="([^"]+)"/.exec(img)![1];
  const fileOf = (img: string) => readFileSync(join(distDir, srcOf(img)), "utf-8");

  it("shows two images, one per theme, with the same alt text and a caption", () => {
    expect(imgs).toHaveLength(2);
    expect(imgs[0]).toMatch(/class="[^"]*\bonly-light\b/);
    expect(imgs[1]).toMatch(/class="[^"]*\bonly-dark\b/);
    const alts = imgs.map((img) => /\salt="([^"]+)"/.exec(img)?.[1]);
    expect(alts[0]).toBeTruthy();
    expect(alts[1]).toBe(alts[0]);
    expect(figure).toMatch(/<figcaption[^>]*>[^<]+/);
    for (const img of imgs) expect(img).toMatch(/\swidth="\d+"[\s\S]*\sheight="\d+"|\sheight="\d+"[\s\S]*\swidth="\d+"/);
  });

  it("points at two SVG files in dist that differ by theme", () => {
    const [light, dark] = imgs.map((img) => {
      expect(existsSync(join(distDir, srcOf(img))), srcOf(img)).toBe(true);
      return fileOf(img);
    });
    expect(light).toMatch(/^<svg/);
    expect(dark).not.toBe(light);
    expect(light).toContain("#f4f1ea");
    expect(dark).toContain("#0f1214");
    expect(dark).toContain("#ece9e2");
  });

  it("embeds its hand-drawn font: the SVGs reference nothing external", () => {
    for (const img of imgs) {
      const svg = fileOf(img);
      expect(svg).toMatch(/@font-face\s*\{[^}]*src:\s*url\(data:font\//);
      expect(externalRefs(svg)).toEqual([]);
    }
  });
});

describe("theme switch for diagrams (global CSS)", () => {
  it("hides the other theme's variant under html[data-theme]", () => {
    expect(css).toMatch(
      /\[data-theme="?dark"?\] \.only-light,\s*\[data-theme="?light"?\] \.only-dark\s*\{\s*display:\s*none/,
    );
  });

  it("falls back to the system preference when no data-theme is set", () => {
    expect(css).toMatch(
      /@media \(prefers-color-scheme:\s*dark\)\s*\{\s*:root:not\(\[data-theme\]\) \.only-light\s*\{\s*display:\s*none/,
    );
    expect(css).toMatch(
      /@media not all and \(prefers-color-scheme:\s*dark\)\s*\{\s*:root:not\(\[data-theme\]\) \.only-dark\s*\{\s*display:\s*none/,
    );
  });
});

describe("demo article without demo content", () => {
  it("is absent from the no-demo build", () => {
    expect(existsSync(join(noDemoDir, ARTICLE))).toBe(false);
  });
});

describe("the demo article's code (ruling T5)", () => {
  it("extracts the site's own contour generator into a highlighted block", () => {
    const block = element(html, "data-language=[\"']ts[\"']", "figure");
    expect(block).toMatch(/export function contourField/);
    expect(block).toMatch(/marching squares|segmentsFor/);
  });

  it("names the repository it is excerpted from", () => {
    expect(html).toMatch(/src\/lib\/isolines\.ts/);
  });
});
